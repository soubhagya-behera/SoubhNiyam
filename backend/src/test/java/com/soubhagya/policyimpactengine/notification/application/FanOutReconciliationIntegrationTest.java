package com.soubhagya.policyimpactengine.notification.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
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

import com.soubhagya.policyimpactengine.diff.domain.PolicyChangeRecordRepository;
import com.soubhagya.policyimpactengine.impact.domain.ChangeImpactRepository;
import com.soubhagya.policyimpactengine.impact.domain.ImpactAssessmentBreakdownRepository;
import com.soubhagya.policyimpactengine.impact.domain.ImpactAssessmentRepository;
import com.soubhagya.policyimpactengine.intelligence.domain.ChangeConceptMatchRepository;
import com.soubhagya.policyimpactengine.monitoring.application.PolicyFetchAttemptService;
import com.soubhagya.policyimpactengine.monitoring.application.RetryPolicy;
import com.soubhagya.policyimpactengine.monitoring.domain.PolicyFetchAttemptRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTask;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskStatus;
import com.soubhagya.policyimpactengine.notification.domain.NotificationRepository;
import com.soubhagya.policyimpactengine.policy.application.PolicyObservationPersistenceService;
import com.soubhagya.policyimpactengine.policy.application.PolicyObservationService;
import com.soubhagya.policyimpactengine.policy.application.PolicyService;
import com.soubhagya.policyimpactengine.policy.domain.Policy;
import com.soubhagya.policyimpactengine.policy.domain.PolicyRepository;
import com.soubhagya.policyimpactengine.policy.domain.PolicyStatus;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersionRepository;
import com.soubhagya.policyimpactengine.policy.fetch.DefaultPolicyTextNormalizer;
import com.soubhagya.policyimpactengine.policy.fetch.FetchResult;
import com.soubhagya.policyimpactengine.policy.fetch.JsoupPolicyContentExtractor;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyContentExtractor;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyContentHasher;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyFetchException;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyFetcher;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyTextNormalizer;
import com.soubhagya.policyimpactengine.policy.fetch.Sha256PolicyContentHasher;
import com.soubhagya.policyimpactengine.recommendation.domain.RecommendationRepository;
import com.soubhagya.policyimpactengine.user.UserService;
import com.soubhagya.policyimpactengine.user.domain.User;

@SpringBootTest
@Testcontainers
class FanOutReconciliationIntegrationTest {

	private static final String V1_HTML = "<html><body><p>Welcome to our privacy policy.</p>"
			+ "<p>This policy applies to all users of the service.</p></body></html>";
	private static final String V2_HTML = "<html><body><p>Welcome to our privacy policy.</p>"
			+ "<p>This policy applies to all users of the service.</p>"
			+ "<p>We share your location data with third-party advertising partners.</p></body></html>";

	@Container
	@ServiceConnection
	static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

	@Autowired private PolicyRepository policyRepository;
	@Autowired private PolicyVersionRepository versionRepository;
	@Autowired private PolicyChangeRecordRepository changeRepository;
	@Autowired private ChangeConceptMatchRepository matchRepository;
	@Autowired private ChangeImpactRepository impactRepository;
	@Autowired private PolicyFetchAttemptRepository attemptRepository;
	@Autowired private ImpactAssessmentRepository assessmentRepository;
	@Autowired private ImpactAssessmentBreakdownRepository breakdownRepository;
	@Autowired private RecommendationRepository recommendationRepository;
	@Autowired private NotificationRepository notificationRepository;
	@Autowired private FanOutTaskRepository fanOutTaskRepository;
	@Autowired private PolicyFetchAttemptService attemptService;
	@Autowired private PolicyObservationPersistenceService persistenceService;
	@Autowired private PolicyService policyService;
	@Autowired private UserService userService;
	@Autowired private FanOutReconciliationService reconciliationService;
	@Autowired private PlatformTransactionManager transactionManager;

	private final PolicyContentExtractor extractor = new JsoupPolicyContentExtractor();
	private final PolicyTextNormalizer normalizer = new DefaultPolicyTextNormalizer();
	private final PolicyContentHasher hasher = new Sha256PolicyContentHasher();

	@BeforeEach
	void clean() {
		notificationRepository.deleteAll();
		recommendationRepository.deleteAll();
		breakdownRepository.deleteAll();
		assessmentRepository.deleteAll();
		fanOutTaskRepository.deleteAll();
		attemptRepository.deleteAll();
		impactRepository.deleteAll();
		matchRepository.deleteAll();
		changeRepository.deleteAll();
		versionRepository.deleteAll();
		policyRepository.deleteAll();
	}

	@Test
	void pendingTaskIsReplayedForItsExactPersistedVersion() {
		User owner = userService.createUser();
		Policy policy = ownedActivePolicy(owner);
		MutableFetcher fetcher = new MutableFetcher(
				new ConcurrentHashMap<>(Map.of(policy.getUrl(), V1_HTML)));
		PolicyObservationService observations = orchestrator(fetcher);

		observations.observe(policy.getId());
		fetcher.put(policy.getUrl(), V2_HTML);
		observations.observe(policy.getId());

		PolicyVersion versionTwo = versionRepository
				.findByPolicy_IdAndVersionNumber(policy.getId(), 2).orElseThrow();
		FanOutTask pending = fanOutTaskRepository
				.findByPolicyVersion_Id(versionTwo.getId()).orElseThrow();
		assertThat(pending.getStatus()).isEqualTo(FanOutTaskStatus.PENDING);
		assertThat(notificationRepository.count()).isZero();

		int processed = reconciliationService.reconcile();

		assertThat(processed).isEqualTo(1);
		FanOutTask completed = fanOutTaskRepository.findById(pending.getId()).orElseThrow();
		assertThat(completed.getStatus()).isEqualTo(FanOutTaskStatus.COMPLETED);
		assertThat(completed.getAttemptCount()).isEqualTo(1);
		assertThat(completed.getClaimToken()).isNull();
		assertThat(completed.getLeaseExpiresAt()).isNull();
		assertThat(completed.getPolicyVersion().getId()).isEqualTo(versionTwo.getId());
		assertThat(assessmentRepository.findAll()).hasSize(1);
		assertThat(assessmentRepository.findAll().get(0).getNewVersion().getId())
				.isEqualTo(versionTwo.getId());
		assertThat(recommendationRepository.count()).isPositive();
		assertThat(notificationRepository.count()).isEqualTo(1);
	}

	@Test
	void futureAndTerminalTasksAreNotProcessed() {
		Instant now = Instant.now();
		FanOutTask future = persistedTask(now.plus(Duration.ofHours(1)));
		FanOutTask failed = persistedTask(now.minusSeconds(60));
		UUID token = UUID.randomUUID();
		inTransaction(() -> fanOutTaskRepository.claim(failed.getId(), token,
				now.plusSeconds(300), now));
		inTransaction(() -> fanOutTaskRepository.fail(failed.getId(), token,
				FanOutTaskStatus.FAILED, now, "permanent", now));

		int processed = reconciliationService.reconcile();

		assertThat(processed).isZero();
		assertThat(fanOutTaskRepository.findById(future.getId()).orElseThrow().getStatus())
				.isEqualTo(FanOutTaskStatus.PENDING);
		assertThat(fanOutTaskRepository.findById(failed.getId()).orElseThrow().getStatus())
				.isEqualTo(FanOutTaskStatus.FAILED);
		assertThat(notificationRepository.count()).isZero();
	}

	@Test
	void expiredProcessingLeaseIsRecoveredBeforeDueSelection() {
		Instant now = Instant.now();
		FanOutTask task = persistedTask(now.minusSeconds(60));
		UUID token = UUID.randomUUID();
		inTransaction(() -> fanOutTaskRepository.claim(task.getId(), token,
				now.minusSeconds(1), now));
		assertThat(fanOutTaskRepository.findById(task.getId()).orElseThrow().getStatus())
				.isEqualTo(FanOutTaskStatus.PROCESSING);

		reconciliationService.reconcile();

		FanOutTask recovered = fanOutTaskRepository.findById(task.getId()).orElseThrow();
		assertThat(recovered.getStatus()).isEqualTo(FanOutTaskStatus.PENDING);
		assertThat(recovered.getAttemptCount()).isEqualTo(1);
		assertThat(recovered.getClaimToken()).isNull();
		assertThat(recovered.getLeaseExpiresAt()).isNull();
		assertThat(recovered.getNextRetryAt()).isAfter(now);
		assertThat(notificationRepository.count()).isZero();
	}

	private PolicyObservationService orchestrator(PolicyFetcher fetcher) {
		RetryPolicy retryPolicy = new RetryPolicy(5, Duration.ofMinutes(5), 2.0,
				Duration.ofHours(6), Duration.ofHours(24), new Random());
		return new PolicyObservationService(policyRepository, fetcher, extractor,
				normalizer, hasher, persistenceService, attemptService, retryPolicy,
				transactionManager);
	}

	private Policy ownedActivePolicy(User owner) {
		Policy policy = new Policy("P " + UUID.randomUUID(),
				"https://example.com/" + UUID.randomUUID());
		policy.setStatus(PolicyStatus.ACTIVE);
		policy.setNextCheckAt(Instant.now().minusSeconds(60));
		policy = policyRepository.saveAndFlush(policy);
		policyService.assignOwner(owner.getId(), policy.getId());
		return policyRepository.findById(policy.getId()).orElseThrow();
	}

	private FanOutTask persistedTask(Instant nextRetryAt) {
		return inTransaction(() -> {
			Policy policy = policyRepository.saveAndFlush(new Policy(
					"P " + UUID.randomUUID(),
					"https://example.com/" + UUID.randomUUID()));
			PolicyVersion version = versionRepository.saveAndFlush(
					new PolicyVersion(policy, 1, "content-" + UUID.randomUUID(),
							"hash-" + UUID.randomUUID()));
			return fanOutTaskRepository.saveAndFlush(
					new FanOutTask(policy, version, null, null, nextRetryAt));
		});
	}

	private <T> T inTransaction(Supplier<T> action) {
		return new TransactionTemplate(transactionManager).execute(status -> action.get());
	}

	private static final class MutableFetcher implements PolicyFetcher {
		private final Map<String, String> routes;

		MutableFetcher(Map<String, String> routes) {
			this.routes = new ConcurrentHashMap<>(routes);
		}

		void put(String url, String html) {
			routes.put(url, html);
		}

		@Override
		public FetchResult fetch(String url) {
			String html = routes.get(url);
			if (html == null) {
				throw new PolicyFetchException("no fixture for " + url);
			}
			return new FetchResult(url, 200, "text/html", html);
		}
	}
}
