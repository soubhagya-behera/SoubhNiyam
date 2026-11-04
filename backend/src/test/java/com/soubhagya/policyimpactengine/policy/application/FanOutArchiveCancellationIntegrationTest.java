package com.soubhagya.policyimpactengine.policy.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.soubhagya.policyimpactengine.audit.application.AuditService;
import com.soubhagya.policyimpactengine.audit.domain.AuditEventRepository;
import com.soubhagya.policyimpactengine.notification.application.FanOutReconciliationService;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTask;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskStatus;
import com.soubhagya.policyimpactengine.notification.domain.NotificationRepository;
import com.soubhagya.policyimpactengine.policy.domain.Policy;
import com.soubhagya.policyimpactengine.policy.domain.PolicyRepository;
import com.soubhagya.policyimpactengine.policy.domain.PolicyStatus;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersionRepository;
import com.soubhagya.policyimpactengine.user.domain.User;
import com.soubhagya.policyimpactengine.user.domain.UserRepository;

@SpringBootTest
@Testcontainers
class FanOutArchiveCancellationIntegrationTest {

	@Container
	@ServiceConnection
	static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

	@Autowired private PolicyArchiveService archiveService;
	@Autowired private PolicyReactivationService reactivationService;
	@Autowired private FanOutReconciliationService reconciliationService;
	@Autowired private PolicyRepository policyRepository;
	@Autowired private PolicyVersionRepository versionRepository;
	@Autowired private FanOutTaskRepository fanOutTaskRepository;
	@Autowired private NotificationRepository notificationRepository;
	@Autowired private UserRepository userRepository;
	@Autowired private AuditEventRepository auditEventRepository;
	@Autowired private AuditService auditService;
	@Autowired private PlatformTransactionManager transactionManager;

	private TransactionTemplate transactionTemplate;

	@BeforeEach
	void setUp() {
		transactionTemplate = new TransactionTemplate(transactionManager);
		notificationRepository.deleteAll();
		fanOutTaskRepository.deleteAll();
		auditEventRepository.deleteAll();
		versionRepository.deleteAll();
		policyRepository.deleteAll();
		userRepository.deleteAll();
	}

	@Test
	void archiveCancelsPendingTaskInTheArchiveTransaction() {
		User owner = userRepository.saveAndFlush(new User());
		Policy policy = ownedActivePolicy(owner);
		FanOutTask task = task(policy, owner);

		assertThat(archiveService.archive(owner.getId(), policy.getId())).isTrue();

		FanOutTask cancelled = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(cancelled.getStatus()).isEqualTo(FanOutTaskStatus.CANCELLED);
		assertThat(cancelled.getClaimToken()).isNull();
		assertThat(cancelled.getLeaseExpiresAt()).isNull();
		assertThat(cancelled.getLastError()).isEqualTo("policy archived");
	}

	@Test
	void archiveCancelsProcessingTaskAndFencesTheStaleClaimToken() {
		User owner = userRepository.saveAndFlush(new User());
		Policy policy = ownedActivePolicy(owner);
		FanOutTask task = task(policy, owner);
		UUID staleToken = UUID.randomUUID();
		Instant now = Instant.now();
		inTransaction(() -> fanOutTaskRepository.claim(task.getId(), staleToken,
				now.plusSeconds(300), now));
		assertThat(fanOutTaskRepository.findById(task.getId()).orElseThrow().getStatus())
				.isEqualTo(FanOutTaskStatus.PROCESSING);

		assertThat(archiveService.archive(owner.getId(), policy.getId())).isTrue();

		FanOutTask cancelled = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(cancelled.getStatus()).isEqualTo(FanOutTaskStatus.CANCELLED);
		assertThat(cancelled.getClaimToken()).isNull();
		assertThat(cancelled.getLeaseExpiresAt()).isNull();

		Instant later = now.plusSeconds(600);
		assertThat(inTransaction(() -> fanOutTaskRepository.complete(task.getId(),
				staleToken, later))).isZero();
		assertThat(inTransaction(() -> fanOutTaskRepository.renewLease(task.getId(),
				staleToken, later.plusSeconds(300), later))).isZero();
		assertThat(inTransaction(() -> fanOutTaskRepository.fail(task.getId(), staleToken,
				FanOutTaskStatus.FAILED, later, "late worker", later))).isZero();

		FanOutTask afterStaleWorker = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(afterStaleWorker.getStatus()).isEqualTo(FanOutTaskStatus.CANCELLED);
		assertThat(afterStaleWorker.getClaimToken()).isNull();
		assertThat(afterStaleWorker.getLeaseExpiresAt()).isNull();
	}

	@Test
	void reactivationDoesNotReviveCancelledTaskOrReplayIt() {
		User owner = userRepository.saveAndFlush(new User());
		Policy policy = ownedActivePolicy(owner);
		FanOutTask task = task(policy, owner);

		assertThat(archiveService.archive(owner.getId(), policy.getId())).isTrue();
		assertThat(reactivationService.reactivate(owner.getId(), policy.getId())).isTrue();

		FanOutTask afterReactivation = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(afterReactivation.getStatus()).isEqualTo(FanOutTaskStatus.CANCELLED);
		assertThat(afterReactivation.getClaimToken()).isNull();
		assertThat(afterReactivation.getLeaseExpiresAt()).isNull();

		assertThat(reconciliationService.reconcile()).isZero();
		assertThat(fanOutTaskRepository.findById(task.getId()).orElseThrow().getStatus())
				.isEqualTo(FanOutTaskStatus.CANCELLED);
		assertThat(notificationRepository.count()).isZero();
	}

	@Test
	void failedArchiveTransactionRollsBackPolicyStatusAndTaskCancellation() {
		User owner = userRepository.saveAndFlush(new User());
		Policy policy = ownedActivePolicy(owner);
		FanOutTask task = task(policy, owner);
		FanOutTaskRepository failingTasks = mock(FanOutTaskRepository.class);
		when(failingTasks.cancelOutstandingByPolicyId(any(), any(), any()))
				.thenThrow(new IllegalStateException("forced cancellation failure"));
		PolicyArchiveService failingService = new PolicyArchiveService(policyRepository,
				transactionManager, auditService, failingTasks, Clock.systemUTC());

		assertThatThrownBy(() -> failingService.archive(owner.getId(), policy.getId()))
				.isInstanceOf(IllegalStateException.class)
				.hasMessage("forced cancellation failure");

		assertThat(policyRepository.findById(policy.getId()).orElseThrow().getStatus())
				.isEqualTo(PolicyStatus.ACTIVE);
		FanOutTask rolledBack = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(rolledBack.getStatus()).isEqualTo(FanOutTaskStatus.PENDING);
		assertThat(rolledBack.getClaimToken()).isNull();
		assertThat(rolledBack.getLeaseExpiresAt()).isNull();
		assertThat(auditEventRepository.count()).isZero();
	}

	private Policy ownedActivePolicy(User owner) {
		Policy policy = new Policy("P " + UUID.randomUUID(),
				"https://example.com/" + UUID.randomUUID());
		policy.setOwner(owner);
		policy.setStatus(PolicyStatus.ACTIVE);
		policy.setNextCheckAt(Instant.now().minusSeconds(60));
		return policyRepository.saveAndFlush(policy);
	}

	private FanOutTask task(Policy policy, User owner) {
		PolicyVersion version = versionRepository.saveAndFlush(new PolicyVersion(policy, 2,
				"content-" + UUID.randomUUID(), "hash-" + UUID.randomUUID()));
		return fanOutTaskRepository.saveAndFlush(new FanOutTask(policy, version, owner,
				null, Instant.now()));
	}

	private <T> T inTransaction(Supplier<T> action) {
		return transactionTemplate.execute(status -> action.get());
	}
}
