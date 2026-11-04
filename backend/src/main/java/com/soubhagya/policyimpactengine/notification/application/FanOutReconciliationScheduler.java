package com.soubhagya.policyimpactengine.notification.application;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Phase 6 Batch 3 — scheduled entry point for fan-out reconciliation.
 *
 * <p>Only this background scheduler is gated by
 * {@code fan-out.reconciliation.enabled} (default {@code false}). Task
 * creation, manual checks, scheduled observation fan-out, and the shared
 * claim/process lifecycle stay active when reconciliation is disabled.
 */
@Component
@ConditionalOnProperty(prefix = "fan-out.reconciliation", name = "enabled",
		havingValue = "true")
public class FanOutReconciliationScheduler {

	private final FanOutReconciliationService reconciliationService;

	public FanOutReconciliationScheduler(
			FanOutReconciliationService reconciliationService) {
		if (reconciliationService == null) {
			throw new IllegalArgumentException(
					"Fan-out reconciliation service must not be null");
		}
		this.reconciliationService = reconciliationService;
	}

	@Scheduled(fixedDelayString = "${fan-out.reconciliation.interval:PT5M}")
	public void reconcile() {
		reconciliationService.reconcile();
	}
}
