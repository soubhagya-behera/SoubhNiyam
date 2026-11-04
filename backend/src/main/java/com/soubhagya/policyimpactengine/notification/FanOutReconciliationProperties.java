package com.soubhagya.policyimpactengine.notification;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Phase 6 Batch 3 — fan-out reconciliation configuration (see
 * DECISIONS.md ADR-016 refinement).
 *
 * <p>The feature flag defaults to {@code false}: reconciliation is the
 * only disabled path. Atomic task creation, manual checks, scheduled
 * observation fan-out, and the shared claim/process lifecycle remain
 * active regardless of this flag.
 */
@ConfigurationProperties(prefix = "fan-out.reconciliation")
public record FanOutReconciliationProperties(

		@DefaultValue("false") boolean enabled,
		@DefaultValue("PT5M") Duration interval,
		@DefaultValue("50") int batchSize

) {

	public FanOutReconciliationProperties {
		if (interval == null || interval.isZero() || interval.isNegative()) {
			throw new IllegalArgumentException("fan-out.reconciliation.interval must be positive");
		}
		if (batchSize < 1) {
			throw new IllegalArgumentException("fan-out.reconciliation.batch-size must be >= 1");
		}
	}
}
