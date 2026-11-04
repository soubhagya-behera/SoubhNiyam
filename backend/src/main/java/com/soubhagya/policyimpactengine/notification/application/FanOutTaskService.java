package com.soubhagya.policyimpactengine.notification.application;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.soubhagya.policyimpactengine.notification.domain.FanOutTask;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskStatus;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersionRepository;

@Service
public class FanOutTaskService {

	public static final int MAX_ATTEMPTS = 8;
	private static final long[] BASE_DELAY_SECONDS = { 30, 60, 120, 240, 480, 960, 1800, 1800 };
	private static final Duration LEASE_DURATION = Duration.ofMinutes(5);

	private final FanOutTaskRepository taskRepository;
	private final NotificationFanOutService fanOutService;
	private final PolicyVersionRepository versionRepository;
	private final java.time.Clock clock;
	private final Random random;
	private final TransactionTemplate transactionTemplate;

	@Autowired
	public FanOutTaskService(FanOutTaskRepository taskRepository,
			NotificationFanOutService fanOutService,
			PolicyVersionRepository versionRepository,
			java.time.Clock clock,
			PlatformTransactionManager transactionManager) {
		this(taskRepository, fanOutService, versionRepository, clock, new Random(),
				transactionManager);
	}

	public FanOutTaskService(FanOutTaskRepository taskRepository,
			NotificationFanOutService fanOutService,
			PolicyVersionRepository versionRepository,
			java.time.Clock clock) {
		this(taskRepository, fanOutService, versionRepository, clock, new Random(), null);
	}

	public FanOutTaskService(FanOutTaskRepository taskRepository,
			NotificationFanOutService fanOutService,
			PolicyVersionRepository versionRepository,
			java.time.Clock clock,
			Random random) {
		this(taskRepository, fanOutService, versionRepository, clock, random, null);
	}

	public FanOutTaskService(FanOutTaskRepository taskRepository,
			NotificationFanOutService fanOutService,
			PolicyVersionRepository versionRepository,
			java.time.Clock clock,
			Random random,
			PlatformTransactionManager transactionManager) {
		if (taskRepository == null) {
			throw new IllegalArgumentException("Task repository must not be null");
		}
		if (fanOutService == null) {
			throw new IllegalArgumentException("Fan-out service must not be null");
		}
		if (versionRepository == null) {
			throw new IllegalArgumentException("Version repository must not be null");
		}
		this.taskRepository = taskRepository;
		this.fanOutService = fanOutService;
		this.versionRepository = versionRepository;
		this.clock = clock != null ? clock : java.time.Clock.systemUTC();
		this.random = random != null ? random : new Random();
		this.transactionTemplate = transactionManager != null
				? new TransactionTemplate(transactionManager) : null;
	}

	public FanOutResult processNewVersion(UUID policyId, int versionNumber) {
		if (policyId == null) {
			throw new IllegalArgumentException("Policy id must not be null");
		}
		PolicyVersion version = versionRepository
				.findByPolicy_IdAndVersionNumber(policyId, versionNumber)
				.orElse(null);
		if (version == null) {
			return null;
		}
		FanOutTask task = taskRepository.findByPolicyVersion_Id(version.getId()).orElse(null);
		if (task == null) {
			return null;
		}
		return processTask(task.getId());
	}

	public FanOutResult processTask(UUID taskId) {
		if (taskId == null) {
			throw new IllegalArgumentException("Task id must not be null");
		}
		Optional<ClaimResult> claim = claim(taskId);
		if (claim.isEmpty()) {
			return null;
		}
		ClaimResult claimed = claim.get();
		FanOutTask task = taskRepository.findById(taskId).orElseThrow();
		UUID policyId = task.getPolicy().getId();
		UUID versionId = task.getPolicyVersion().getId();
		Instant now = clock.instant();
		try {
			FanOutResult result = fanOutService.fanOutVersion(policyId, versionId);
			if (result instanceof FanOutResult.Processed || result instanceof FanOutResult.NoActionable) {
				complete(taskId, claimed.token(), now);
			} else if (result instanceof FanOutResult.Cancelled cancelled) {
				cancel(taskId, claimed.token(), cancelled.reason(), now);
			} else if (result instanceof FanOutResult.RetryableFailure retryable) {
				fail(taskId, claimed.token(), retryable.error(), true, now);
			} else if (result instanceof FanOutResult.PermanentFailure permanent) {
				fail(taskId, claimed.token(), permanent.error(), false, now);
			}
			return result;
		} catch (RuntimeException failure) {
			boolean retryable = isRetryable(failure);
			fail(taskId, claimed.token(), failure, retryable, now);
			return retryable ? new FanOutResult.RetryableFailure(sanitize(failure))
					: new FanOutResult.PermanentFailure(sanitize(failure));
		}
	}

	public boolean renewLease(UUID taskId, UUID claimToken, Duration extension) {
		if (taskId == null || claimToken == null) {
			return false;
		}
		return Boolean.TRUE.equals(inTransaction(() -> {
			Duration actual = extension != null ? extension : LEASE_DURATION;
			Instant now = clock.instant();
			int updated = taskRepository.renewLease(taskId, claimToken, now.plus(actual), now);
			return updated == 1;
		}));
	}

	public void recoverExpiredLeases() {
		inTransaction(() -> {
			Instant now = clock.instant();
			for (FanOutTask task : taskRepository.findAll()) {
				if (task.getStatus() != FanOutTaskStatus.PROCESSING
						|| task.getLeaseExpiresAt() == null
						|| !task.getLeaseExpiresAt().isBefore(now) || task.getClaimToken() == null) {
					continue;
				}
				if (task.getAttemptCount() < MAX_ATTEMPTS) {
					Instant nextRetryAt = nextRetryAt(task.getAttemptCount(), now);
					taskRepository.fail(task.getId(), task.getClaimToken(),
							FanOutTaskStatus.PENDING, nextRetryAt, task.getLastError(), now);
				} else {
					taskRepository.fail(task.getId(), task.getClaimToken(),
							FanOutTaskStatus.FAILED, now,
							"lease expired after final attempt", now);
				}
			}
			return null;
		});
	}

	private Optional<ClaimResult> claim(UUID taskId) {
		return inTransaction(() -> {
			Instant now = clock.instant();
			UUID token = UUID.randomUUID();
			Instant leaseExpiresAt = now.plus(LEASE_DURATION);
			int updated = taskRepository.claim(taskId, token, leaseExpiresAt, now);
			if (updated != 1) {
				return Optional.empty();
			}
			FanOutTask task = taskRepository.findById(taskId).orElseThrow();
			return Optional.of(
					new ClaimResult(taskId, token, leaseExpiresAt, task.getAttemptCount()));
		});
	}

	private void complete(UUID taskId, UUID token, Instant now) {
		inTransaction(() -> {
			taskRepository.complete(taskId, token, now);
			return null;
		});
	}

	private void cancel(UUID taskId, UUID token, String reason, Instant now) {
		inTransaction(() -> {
			taskRepository.cancel(taskId, token, sanitizeReason(reason), now);
			return null;
		});
	}

	private void fail(UUID taskId, UUID token, Object failure, boolean retryable, Instant now) {
		inTransaction(() -> {
			FanOutTask task = taskRepository.findById(taskId).orElseThrow();
			int attempts = task.getAttemptCount();
			String error = sanitize(failure);
			if (retryable && attempts < MAX_ATTEMPTS) {
				Instant nextRetryAt = nextRetryAt(attempts, now);
				taskRepository.fail(taskId, token, FanOutTaskStatus.PENDING, nextRetryAt, error,
						now);
			} else {
				taskRepository.fail(taskId, token, FanOutTaskStatus.FAILED, now, error, now);
			}
			return null;
		});
	}

	private void fail(UUID taskId, UUID token, String error, boolean retryable, Instant now) {
		fail(taskId, token, (Object) error, retryable, now);
	}

	private Instant nextRetryAt(int attemptCount, Instant now) {
		int index = Math.max(0, Math.min(BASE_DELAY_SECONDS.length - 1, attemptCount - 1));
		long baseSeconds = BASE_DELAY_SECONDS[index];
		double jitter = random.nextDouble() * 0.25d * (double) baseSeconds;
		long totalSeconds = (long) (baseSeconds + jitter);
		if (totalSeconds > 1800L) {
			totalSeconds = 1800L;
		}
		return now.plusSeconds(totalSeconds);
	}

	private boolean isRetryable(RuntimeException failure) {
		if (failure instanceof IllegalArgumentException || failure instanceof java.util.NoSuchElementException
				|| failure instanceof com.soubhagya.policyimpactengine.policy.application.PolicyArchivedException) {
			return false;
		}
		return true;
	}

	private String sanitize(Object failure) {
		String value;
		if (failure instanceof Throwable throwable) {
			String name = throwable.getClass().getName();
			String message = throwable.getMessage();
			value = message == null ? name : name + ": " + message;
		} else {
			value = String.valueOf(failure);
		}
		if (value.length() > 1000) {
			value = value.substring(0, 1000);
		}
		return value;
	}

	private String sanitizeReason(String reason) {
		if (reason == null) {
			return "cancelled";
		}
		return reason.length() > 1000 ? reason.substring(0, 1000) : reason;
	}

	private <T> T inTransaction(Supplier<T> action) {
		if (transactionTemplate == null) {
			return action.get();
		}
		return transactionTemplate.execute(status -> action.get());
	}

	private record ClaimResult(UUID taskId, UUID token, Instant leaseExpiresAt, int attemptCount) {
	}
}