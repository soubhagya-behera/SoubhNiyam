package com.soubhagya.policyimpactengine.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.soubhagya.policyimpactengine.audit.domain.AuditEventRepository;
import com.soubhagya.policyimpactengine.user.domain.RefreshTokenRepository;
import com.soubhagya.policyimpactengine.user.domain.UserRepository;

/**
 * Phase 18-B schema tests for Flyway V25–V27, retained after Google
 * sign-in was removed in Phase 21-C.
 *
 * <p>These migrations and their database objects must stay in place so
 * existing users, completion rows, and historical audit events remain
 * readable. The test proves V25–V27 apply cleanly: {@code
 * app_user.google_sub} is nullable with a partial unique index (any
 * number of NULL rows coexist, every non-null subject is globally
 * unique), the completion table carries its uniqueness/expiry guards,
 * and the audit {@code event_type} CHECK holds the historical Google
 * login code. No OAuth service behavior is exercised here.
 */
@SpringBootTest
@Testcontainers
class GoogleSchemaMigrationTest {

	@Container
	@ServiceConnection
	static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private RefreshTokenRepository refreshTokenRepository;

	@Autowired
	private AuditEventRepository auditEventRepository;

	@BeforeEach
	void clean() {
		auditEventRepository.deleteAll();
		jdbcTemplate.update("DELETE FROM auth_google_completion");
		refreshTokenRepository.deleteAll();
		userRepository.deleteAll();
	}

	@Test
	void v25ToV27MigrationsApply() {
		for (String version : new String[] { "25", "26", "27" }) {
			Integer applied = jdbcTemplate.queryForObject(
					"SELECT count(*) FROM flyway_schema_history WHERE version=? AND success=true",
					Integer.class, version);
			assertThat(applied).as("Migration V%s", version).isEqualTo(1);
		}
	}

	@Test
	void googleSubIsNullableWithPartialUniqueIndex() {
		String nullable = jdbcTemplate.queryForObject(
				"SELECT is_nullable FROM information_schema.columns "
						+ "WHERE table_name='app_user' AND column_name='google_sub'",
				String.class);
		assertThat(nullable).isEqualTo("YES");

		String predicate = jdbcTemplate.queryForObject(
				"SELECT pg_get_indexdef(indexrelid) FROM pg_index "
						+ "WHERE indexrelid='uq_app_user_google_sub'::regclass",
				String.class);
		assertThat(predicate).contains("WHERE (google_sub IS NOT NULL)");
	}

	@Test
	void duplicateGoogleSubIsRejectedAtTheDatabase() {
		insertIdentities("first@example.com", "duplicated-sub");
		assertThatThrownBy(() -> insertIdentities("second@example.com", "duplicated-sub"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void nullGoogleSubsCoexist() {
		insertIdentities("plain-one@example.com", null);
		insertIdentities("plain-two@example.com", null);

		Integer nullCount = jdbcTemplate.queryForObject(
				"SELECT count(*) FROM app_user WHERE google_sub IS NULL", Integer.class);
		assertThat(nullCount).isEqualTo(2);
	}

	@Test
	void completionTableCarriesUniquenessAndExpiryGuards() {
		assertThat(jdbcTemplate.queryForList(
				"SELECT conname FROM pg_constraint "
						+ "WHERE conrelid='auth_google_completion'::regclass "
						+ "AND contype IN ('p', 'f', 'u', 'c')",
				String.class))
				.contains("uq_auth_google_completion_hash",
						"chk_auth_google_completion_expiry");

		// Foreign key: an unknown owner is rejected.
		assertThatThrownBy(() -> jdbcTemplate.update(
				"INSERT INTO auth_google_completion (id, user_id, code_hash, created_at,"
						+ " expires_at) VALUES (gen_random_uuid(), gen_random_uuid(), ?,"
						+ " now(), now() + interval '1 minute')",
				"a".repeat(64)))
				.isInstanceOf(DataIntegrityViolationException.class);

		// Expiry guard: expiry must stay after creation.
		insertIdentities("guard@example.com", null);
		java.util.UUID ownerId = jdbcTemplate.queryForObject(
				"SELECT id FROM app_user WHERE email='guard@example.com'", java.util.UUID.class);
		assertThatThrownBy(() -> jdbcTemplate.update(
				"INSERT INTO auth_google_completion (id, user_id, code_hash, created_at,"
						+ " expires_at) VALUES (gen_random_uuid(), ?, ?, now(), now())",
				ownerId, "b".repeat(64)))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void auditCheckHoldsTheGoogleLoginCode() {
		String definition = jdbcTemplate.queryForObject(
				"SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname=?",
				String.class, "audit_event_event_type_check");
		assertThat(definition).contains("'AUTH_GOOGLE_LOGIN_SUCCEEDED'");
	}

	private void insertIdentities(String email, String googleSub) {
		jdbcTemplate.update(
				"INSERT INTO app_user (id, created_at, updated_at, email, google_sub)"
						+ " VALUES (gen_random_uuid(), now(), now(), ?, ?)",
				email, googleSub);
	}
}
