package com.soubhagya.policyimpactengine.policy.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.soubhagya.policyimpactengine.diff.PolicySimHash;
import com.soubhagya.policyimpactengine.monitoring.application.PolicyFetchAttemptService;
import com.soubhagya.policyimpactengine.monitoring.application.RetryPolicy;
import com.soubhagya.policyimpactengine.monitoring.domain.PolicyFetchAttemptRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTask;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskStatus;
import com.soubhagya.policyimpactengine.policy.domain.Policy;
import com.soubhagya.policyimpactengine.policy.domain.PolicyRepository;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersionRepository;
import com.soubhagya.policyimpactengine.policy.application.PolicyVersionObservationOutcome;
import com.soubhagya.policyimpactengine.diff.domain.PolicyChangeRecordRepository;
import com.soubhagya.policyimpactengine.policy.fetch.DefaultPolicyTextNormalizer;
import com.soubhagya.policyimpactengine.policy.fetch.JsoupPolicyContentExtractor;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyContentExtractor;
import com.soubhagya.policyimpactengine.policy.fetch.FetchResult;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyContentHasher;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyFetcher;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyTextNormalizer;
import com.soubhagya.policyimpactengine.policy.fetch.Sha256PolicyContentHasher;

import jakarta.persistence.ManyToOne;

@SpringBootTest
@Testcontainers
class FanOutTaskPersistenceIntegrationTest {

	@Container
	@ServiceConnection
	static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

	@Autowired
	private PolicyRepository policyRepository;

	@Autowired
	private PolicyVersionRepository versionRepository;

	@Autowired
	private PolicyVersionService versionService;

	@Autowired
	private PolicyFetchAttemptService attemptService;

	@Autowired
	private PolicyFetchAttemptRepository attemptRepository;

	@Autowired
	private PolicySimHash simHash;

	@Autowired
	private PolicyChangeRecordRepository changeRepository;

	@Autowired
	private FanOutTaskRepository fanOutTaskRepository;

	@Autowired
	private PlatformTransactionManager transactionManager;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	private final PolicyContentExtractor extractor = new JsoupPolicyContentExtractor();
	private final PolicyTextNormalizer normalizer = new DefaultPolicyTextNormalizer();
	private final PolicyContentHasher hasher = new Sha256PolicyContentHasher();

	private RetryPolicy testRetryPolicy() {
		return new RetryPolicy(5, Duration.ofMinutes(5), 2.0,
				Duration.ofHours(6), Duration.ofHours(24), new java.util.Random());
	}

	@BeforeEach
	void cleanDatabase() {
		fanOutTaskRepository.deleteAll();
		attemptRepository.deleteAll();
		changeRepository.deleteAll();
		versionRepository.deleteAll();
		policyRepository.deleteAll();
	}

	@Test
	void firstVersionCreatesNoTask() {
		Policy policy = policyRepository.saveAndFlush(new Policy("P", "https://example.com/p"));
		String html = "<html><body><p>first</p></body></html>";
		String normalized = normalizer.normalize(extractor.extract(html));
		StubPolicyFetcher fetcher = new StubPolicyFetcher(html);
		com.soubhagya.policyimpactengine.diff.PolicyDiffEngine diffEngine =
				new com.soubhagya.policyimpactengine.diff.LineBasedPolicyDiffEngine();
		PolicyObservationPersistenceService persistenceService =
				new PolicyObservationPersistenceService(versionService, versionRepository, diffEngine,
						changeRepository, simHash, null, null, new com.soubhagya.policyimpactengine.intelligence.DeterministicConceptMatcher(), null, new com.soubhagya.policyimpactengine.impact.DeterministicImpactScoringEngine(), fanOutTaskRepository, java.time.Clock.systemUTC(), transactionManager);
		PolicyObservationService orchestrator = new PolicyObservationService(
				policyRepository, fetcher, extractor, normalizer, hasher, persistenceService,
				attemptService, testRetryPolicy(), transactionManager);

		PolicyObservationResult result = orchestrator.observe(policy.getId());

		assertThat(result.outcome()).isEqualTo(PolicyVersionObservationOutcome.FIRST_VERSION);
		assertThat(fanOutTaskRepository.count()).isZero();
	}

	@Test
	void newVersionCreatesExactlyOnePendingTask() {
		Policy policy = policyRepository.saveAndFlush(new Policy("P", "https://example.com/p"));
		String firstHtml = "<html><body><p>first</p></body></html>";
		String changedHtml = "<html><body><p>changed</p></body></html>";

		StubPolicyFetcher fetcher = new StubPolicyFetcher(firstHtml);
		com.soubhagya.policyimpactengine.diff.PolicyDiffEngine diffEngine =
				new com.soubhagya.policyimpactengine.diff.LineBasedPolicyDiffEngine();
		PolicyObservationPersistenceService persistenceService =
				new PolicyObservationPersistenceService(versionService, versionRepository, diffEngine,
						changeRepository, simHash, null, null, new com.soubhagya.policyimpactengine.intelligence.DeterministicConceptMatcher(), null, new com.soubhagya.policyimpactengine.impact.DeterministicImpactScoringEngine(), fanOutTaskRepository, java.time.Clock.systemUTC(), transactionManager);
		PolicyObservationService orchestrator = new PolicyObservationService(
				policyRepository, fetcher, extractor, normalizer, hasher, persistenceService,
				attemptService, testRetryPolicy(), transactionManager);

		orchestrator.observe(policy.getId());

		fetcher.setHtml(changedHtml);
		PolicyObservationResult result = orchestrator.observe(policy.getId());

		assertThat(result.outcome()).isEqualTo(PolicyVersionObservationOutcome.NEW_VERSION);
		assertThat(fanOutTaskRepository.count()).isEqualTo(1);

		FanOutTask task = fanOutTaskRepository.findAll().get(0);
		assertThat(task.getStatus()).isEqualTo(FanOutTaskStatus.PENDING);
		assertThat(task.getAttemptCount()).isZero();
		assertThat(task.getPolicy().getId()).isEqualTo(policy.getId());
		assertThat(task.getPolicyVersion().getVersionNumber()).isEqualTo(2);
		assertThat(task.getOwner()).isNull();
		assertThat(task.getSourceAttemptId()).isNotNull();
	}

	@Test
	void unchangedObservationCreatesNoAdditionalTask() {
		Policy policy = policyRepository.saveAndFlush(new Policy("P", "https://example.com/p"));
		String firstHtml = "<html><body><p>first</p></body></html>";
		String changedHtml = "<html><body><p>changed</p></body></html>";

		StubPolicyFetcher fetcher = new StubPolicyFetcher(firstHtml);
		com.soubhagya.policyimpactengine.diff.PolicyDiffEngine diffEngine =
				new com.soubhagya.policyimpactengine.diff.LineBasedPolicyDiffEngine();
		PolicyObservationPersistenceService persistenceService =
				new PolicyObservationPersistenceService(versionService, versionRepository, diffEngine,
						changeRepository, simHash, null, null, new com.soubhagya.policyimpactengine.intelligence.DeterministicConceptMatcher(), null, new com.soubhagya.policyimpactengine.impact.DeterministicImpactScoringEngine(), fanOutTaskRepository, java.time.Clock.systemUTC(), transactionManager);
		PolicyObservationService orchestrator = new PolicyObservationService(
				policyRepository, fetcher, extractor, normalizer, hasher, persistenceService,
				attemptService, testRetryPolicy(), transactionManager);

		orchestrator.observe(policy.getId());
		fetcher.setHtml(changedHtml);
		orchestrator.observe(policy.getId());
		long taskCount = fanOutTaskRepository.count();
		fetcher.setHtml(changedHtml);
		orchestrator.observe(policy.getId());

		assertThat(fanOutTaskRepository.count()).isEqualTo(taskCount);
	}

	@Test
	void missingPolicyDoesNotCreateTask() {
		UUID missing = UUID.randomUUID();
		StubPolicyFetcher fetcher = new StubPolicyFetcher("<html><body><p>x</p></body></html>");
		com.soubhagya.policyimpactengine.diff.PolicyDiffEngine diffEngine =
				new com.soubhagya.policyimpactengine.diff.LineBasedPolicyDiffEngine();
		PolicyObservationPersistenceService persistenceService =
				new PolicyObservationPersistenceService(versionService, versionRepository, diffEngine,
						changeRepository, simHash, null, null, new com.soubhagya.policyimpactengine.intelligence.DeterministicConceptMatcher(), null, new com.soubhagya.policyimpactengine.impact.DeterministicImpactScoringEngine(), fanOutTaskRepository, java.time.Clock.systemUTC(), transactionManager);
		PolicyObservationService orchestrator = new PolicyObservationService(
				policyRepository, fetcher, extractor, normalizer, hasher, persistenceService,
				attemptService, testRetryPolicy(), transactionManager);

		assertThatThrownBy(() -> orchestrator.observe(missing))
				.isInstanceOf(java.util.NoSuchElementException.class);
		assertThat(fanOutTaskRepository.count()).isZero();
	}

	@Test
	void duplicateTaskInsertViolatesUniqueConstraint() {
		Policy policy = policyRepository.saveAndFlush(new Policy("P", "https://example.com/p"));
		PolicyVersion version = versionRepository.saveAndFlush(
				new PolicyVersion(policy, 1, "content", "hash"));
		Instant now = Instant.now();
		fanOutTaskRepository.saveAndFlush(new FanOutTask(policy, version, null, null, now));

		org.springframework.dao.DataIntegrityViolationException thrown = null;
		try {
			fanOutTaskRepository.saveAndFlush(new FanOutTask(policy, version, null, null, now));
		} catch (org.springframework.dao.DataIntegrityViolationException e) {
			thrown = e;
		}
		assertThat(thrown).isNotNull();
	}

	@Test
	void jpaOptionalFlagsMatchDatabaseNullability() throws Exception {
		String policyNullability = jdbcTemplate.queryForObject(
				"SELECT is_nullable FROM information_schema.columns "
						+ "WHERE table_name = 'fan_out_task' AND column_name = 'policy_id'",
				String.class);
		String versionNullability = jdbcTemplate.queryForObject(
				"SELECT is_nullable FROM information_schema.columns "
						+ "WHERE table_name = 'fan_out_task' AND column_name = 'policy_version_id'",
				String.class);
		String ownerNullability = jdbcTemplate.queryForObject(
				"SELECT is_nullable FROM information_schema.columns "
						+ "WHERE table_name = 'fan_out_task' AND column_name = 'owner_user_id'",
				String.class);

		assertThat(policyNullability).isEqualTo("NO");
		assertThat(versionNullability).isEqualTo("NO");
		assertThat(ownerNullability).isEqualTo("YES");
		assertThat(optional("policy")).isFalse();
		assertThat(optional("policyVersion")).isFalse();
		assertThat(optional("owner")).isTrue();
	}

	@Test
	@Transactional
	void claimIncrementsAttemptExactlyOnceAndOnlyFromPending() {
		Instant now = Instant.parse("2026-09-18T10:00:00Z");
		FanOutTask task = persistedTask(now);
		UUID token = UUID.randomUUID();

		int first = fanOutTaskRepository.claim(task.getId(), token, now.plusSeconds(300), now);

		assertThat(first).isEqualTo(1);
		FanOutTask claimed = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(claimed.getStatus()).isEqualTo(FanOutTaskStatus.PROCESSING);
		assertThat(claimed.getAttemptCount()).isEqualTo(1);
		assertThat(claimed.getClaimToken()).isEqualTo(token);

		int replay = fanOutTaskRepository.claim(task.getId(), UUID.randomUUID(),
				now.plusSeconds(300), now);

		assertThat(replay).isZero();
		assertThat(fanOutTaskRepository.findById(task.getId()).orElseThrow().getAttemptCount())
				.isEqualTo(1);
	}

	@Test
	@Transactional
	void claimDueBoundaryIsInclusiveAndFutureIsRejected() {
		Instant now = Instant.parse("2026-09-18T10:00:00Z");
		FanOutTask dueAtBoundary = persistedTask(now);
		FanOutTask future = persistedTask(now.plusNanos(1_000));

		assertThat(fanOutTaskRepository.claim(dueAtBoundary.getId(), UUID.randomUUID(),
				now.plusSeconds(300), now)).isEqualTo(1);
		assertThat(fanOutTaskRepository.claim(future.getId(), UUID.randomUUID(),
				now.plusSeconds(300), now)).isZero();
	}

	@Test
	void concurrentClaimsIncrementAttemptExactlyOnce() throws Exception {
		Instant now = Instant.parse("2026-09-18T10:00:00Z");
		FanOutTask task = persistedTask(now);
		int workers = 2;
		ExecutorService executor = Executors.newFixedThreadPool(workers);
		CountDownLatch ready = new CountDownLatch(workers);
		CountDownLatch start = new CountDownLatch(1);
		List<Future<Integer>> claims = new ArrayList<>();
		try {
			for (int i = 0; i < workers; i++) {
				claims.add(executor.submit(() -> {
					ready.countDown();
					start.await();
					return new org.springframework.transaction.support.TransactionTemplate(transactionManager)
							.execute(status -> fanOutTaskRepository.claim(task.getId(),
									UUID.randomUUID(), now.plusSeconds(300), now));
				}));
			}
			ready.await();
			start.countDown();
			int wins = 0;
			for (Future<Integer> claim : claims) {
				wins += claim.get(60, TimeUnit.SECONDS);
			}

			assertThat(wins).isEqualTo(1);
			FanOutTask claimed = fanOutTaskRepository.findById(task.getId()).orElseThrow();
			assertThat(claimed.getStatus()).isEqualTo(FanOutTaskStatus.PROCESSING);
			assertThat(claimed.getAttemptCount()).isEqualTo(1);
			assertThat(claimed.getClaimToken()).isNotNull();
		}
		finally {
			executor.shutdownNow();
		}
	}

	@Test
	@Transactional
	void claimTokenFencesCompletionRenewalAndFailure() {
		Instant now = Instant.parse("2026-09-18T10:00:00Z");
		FanOutTask task = persistedTask(now);
		UUID token = UUID.randomUUID();
		UUID staleToken = UUID.randomUUID();
		fanOutTaskRepository.claim(task.getId(), token, now.plusSeconds(300), now);

		assertThat(fanOutTaskRepository.complete(task.getId(), staleToken, now)).isZero();
		assertThat(fanOutTaskRepository.renewLease(task.getId(), staleToken,
				now.plusSeconds(600), now)).isZero();
		assertThat(fanOutTaskRepository.fail(task.getId(), staleToken,
				FanOutTaskStatus.FAILED, now, "late", now)).isZero();
		assertThat(fanOutTaskRepository.findById(task.getId()).orElseThrow().getStatus())
				.isEqualTo(FanOutTaskStatus.PROCESSING);

		assertThat(fanOutTaskRepository.renewLease(task.getId(), token,
				now.plusSeconds(600), now)).isEqualTo(1);
		assertThat(fanOutTaskRepository.complete(task.getId(), token, now)).isEqualTo(1);
		FanOutTask completed = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(completed.getStatus()).isEqualTo(FanOutTaskStatus.COMPLETED);
		assertThat(completed.getClaimToken()).isNull();
		assertThat(completed.getLeaseExpiresAt()).isNull();
	}

	@Test
	@Transactional
	void failedTaskIsTerminalAndRetryPendingWaitsForBackoff() {
		Instant now = Instant.parse("2026-09-18T10:00:00Z");
		FanOutTask retryable = persistedTask(now);
		UUID retryToken = UUID.randomUUID();
		fanOutTaskRepository.claim(retryable.getId(), retryToken, now.plusSeconds(300), now);
		fanOutTaskRepository.fail(retryable.getId(), retryToken, FanOutTaskStatus.PENDING,
				now.plusSeconds(60), "transient", now);

		assertThat(fanOutTaskRepository.claim(retryable.getId(), UUID.randomUUID(),
				now.plusSeconds(300), now)).isZero();
		assertThat(fanOutTaskRepository.claim(retryable.getId(), UUID.randomUUID(),
				now.plusSeconds(300), now.plusSeconds(61))).isEqualTo(1);

		FanOutTask failed = persistedTask(now);
		UUID failedToken = UUID.randomUUID();
		fanOutTaskRepository.claim(failed.getId(), failedToken, now.plusSeconds(300), now);
		fanOutTaskRepository.fail(failed.getId(), failedToken, FanOutTaskStatus.FAILED, now,
				"permanent", now);

		assertThat(fanOutTaskRepository.claim(failed.getId(), UUID.randomUUID(),
				now.plusSeconds(300), now.plusSeconds(86400))).isZero();
		assertThat(fanOutTaskRepository.findById(failed.getId()).orElseThrow().getStatus())
				.isEqualTo(FanOutTaskStatus.FAILED);
	}

	private FanOutTask persistedTask(Instant now) {
		Policy policy = policyRepository.saveAndFlush(new Policy("P " + UUID.randomUUID(),
				"https://example.com/" + UUID.randomUUID()));
		PolicyVersion version = versionRepository.saveAndFlush(
				new PolicyVersion(policy, 1, "content-" + UUID.randomUUID(),
						"hash-" + UUID.randomUUID()));
		return fanOutTaskRepository.saveAndFlush(
				new FanOutTask(policy, version, null, null, now));
	}

	private static boolean optional(String fieldName) throws NoSuchFieldException {
		return FanOutTask.class.getDeclaredField(fieldName)
				.getAnnotation(ManyToOne.class).optional();
	}

	private static final class StubPolicyFetcher implements PolicyFetcher {
		private volatile String html;

		StubPolicyFetcher(String html) {
			this.html = html;
		}

		void setHtml(String html) {
			this.html = html;
		}

		@Override
		public FetchResult fetch(String url) {
			return new FetchResult(url, 200, "text/html", html);
		}
	}
}