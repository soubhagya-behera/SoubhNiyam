package com.soubhagya.policyimpactengine.notification;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Phase 6 Batch 3 — binds the reconciliation settings that the
 * conditional scheduler and reconciliation service consume.
 */
@Configuration
@EnableConfigurationProperties(FanOutReconciliationProperties.class)
public class FanOutReconciliationConfiguration {
}
