-- MANUAL-95EB7A94
-- Draft canonical-person identity alias schema.
-- Safe output policy: aggregate counts only; never select or print PII values.
-- Scope: local/staged migration evidence first. Production application requires owner approval.

BEGIN;

CREATE SCHEMA IF NOT EXISTS nof_platform;

CREATE TABLE IF NOT EXISTS nof_platform.canonical_person (
  id uuid PRIMARY KEY,
  lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'denied', 'merged', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS nof_platform.identity_alias (
  id uuid PRIMARY KEY,
  person_id uuid NOT NULL REFERENCES nof_platform.canonical_person (id),
  alias_kind text NOT NULL
    CHECK (alias_kind IN ('email', 'telegram_id', 'telegram_username', 'platform_user_id', 'nof_ht_user_id', 'nof_tt_user_id', 'messenger_id')),
  alias_provider text NOT NULL DEFAULT 'nof',
  alias_value_hash text NOT NULL,
  display_value text,
  verification_state text NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified', 'verified', 'service_placeholder', 'denied')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  CHECK (alias_value_hash <> ''),
  CHECK (display_value IS NULL OR length(display_value) <= 320)
);

CREATE UNIQUE INDEX IF NOT EXISTS identity_alias_active_unique_idx
  ON nof_platform.identity_alias (alias_kind, alias_provider, alias_value_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS identity_alias_person_idx
  ON nof_platform.identity_alias (person_id, alias_kind, claimed_at DESC);

CREATE TABLE IF NOT EXISTS nof_platform.identity_alias_event (
  id bigserial PRIMARY KEY,
  alias_id uuid REFERENCES nof_platform.identity_alias (id),
  person_id uuid REFERENCES nof_platform.canonical_person (id),
  event_type text NOT NULL
    CHECK (event_type IN ('claim', 'verify', 'link', 'unlink', 'supersede', 'deny')),
  actor_user_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_alias_event_person_idx
  ON nof_platform.identity_alias_event (person_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nof_platform.person_account_link (
  person_id uuid NOT NULL REFERENCES nof_platform.canonical_person (id),
  platform_user_id uuid NOT NULL,
  link_state text NOT NULL DEFAULT 'active'
    CHECK (link_state IN ('active', 'denied', 'superseded', 'archived')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid,
  PRIMARY KEY (person_id, platform_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS person_account_link_active_user_idx
  ON nof_platform.person_account_link (platform_user_id)
  WHERE link_state = 'active';

COMMIT;

SELECT
  (SELECT count(*) FROM nof_platform.canonical_person) AS canonical_person_count,
  (SELECT count(*) FROM nof_platform.identity_alias) AS identity_alias_count,
  (SELECT count(*) FROM nof_platform.person_account_link) AS person_account_link_count;
