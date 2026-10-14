CREATE TABLE screening_case (
    id               UUID          PRIMARY KEY,
    client_group_id  VARCHAR(64)   NOT NULL,
    party_name       VARCHAR(200)  NOT NULL,
    entity_type      VARCHAR(16)   NOT NULL,
    date_of_birth    DATE,
    country          CHAR(2),
    status           VARCHAR(20)   NOT NULL,
    outcome          VARCHAR(20),
    screening_count  INT           NOT NULL,
    opened_at        TIMESTAMP(6)  NOT NULL,
    last_screened_at TIMESTAMP(6),
    closed_at        TIMESTAMP(6),
    closed_by        VARCHAR(64),
    version          BIGINT        NOT NULL
);

CREATE INDEX ix_case_client_group ON screening_case (client_group_id);

CREATE TABLE case_match (
    id           UUID          PRIMARY KEY,
    case_id      UUID          NOT NULL REFERENCES screening_case (id),
    profile_id   VARCHAR(64)   NOT NULL,
    category     VARCHAR(20)   NOT NULL,
    matched_name VARCHAR(200)  NOT NULL,
    score        INT           NOT NULL,
    resolution   VARCHAR(20)   NOT NULL,
    rationale    VARCHAR(2000),
    resolved_by  VARCHAR(64),
    resolved_at  TIMESTAMP(6),
    CONSTRAINT uq_match_profile_per_case UNIQUE (case_id, profile_id)
);

CREATE TABLE idempotency_key (
    id              VARCHAR(200) PRIMARY KEY,
    client_group_id VARCHAR(64)  NOT NULL,
    case_id         UUID         NOT NULL REFERENCES screening_case (id),
    created_at      TIMESTAMP(6) NOT NULL
);

CREATE TABLE outbox_event (
    id              UUID          PRIMARY KEY,
    aggregate_id    UUID          NOT NULL,
    client_group_id VARCHAR(64)   NOT NULL,
    event_type      VARCHAR(64)   NOT NULL,
    payload         VARCHAR(8000) NOT NULL,
    occurred_at     TIMESTAMP(6)  NOT NULL,
    published_at    TIMESTAMP(6)
);

CREATE INDEX ix_outbox_unpublished ON outbox_event (published_at, occurred_at);
