package com.soubhagya.policyimpactengine.notification.domain;

import java.time.Instant;
import java.util.UUID;

import com.soubhagya.policyimpactengine.policy.domain.Policy;
import com.soubhagya.policyimpactengine.policy.domain.PolicyVersion;
import com.soubhagya.policyimpactengine.user.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;

@Entity
@Table(name = "fan_out_task", uniqueConstraints = @UniqueConstraint(
		name = "uq_fan_out_task_policy_version", columnNames = { "policy_version_id" }))
@Getter
public class FanOutTask {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(nullable = false, updatable = false)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "policy_id", nullable = false, updatable = false)
	private Policy policy;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "policy_version_id", nullable = false, updatable = false)
	private PolicyVersion policyVersion;

	@ManyToOne(fetch = FetchType.LAZY, optional = true)
	@JoinColumn(name = "owner_user_id", nullable = true, updatable = false)
	private User owner;

	@Column(name = "source_attempt_id", nullable = true, updatable = false)
	private UUID sourceAttemptId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private FanOutTaskStatus status;

	@Column(name = "attempt_count", nullable = false)
	private int attemptCount;

	@Column(name = "next_retry_at", nullable = false)
	private Instant nextRetryAt;

	@Column(name = "claim_token", nullable = true)
	private UUID claimToken;

	@Column(name = "lease_expires_at", nullable = true)
	private Instant leaseExpiresAt;

	@Column(name = "last_error", nullable = true, columnDefinition = "TEXT")
	private String lastError;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Column(name = "completed_at", nullable = true)
	private Instant completedAt;

	protected FanOutTask() {
		// Required by JPA.
	}

	public FanOutTask(Policy policy, PolicyVersion policyVersion, User owner,
			UUID sourceAttemptId, Instant now) {
		if (policy == null) {
			throw new IllegalArgumentException("Policy must not be null for fan-out task creation");
		}
		if (policyVersion == null) {
			throw new IllegalArgumentException("Policy version must not be null unless the database allows it");
		}
		if (now == null) {
			throw new IllegalArgumentException("Now must not be null");
		}
		this.policy = policy;
		this.policyVersion = policyVersion;
		this.owner = owner;
		this.sourceAttemptId = sourceAttemptId;
		this.status = FanOutTaskStatus.PENDING;
		this.attemptCount = 0;
		this.nextRetryAt = now;
		this.createdAt = now;
		this.updatedAt = now;
	}
}