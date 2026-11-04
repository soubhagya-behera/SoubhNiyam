package com.soubhagya.policyimpactengine.notification.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FanOutTaskRepository extends JpaRepository<FanOutTask, UUID> {

	Optional<FanOutTask> findByPolicyVersion_Id(UUID policyVersionId);

	@Query("""
			SELECT t.id FROM FanOutTask t
			WHERE t.status = 'PENDING'
			  AND t.nextRetryAt <= :now
			ORDER BY t.nextRetryAt ASC, t.id ASC
			""")
	List<UUID> findDuePendingTaskIds(@Param("now") Instant now, Pageable pageable);

	@Modifying(clearAutomatically = true)
	@Query("""
			UPDATE FanOutTask t
			SET t.status = 'PROCESSING',
			    t.claimToken = :token,
			    t.leaseExpiresAt = :leaseExpiresAt,
			    t.attemptCount = t.attemptCount + 1,
			    t.updatedAt = :now
			WHERE t.id = :id
			  AND t.status = 'PENDING'
			  AND t.nextRetryAt <= :now
			  AND (t.claimToken IS NULL OR t.leaseExpiresAt < :now)
			""")
	int claim(@Param("id") UUID id, @Param("token") UUID token,
			@Param("leaseExpiresAt") Instant leaseExpiresAt, @Param("now") Instant now);

	@Modifying(clearAutomatically = true)
	@Query("""
			UPDATE FanOutTask t
			SET t.status = 'COMPLETED',
			    t.completedAt = :now,
			    t.updatedAt = :now,
			    t.claimToken = NULL,
			    t.leaseExpiresAt = NULL
			WHERE t.id = :id AND t.claimToken = :token
			""")
	int complete(@Param("id") UUID id, @Param("token") UUID token, @Param("now") Instant now);

	@Modifying(clearAutomatically = true)
	@Query("""
			UPDATE FanOutTask t
			SET t.status = :status,
			    t.nextRetryAt = :nextRetryAt,
			    t.lastError = :lastError,
			    t.updatedAt = :now,
			    t.claimToken = NULL,
			    t.leaseExpiresAt = NULL
			WHERE t.id = :id AND t.claimToken = :token
			""")
	int fail(@Param("id") UUID id, @Param("token") UUID token,
			@Param("status") FanOutTaskStatus status,
			@Param("nextRetryAt") Instant nextRetryAt, @Param("lastError") String lastError,
			@Param("now") Instant now);

	@Modifying(clearAutomatically = true)
	@Query("""
			UPDATE FanOutTask t
			SET t.status = 'CANCELLED',
			    t.lastError = :reason,
			    t.updatedAt = :now,
			    t.claimToken = NULL,
			    t.leaseExpiresAt = NULL
			WHERE t.id = :id AND t.claimToken = :token
			""")
	int cancel(@Param("id") UUID id, @Param("token") UUID token, @Param("reason") String reason,
			@Param("now") Instant now);

	@Modifying(clearAutomatically = true)
	@Query("""
			UPDATE FanOutTask t
			SET t.leaseExpiresAt = :leaseExpiresAt,
			    t.updatedAt = :now
			WHERE t.id = :id AND t.claimToken = :token AND t.status = 'PROCESSING'
			""")
	int renewLease(@Param("id") UUID id, @Param("token") UUID token,
			@Param("leaseExpiresAt") Instant leaseExpiresAt, @Param("now") Instant now);

	@Modifying(clearAutomatically = true)
	@Query("""
			UPDATE FanOutTask t
			SET t.status = 'CANCELLED',
			    t.lastError = :reason,
			    t.updatedAt = :now,
			    t.claimToken = NULL,
			    t.leaseExpiresAt = NULL
			WHERE t.policy.id = :policyId
			  AND t.status IN ('PENDING', 'PROCESSING')
			""")
	int cancelOutstandingByPolicyId(@Param("policyId") UUID policyId,
			@Param("reason") String reason, @Param("now") Instant now);
}