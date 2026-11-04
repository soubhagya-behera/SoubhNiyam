-- Policy Impact Engine
-- V28: durable fan-out tasks (Phase 6, Batch 1).
-- One PENDING task is created atomically with every persisted NEW_VERSION.
-- The task is history/state for downstream fan-out recovery only; it does not
-- alter observation, attempt, retry, or audit behaviour.

CREATE TABLE fan_out_task (
    id                 uuid        PRIMARY KEY,
    policy_id          uuid        NOT NULL REFERENCES policy (id),
    policy_version_id  uuid        NOT NULL REFERENCES policy_version (id),
    owner_user_id      uuid        NULL REFERENCES app_user (id),
    source_attempt_id  uuid        NULL REFERENCES policy_fetch_attempt (id) ON DELETE SET NULL,
    status             varchar(16) NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED')),
    attempt_count      integer     NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_retry_at      timestamptz NOT NULL,
    claim_token        uuid        NULL,
    lease_expires_at   timestamptz NULL,
    last_error         text        NULL,
    created_at         timestamptz NOT NULL,
    updated_at         timestamptz NOT NULL,
    completed_at       timestamptz NULL,
    CONSTRAINT uq_fan_out_task_policy_version UNIQUE (policy_version_id)
);

CREATE INDEX idx_fan_out_task_status_retry ON fan_out_task (status, next_retry_at);
CREATE INDEX idx_fan_out_task_policy ON fan_out_task (policy_id);
