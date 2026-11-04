package com.soubhagya.policyimpactengine.notification.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.soubhagya.policyimpactengine.notification.domain.FanOutTask;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskStatus;
import com.soubhagya.policyimpactengine.policy.domain.Policy;
import com.soubhagya.policyimpactengine.policy.domain.PolicyRepository;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersionRepository;

@SpringBootTest
@Testcontainers
class FanOutReconciliationPersistenceIntegrationTest {

	private static final Instant NOW = Instant.parse("2026-09-18T10:00:00Z");

	@Container
	@ServiceConnection
	static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

	@Autowired
	private FanOutTaskRepository fanOutTaskRepository;

	@Autowired
	private PolicyRepository policyRepository;

	@Autowired
	private PolicyVersionRepository versionRepository;

	@Test
	@Transactional
	void dueQueryReturnsOnlyPendingTasksAtOrBeforeNowInBoundedOrder() {
		FanOutTask earliest = persistedTask(NOW.minusSeconds(60));
		FanOutTask later = persistedTask(NOW.minusSeconds(30));
		FanOutTask dueAtBoundary = persistedTask(NOW);
		FanOutTask future = persistedTask(NOW.plusSeconds(30));
		FanOutTask completed = persistedTask(NOW.minusSeconds(50));
		UUID token = UUID.randomUUID();
		fanOutTaskRepository.claim(completed.getId(), token, NOW.plusSeconds(300), NOW);
		fanOutTaskRepository.complete(completed.getId(), token, NOW);
		FanOutTask failed = persistedTask(NOW.minusSeconds(40));
		UUID failedToken = UUID.randomUUID();
		fanOutTaskRepository.claim(failed.getId(), failedToken, NOW.plusSeconds(300), NOW);
		fanOutTaskRepository.fail(failed.getId(), failedToken, FanOutTaskStatus.FAILED,
				NOW, "permanent", NOW);

		List<UUID> firstPage = fanOutTaskRepository.findDuePendingTaskIds(NOW,
				PageRequest.of(0, 2));

		assertThat(firstPage).containsExactly(earliest.getId(), later.getId());

		List<UUID> allDue = fanOutTaskRepository.findDuePendingTaskIds(NOW,
				PageRequest.of(0, 50));

		assertThat(allDue).containsExactly(earliest.getId(), later.getId(),
				dueAtBoundary.getId());
		assertThat(allDue).doesNotContain(future.getId(), completed.getId(), failed.getId());
	}

	private FanOutTask persistedTask(Instant nextRetryAt) {
		Policy policy = policyRepository.saveAndFlush(new Policy(
				"P " + UUID.randomUUID(), "https://example.com/" + UUID.randomUUID()));
		PolicyVersion version = versionRepository.saveAndFlush(
				new PolicyVersion(policy, 1, "content-" + UUID.randomUUID(),
						"hash-" + UUID.randomUUID()));
		return fanOutTaskRepository.saveAndFlush(
				new FanOutTask(policy, version, null, null, nextRetryAt));
	}
}
