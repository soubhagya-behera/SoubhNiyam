package com.soubhagya.policyimpactengine.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.soubhagya.policyimpactengine.notification.domain.FanOutTask;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskStatus;
import com.soubhagya.policyimpactengine.policy.domain.Policy;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersionRepository;

@ExtendWith(MockitoExtension.class)
class FanOutTaskServiceTest {

	private static final Instant NOW = Instant.parse("2026-09-18T10:00:00Z");

	@Mock
	private FanOutTaskRepository taskRepository;

	@Mock
	private NotificationFanOutService fanOutService;

	@Mock
	private PolicyVersionRepository versionRepository;

	@Mock
	private Random random;

	private FanOutTaskService service;

	@BeforeEach
	void setUp() {
		service = new FanOutTaskService(taskRepository, fanOutService, versionRepository,
				Clock.fixed(NOW, ZoneOffset.UTC), random);
	}

	@Test
	void claimedTaskProcessesAndCompletesExactlyOnce() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		FanOutTask task = task(policyId, versionId);
		givenClaim(taskId, task);
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenReturn(new FanOutResult.Processed(UUID.randomUUID(), 2, true));

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isInstanceOf(FanOutResult.Processed.class);
		ArgumentCaptor<UUID> token = ArgumentCaptor.forClass(UUID.class);
		verify(taskRepository).complete(eq(taskId), token.capture(), eq(NOW));
		verify(taskRepository, never()).fail(any(), any(), any(), any(), any(), any());
		verify(taskRepository, never()).cancel(any(), any(), any(), any());
		assertThat(token.getValue()).isNotNull();
	}

	@Test
	void noActionableResultCompletesWithoutNotificationWork() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		givenClaim(taskId, task(policyId, versionId));
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenReturn(new FanOutResult.NoActionable(UUID.randomUUID(), 1));

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isInstanceOf(FanOutResult.NoActionable.class);
		verify(taskRepository).complete(eq(taskId), any(), eq(NOW));
		verify(taskRepository, never()).fail(any(), any(), any(), any(), any(), any());
	}

	@Test
	void cancelledResultCancelsWithSanitizedReason() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		givenClaim(taskId, task(policyId, versionId));
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenReturn(new FanOutResult.Cancelled("policy has no owner"));

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isInstanceOf(FanOutResult.Cancelled.class);
		verify(taskRepository).cancel(eq(taskId), any(), eq("policy has no owner"), eq(NOW));
		verify(taskRepository, never()).complete(any(), any(), any());
	}

	@Test
	void claimLossLeavesTaskUntouchedAndSkipsFanOut() {
		UUID taskId = UUID.randomUUID();
		when(taskRepository.claim(eq(taskId), any(), any(), any())).thenReturn(0);

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isNull();
		verifyNoInteractions(fanOutService);
		verify(taskRepository, never()).findById(any());
		verify(taskRepository, never()).complete(any(), any(), any());
	}

	@Test
	void retryableThrownFailureSchedulesBackoffExactlyOnce() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		FanOutTask task = task(policyId, versionId);
		when(task.getAttemptCount()).thenReturn(1);
		givenClaim(taskId, task);
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenThrow(new IllegalStateException("temporary outage"));
		when(random.nextDouble()).thenReturn(0.5d);

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isInstanceOf(FanOutResult.RetryableFailure.class);
		ArgumentCaptor<Instant> nextRetryAt = ArgumentCaptor.forClass(Instant.class);
		verify(taskRepository).fail(eq(taskId), any(), eq(FanOutTaskStatus.PENDING),
				nextRetryAt.capture(), any(), eq(NOW));
		assertThat(nextRetryAt.getValue()).isEqualTo(NOW.plusSeconds(33));
	}

	@Test
	void permanentThrownFailureMarksFailedImmediately() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		FanOutTask task = task(policyId, versionId);
		when(task.getAttemptCount()).thenReturn(1);
		givenClaim(taskId, task);
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenThrow(new java.util.NoSuchElementException("missing"));

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isInstanceOf(FanOutResult.PermanentFailure.class);
		verify(taskRepository).fail(eq(taskId), any(), eq(FanOutTaskStatus.FAILED), eq(NOW),
				org.mockito.ArgumentMatchers.contains("NoSuchElementException"), eq(NOW));
	}

	@Test
	void exhaustedAttemptsProduceFailedEvenForRetryableFailure() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		FanOutTask task = task(policyId, versionId);
		when(task.getAttemptCount()).thenReturn(FanOutTaskService.MAX_ATTEMPTS);
		givenClaim(taskId, task);
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenThrow(new IllegalStateException("still down"));

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isInstanceOf(FanOutResult.RetryableFailure.class);
		verify(taskRepository).fail(eq(taskId), any(), eq(FanOutTaskStatus.FAILED), eq(NOW), any(), eq(NOW));
	}

	@Test
	void retryBackoffJitterNeverExceedsThirtyMinuteCap() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		FanOutTask task = task(policyId, versionId);
		when(task.getAttemptCount()).thenReturn(7);
		givenClaim(taskId, task);
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenThrow(new IllegalStateException("still down"));
		when(random.nextDouble()).thenReturn(0.99d);

		service.processTask(taskId);

		ArgumentCaptor<Instant> nextRetryAt = ArgumentCaptor.forClass(Instant.class);
		verify(taskRepository).fail(eq(taskId), any(), eq(FanOutTaskStatus.PENDING),
				nextRetryAt.capture(), any(), eq(NOW));
		assertThat(nextRetryAt.getValue()).isEqualTo(NOW.plus(Duration.ofMinutes(30)));
	}

	@Test
	void leaseRenewalRequiresTheCurrentToken() {
		UUID taskId = UUID.randomUUID();
		UUID token = UUID.randomUUID();
		UUID staleToken = UUID.randomUUID();
		Duration extension = Duration.ofMinutes(10);
		when(taskRepository.renewLease(taskId, token, NOW.plus(extension), NOW))
				.thenReturn(1);
		when(taskRepository.renewLease(taskId, staleToken, NOW.plus(extension), NOW))
				.thenReturn(0);

		assertThat(service.renewLease(taskId, token, extension)).isTrue();
		assertThat(service.renewLease(taskId, staleToken, extension)).isFalse();
		assertThat(service.renewLease(taskId, null, extension)).isFalse();
		assertThat(service.renewLease(null, token, extension)).isFalse();
	}

	@Test
	void expiredLeasesConsumeAttemptsAndExhaustedLeaseFails() {
		UUID retryableId = UUID.randomUUID();
		UUID retryableToken = UUID.randomUUID();
		FanOutTask retryable = expiredTask(retryableId, retryableToken, 2, "boom");
		UUID exhaustedId = UUID.randomUUID();
		UUID exhaustedToken = UUID.randomUUID();
		FanOutTask exhausted = expiredTask(exhaustedId, exhaustedToken,
				FanOutTaskService.MAX_ATTEMPTS, "boom");
		when(taskRepository.findAll()).thenReturn(List.of(retryable, exhausted));
		when(random.nextDouble()).thenReturn(0.5d);

		service.recoverExpiredLeases();

		verify(taskRepository).fail(eq(retryableId), eq(retryableToken), eq(FanOutTaskStatus.PENDING),
				eq(NOW.plusSeconds(67)), eq("boom"), eq(NOW));
		verify(taskRepository).fail(eq(exhaustedId), eq(exhaustedToken), eq(FanOutTaskStatus.FAILED),
				eq(NOW), eq("lease expired after final attempt"), eq(NOW));
	}

	@Test
	void leaseAtExactExpiryInstantIsNotRecovered() {
		UUID boundaryId = UUID.randomUUID();
		FanOutTask boundary = mock(FanOutTask.class);
		when(boundary.getStatus()).thenReturn(FanOutTaskStatus.PROCESSING);
		when(boundary.getLeaseExpiresAt()).thenReturn(NOW);
		UUID expiredId = UUID.randomUUID();
		FanOutTask expired = expiredTask(expiredId, UUID.randomUUID(), 3, "boom");
		when(taskRepository.findAll()).thenReturn(List.of(boundary, expired));
		when(random.nextDouble()).thenReturn(0.5d);

		service.recoverExpiredLeases();

		verify(taskRepository, never()).fail(eq(boundaryId), any(), any(), any(), any(), any());
		verify(taskRepository).fail(eq(expiredId), any(), eq(FanOutTaskStatus.PENDING),
				any(), eq("boom"), eq(NOW));
	}

	@Test
	void retryableResultUsesPendingState() {
		UUID taskId = UUID.randomUUID();
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		FanOutTask task = task(policyId, versionId);
		when(task.getAttemptCount()).thenReturn(1);
		givenClaim(taskId, task);
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenReturn(new FanOutResult.RetryableFailure("temporary"));
		when(random.nextDouble()).thenReturn(0.5d);

		FanOutResult result = service.processTask(taskId);

		assertThat(result).isInstanceOf(FanOutResult.RetryableFailure.class);
		verify(taskRepository).fail(eq(taskId), any(), eq(FanOutTaskStatus.PENDING), any(), any(), eq(NOW));
	}

	@Test
	void processNewVersionResolvesExactPersistedVersionAndTask() {
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		UUID taskId = UUID.randomUUID();
		PolicyVersion version = mock(PolicyVersion.class);
		when(version.getId()).thenReturn(versionId);
		FanOutTask task = task(policyId, versionId);
		when(task.getId()).thenReturn(taskId);
		givenClaim(taskId, task);
		when(versionRepository.findByPolicy_IdAndVersionNumber(policyId, 3))
				.thenReturn(Optional.of(version));
		when(taskRepository.findByPolicyVersion_Id(versionId)).thenReturn(Optional.of(task));
		when(fanOutService.fanOutVersion(policyId, versionId))
				.thenReturn(new FanOutResult.NoActionable(UUID.randomUUID(), 1));

		FanOutResult result = service.processNewVersion(policyId, 3);

		assertThat(result).isInstanceOf(FanOutResult.NoActionable.class);
		verify(versionRepository).findByPolicy_IdAndVersionNumber(policyId, 3);
		verify(taskRepository).findByPolicyVersion_Id(versionId);
		verify(fanOutService).fanOutVersion(policyId, versionId);
	}

	@Test
	void processNewVersionWithoutTaskDoesNotFanOut() {
		UUID policyId = UUID.randomUUID();
		UUID versionId = UUID.randomUUID();
		PolicyVersion version = mock(PolicyVersion.class);
		when(version.getId()).thenReturn(versionId);
		when(versionRepository.findByPolicy_IdAndVersionNumber(policyId, 3))
				.thenReturn(Optional.of(version));
		when(taskRepository.findByPolicyVersion_Id(versionId)).thenReturn(Optional.empty());

		FanOutResult result = service.processNewVersion(policyId, 3);

		assertThat(result).isNull();
		verifyNoInteractions(fanOutService);
	}

	private void givenClaim(UUID taskId, FanOutTask task) {
		when(taskRepository.claim(eq(taskId), any(), any(), any())).thenReturn(1);
		when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
	}

	private FanOutTask task(UUID policyId, UUID versionId) {
		FanOutTask task = mock(FanOutTask.class);
		Policy policy = mock(Policy.class);
		PolicyVersion version = mock(PolicyVersion.class);
		when(task.getPolicy()).thenReturn(policy);
		when(policy.getId()).thenReturn(policyId);
		when(task.getPolicyVersion()).thenReturn(version);
		when(version.getId()).thenReturn(versionId);
		return task;
	}

	private FanOutTask expiredTask(UUID taskId, UUID token, int attemptCount,
			String lastError) {
		FanOutTask task = mock(FanOutTask.class);
		when(task.getId()).thenReturn(taskId);
		when(task.getStatus()).thenReturn(FanOutTaskStatus.PROCESSING);
		when(task.getLeaseExpiresAt()).thenReturn(NOW.minusSeconds(1));
		when(task.getClaimToken()).thenReturn(token);
		when(task.getAttemptCount()).thenReturn(attemptCount);
		if (attemptCount < FanOutTaskService.MAX_ATTEMPTS) {
			when(task.getLastError()).thenReturn(lastError);
		}
		return task;
	}
}
