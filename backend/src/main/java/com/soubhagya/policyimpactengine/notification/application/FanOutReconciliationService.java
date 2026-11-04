package com.soubhagya.policyimpactengine.notification.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.soubhagya.policyimpactengine.notification.FanOutReconciliationProperties;
import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;

/**
 * Phase 6 Batch 3 — bounded reconciliation of durable fan-out tasks.
 *
 * <p>Each run first reclaims expired processing leases through the
 * existing {@link FanOutTaskService#recoverExpiredLeases()} lifecycle,
 * then selects only {@code PENDING} tasks whose retry time has elapsed,
 * oldest first, bounded by the configured batch size. Every candidate is
 * processed through {@link FanOutTaskService#processTask(UUID)}, which
 * reuses the same atomic claim, claim-token fencing, exact persisted
 * {@code policy_version_id}, retry policy, and terminal-state handling as
 * the manual and scheduled paths.
 *
 * <p>The service never processes {@code FAILED}, {@code PROCESSING}, or
 * already completed tasks, and it performs no historical backfill. The
 * selected due list is a read-only snapshot: a worker in another instance
 * may win the claim first, in which case {@code processTask} returns
 * {@code null} without duplicate downstream work.
 *
 * <p>Transactions stay short: selection is one read, claim/completion
 * are separate short transactions inside {@code FanOutTaskService}, and
 * no transaction is held across downstream assessment, recommendation,
 * or notification work. A failure on one task is isolated so the rest of
 * the bounded batch still runs.
 */
@Service
public class FanOutReconciliationService {

	private final FanOutTaskRepository taskRepository;
	private final FanOutTaskService taskService;
	private final Clock clock;
	private final int batchSize;

	@Autowired
	public FanOutReconciliationService(FanOutTaskRepository taskRepository,
			FanOutTaskService taskService, Clock clock,
			FanOutReconciliationProperties properties) {
		this(taskRepository, taskService, clock,
				properties != null ? properties.batchSize() : 0);
	}

	public FanOutReconciliationService(FanOutTaskRepository taskRepository,
			FanOutTaskService taskService, Clock clock, int batchSize) {
		if (taskRepository == null) {
			throw new IllegalArgumentException("Task repository must not be null");
		}
		if (taskService == null) {
			throw new IllegalArgumentException("Fan-out task service must not be null");
		}
		if (clock == null) {
			throw new IllegalArgumentException("Clock must not be null");
		}
		if (batchSize < 1) {
			throw new IllegalArgumentException("Batch size must be >= 1");
		}
		this.taskRepository = taskRepository;
		this.taskService = taskService;
		this.clock = clock;
		this.batchSize = batchSize;
	}

	/**
	 * Reconciles the tasks visible at the current clock time.
	 *
	 * @return how many candidates were actually claimed and processed
	 */
	public int reconcile() {
		return reconcile(clock.instant());
	}

	/**
	 * Reconciles the tasks visible at {@code now}.
	 *
	 * @param now the selection time; must not be null
	 * @return how many candidates were actually claimed and processed
	 */
	public int reconcile(Instant now) {
		if (now == null) {
			throw new IllegalArgumentException("Reconciliation time must not be null");
		}
		taskService.recoverExpiredLeases();
		List<UUID> due = taskRepository.findDuePendingTaskIds(now,
				PageRequest.of(0, batchSize));
		int processed = 0;
		for (UUID taskId : due) {
			try {
				if (taskService.processTask(taskId) != null) {
					processed++;
				}
			}
			catch (RuntimeException taskFailure) {
				// Per-task isolation: one poison task must not abort the
				// remaining due tasks in this bounded run.
			}
		}
		return processed;
	}
}
