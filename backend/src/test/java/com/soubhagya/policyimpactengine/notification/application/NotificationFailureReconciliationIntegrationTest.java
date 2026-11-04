package com.soubhagya.policyimpactengine.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.soubhagya.policyimpactengine.impact.domain.ImpactAssessment;
import com.soubhagya.policyimpactengine.impact.domain.ImpactAssessmentRepository;
import com.soubhagya.policyimpactengine.monitoring.domain.PolicyFetchAttemptRepository;
import com.soubhagya.policyimpactengine.monitoring.domain.PolicyFetchAttemptStatus;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTask;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskStatus;
import com.soubhagya.policyimpactengine.notification.domain.Notification;
import com.soubhagya.policyimpactengine.notification.domain.NotificationRepository;
import com.soubhagya.policyimpactengine.policy.application.PolicyCheckService;
import com.soubhagya.policyimpactengine.policy.application.PolicyService;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersionRepository;
import com.soubhagya.policyimpactengine.policy.fetch.FetchResult;
import com.soubhagya.policyimpactengine.policy.fetch.PolicyFetcher;
import com.soubhagya.policyimpactengine.policy.web.dto.PolicyCheckResponse;
import com.soubhagya.policyimpactengine.policy.web.dto.PolicyResponse;
import com.soubhagya.policyimpactengine.recommendation.domain.Recommendation;
import com.soubhagya.policyimpactengine.recommendation.domain.RecommendationRepository;
import com.soubhagya.policyimpactengine.user.UserService;
import com.soubhagya.policyimpactengine.user.domain.User;

/**
 * Phase 6 Batch 3 final acceptance - the complete notification-failure to
 * reconciliation recovery path against PostgreSQL.
 *
 * <p>The real manual-check facade runs the normal observation and synchronous
 * fan-out path. A one-time failure is injected at the notification-emission
 * boundary, after the assessment and recommendations have committed, so the
 * durable task becomes retryable without rewriting the successful observation.
 * The injected clock is then advanced beyond the persisted retry time and the
 * real reconciliation service claims and processes the exact persisted
 * version. A second reconciliation proves the recovery is idempotent.
 */
@SpringBootTest
@Testcontainers
@Import(NotificationFailureReconciliationIntegrationTest.ManualClockConfiguration.class)
class NotificationFailureReconciliationIntegrationTest {

	private static final Instant START = Instant.parse("2026-09-18T10:00:00Z");

	private static final String V1_HTML = "<html><body><p>Welcome to our privacy policy.</p>"
			+ "<p>This policy applies to all users of the service.</p></body></html>";
	private static final String V2_HTML = "<html><body><p>Welcome to our privacy policy.</p>"
			+ "<p>This policy applies to all users of the service.</p>"
			+ "<p>We share your location data with third-party advertising partners.</p></body></html>";

	@Container
	@ServiceConnection
	static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

	@Autowired private PolicyVersionRepository versionRepository;
	@Autowired private PolicyFetchAttemptRepository attemptRepository;
	@Autowired private ImpactAssessmentRepository assessmentRepository;
	@Autowired private RecommendationRepository recommendationRepository;
	@Autowired private NotificationRepository notificationRepository;
	@Autowired private FanOutTaskRepository fanOutTaskRepository;
	@Autowired private PolicyCheckService policyCheckService;
	@Autowired private PolicyService policyService;
	@Autowired private UserService userService;
	@Autowired private FanOutReconciliationService reconciliationService;
	@Autowired private ManualClock manualClock;
	@Autowired private JdbcTemplate jdbcTemplate;

	@MockitoBean
	private PolicyFetcher fetcher;

	@MockitoSpyBean
	private NotificationService notificationService;

	@BeforeEach
	void clean() {
		jdbcTemplate.update("DELETE FROM notification");
		jdbcTemplate.update("DELETE FROM recommendation");
		jdbcTemplate.update("DELETE FROM impact_assessment_breakdown");
		jdbcTemplate.update("DELETE FROM impact_assessment");
		jdbcTemplate.update("DELETE FROM fan_out_task");
		jdbcTemplate.update("DELETE FROM policy_fetch_attempt");
		jdbcTemplate.update("DELETE FROM change_impact");
		jdbcTemplate.update("DELETE FROM change_concept_match");
		jdbcTemplate.update("DELETE FROM policy_change");
		jdbcTemplate.update("DELETE FROM policy_version");
		jdbcTemplate.update("DELETE FROM audit_event");
		jdbcTemplate.update("DELETE FROM auth_refresh_token");
		jdbcTemplate.update("DELETE FROM policy");
		jdbcTemplate.update("DELETE FROM app_user");
	}

	@Test
	void notificationFailureIsRecoveredByReconciliationExactlyOnce() {
		User owner = userService.createUser();
		PolicyResponse registered = policyService.register(owner.getId(),
				"Recovery acceptance", "https://example.com/" + UUID.randomUUID());
		UUID policyId = registered.id();
		AtomicReference<String> html = new AtomicReference<>(V1_HTML);
		when(fetcher.fetch(anyString())).thenAnswer(invocation -> new FetchResult(
				(String) invocation.getArgument(0), 200, "text/html", html.get()));

		PolicyCheckResponse first = policyCheckService.check(owner.getId(), policyId);
		assertThat(first.outcome()).isEqualTo("FIRST_VERSION");
		assertThat(first.versionNumber()).isEqualTo(1);
		assertThat(first.attemptStatus()).isEqualTo("SUCCESS");

		doAnswer(invocation -> {
			// The failure is deliberately injected after the assessment and
			// recommendations commit and before any notification row exists.
			assertThat(assessmentRepository.count()).isEqualTo(1);
			assertThat(recommendationRepository.count()).isPositive();
			assertThat(notificationRepository.count()).isZero();
			throw new IllegalStateException("notification creation unavailable");
		}).doCallRealMethod().when(notificationService).emitForAssessment(any(), any());

		html.set(V2_HTML);
		PolicyCheckResponse second = policyCheckService.check(owner.getId(), policyId);
		assertThat(second.outcome()).isEqualTo("NEW_VERSION");
		assertThat(second.versionNumber()).isEqualTo(2);
		assertThat(second.attemptStatus()).isEqualTo("SUCCESS");

		List<PolicyVersion> versions = versionRepository
				.findByPolicy_IdOrderByVersionNumberAsc(policyId);
		assertThat(versions).hasSize(2);
		assertThat(versions).extracting(PolicyVersion::getVersionNumber)
				.containsExactly(1, 2);
		PolicyVersion versionTwo = versions.get(1);

		assertThat(attemptRepository.count()).isEqualTo(2);
		assertThat(attemptRepository.findAll())
				.extracting(attempt -> attempt.getStatus())
				.containsExactlyInAnyOrder(PolicyFetchAttemptStatus.SUCCESS,
						PolicyFetchAttemptStatus.SUCCESS);

		assertThat(fanOutTaskRepository.count()).isEqualTo(1);
		FanOutTask pending = fanOutTaskRepository
				.findByPolicyVersion_Id(versionTwo.getId()).orElseThrow();
		assertThat(pending.getStatus()).isEqualTo(FanOutTaskStatus.PENDING);
		assertThat(pending.getAttemptCount()).isEqualTo(1);
		assertThat(pending.getNextRetryAt()).isAfter(manualClock.instant());
		assertThat(pending.getLastError()).contains("notification creation unavailable");
		assertThat(pending.getPolicy().getId()).isEqualTo(policyId);
		assertThat(pending.getPolicyVersion().getId()).isEqualTo(versionTwo.getId());

		ImpactAssessment assessment = assessmentRepository
				.findByUser_IdAndNewVersion_Id(owner.getId(), versionTwo.getId())
				.orElseThrow();
		UUID assessmentId = assessment.getId();
		assertThat(assessmentRepository.count()).isEqualTo(1);
		assertThat(assessment.getNewVersion().getId()).isEqualTo(versionTwo.getId());

		List<Recommendation> recommendations = recommendationRepository
				.findByAssessment_IdOrderByPersonalizedNormalizedDescRuleOrderAscConceptCodeAsc(
						assessmentId);
		assertThat(recommendations).hasSize(5);
		assertThat(recommendations).noneMatch(row ->
				"REC-NONE-REQUIRED".equals(row.getRuleId()));
		long recommendationCount = recommendations.size();
		List<UUID> recommendationIds = recommendations.stream()
				.map(Recommendation::getId)
				.toList();

		assertThat(notificationRepository.count()).isZero();
		assertThat(notificationRepository.findByAssessment_Id(assessmentId)).isEmpty();

		manualClock.advance(Duration.between(manualClock.instant(),
				pending.getNextRetryAt()).plusSeconds(1));

		int processed = reconciliationService.reconcile();

		assertThat(processed).isEqualTo(1);
		FanOutTask completed = fanOutTaskRepository.findById(pending.getId()).orElseThrow();
		assertThat(completed.getStatus()).isEqualTo(FanOutTaskStatus.COMPLETED);
		assertThat(completed.getAttemptCount()).isEqualTo(2);
		assertThat(completed.getClaimToken()).isNull();
		assertThat(completed.getLeaseExpiresAt()).isNull();
		assertThat(completed.getPolicyVersion().getId()).isEqualTo(versionTwo.getId());

		assertThat(versionRepository.count()).isEqualTo(2);
		assertThat(versionRepository
				.findByPolicy_IdAndVersionNumber(policyId, 3)).isEmpty();
		assertThat(assessmentRepository.count()).isEqualTo(1);
		assertThat(recommendationRepository.count()).isEqualTo(recommendationCount);
		assertThat(recommendationRepository
				.findByAssessment_IdOrderByPersonalizedNormalizedDescRuleOrderAscConceptCodeAsc(
						assessmentId)
				.stream()
				.map(Recommendation::getId)
				.toList())
				.containsExactlyElementsOf(recommendationIds);

		assertThat(notificationRepository.count()).isEqualTo(1);
		Notification notification = notificationRepository.findAll().get(0);
		UUID notificationId = notification.getId();
		assertThat(notification.getAssessment().getId()).isEqualTo(assessmentId);
		assertThat(notification.getAssessment().getNewVersion().getId())
				.isEqualTo(versionTwo.getId());
		assertThat(notification.getCreatedAt()).isEqualTo(manualClock.instant());
		verify(notificationService, times(2)).emitForAssessment(any(), any());

		int secondRun = reconciliationService.reconcile();

		assertThat(secondRun).isZero();
		FanOutTask unchanged = fanOutTaskRepository.findById(pending.getId()).orElseThrow();
		assertThat(unchanged.getStatus()).isEqualTo(FanOutTaskStatus.COMPLETED);
		assertThat(unchanged.getAttemptCount()).isEqualTo(2);
		assertThat(fanOutTaskRepository.count()).isEqualTo(1);
		assertThat(versionRepository.count()).isEqualTo(2);
		assertThat(versionRepository
				.findByPolicy_IdAndVersionNumber(policyId, 3)).isEmpty();
		assertThat(assessmentRepository.count()).isEqualTo(1);
		assertThat(recommendationRepository.count()).isEqualTo(recommendationCount);
		assertThat(recommendationRepository
				.findByAssessment_IdOrderByPersonalizedNormalizedDescRuleOrderAscConceptCodeAsc(
						assessmentId)
				.stream()
				.map(Recommendation::getId)
				.toList())
				.containsExactlyElementsOf(recommendationIds);
		assertThat(notificationRepository.count()).isEqualTo(1);
		assertThat(notificationRepository.findAll().get(0).getId()).isEqualTo(notificationId);
		verify(notificationService, times(2)).emitForAssessment(any(), any());
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class ManualClockConfiguration {

		@Bean
		@Primary
		ManualClock manualClock() {
			return new ManualClock(START);
		}
	}

	private static final class ManualClock extends Clock {

		private Instant now;

		ManualClock(Instant now) {
			this.now = now;
		}

		void advance(Duration duration) {
			now = now.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return now;
		}
	}
}
