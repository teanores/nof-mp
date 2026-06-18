import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

export type SecretRiskLevel = "P0" | "P1" | "P2";
export type SecretRotationStatus = "needs-rotation" | "planned" | "ok" | "hold";
export type SecretRotationUatStatus = "pending" | "not-required" | "passed" | "blocked";
export type SecretRegistrySource = "manual" | "k8s" | "db" | "vault";

export interface SecretRotationRegistryItem {
  consumers: string[];
  daysUntilRotation: number | null;
  lastRotatedAt: string | null;
  locationClass: string;
  nextRotationDueAt: string | null;
  nextReviewAt: string | null;
  owner: string;
  purpose: string;
  riskLevel: SecretRiskLevel;
  rotationPeriodDays: number | null;
  rotationStatus: SecretRotationStatus;
  runbookSlug: string;
  secretName: string;
  serviceKey: string;
  source: SecretRegistrySource;
  uatStatus: SecretRotationUatStatus;
}

interface SecretRotationRegistryRow extends QueryResultRow {
  consumers: string[];
  last_rotated_at: Date | string | null;
  location_class: string;
  next_review_at: Date | string | null;
  next_rotation_due_at: Date | string | null;
  owner: string;
  purpose: string;
  risk_level: SecretRiskLevel;
  rotation_period_days: number | null;
  rotation_status: SecretRotationStatus;
  runbook_slug: string;
  secret_name: string;
  service_key: string;
  source: SecretRegistrySource;
  uat_status: SecretRotationUatStatus;
}

interface SecretRotationRegistryPool {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

type SecretRotationRegistrySeed = Omit<SecretRotationRegistryItem, "daysUntilRotation">;

function schemaName(): string {
  return process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

function toDateOnly(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function daysBetween(today: Date, dueDate: string | null): number | null {
  if (!dueDate) {
    return null;
  }

  const [year, month, day] = dueDate.split("-").map(Number);
  const due = Date.UTC(year, month - 1, day);
  const current = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.ceil((due - current) / 86_400_000);
}

function toRegistryItem(row: SecretRotationRegistryRow, today: Date): SecretRotationRegistryItem {
  const nextRotationDueAt = toDateOnly(row.next_rotation_due_at);

  return {
    consumers: row.consumers ?? [],
    daysUntilRotation: daysBetween(today, nextRotationDueAt),
    lastRotatedAt: toDateOnly(row.last_rotated_at),
    locationClass: row.location_class,
    nextReviewAt: toDateOnly(row.next_review_at),
    nextRotationDueAt,
    owner: row.owner,
    purpose: row.purpose,
    riskLevel: row.risk_level,
    rotationPeriodDays: row.rotation_period_days,
    rotationStatus: row.rotation_status,
    runbookSlug: row.runbook_slug,
    secretName: row.secret_name,
    serviceKey: row.service_key,
    source: row.source,
    uatStatus: row.uat_status,
  };
}

const registrySeed: SecretRotationRegistrySeed[] = [
  {
    consumers: ["nof-mp password reset", "nof-mp internal email endpoint"],
    lastRotatedAt: "2026-06-18",
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextRotationDueAt: "2026-07-18",
    nextReviewAt: "2026-07-18",
    owner: "nof-mp",
    purpose: "Password reset email delivery authorization token",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "ok",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_MP_EMAIL_WEBHOOK_TOKEN",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "passed",
  },
  {
    consumers: ["nof-mp password reset SMTP delivery"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextRotationDueAt: null,
    nextReviewAt: "2026-07-18",
    owner: "nof-mp",
    purpose: "SMTP provider account username for password reset delivery",
    riskLevel: "P2",
    rotationPeriodDays: null,
    rotationStatus: "ok",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_USER",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "not-required",
  },
  {
    consumers: ["nof-mp password reset SMTP delivery"],
    lastRotatedAt: "2026-06-18",
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextRotationDueAt: "2026-07-18",
    nextReviewAt: "2026-07-18",
    owner: "nof-mp",
    purpose: "SMTP provider app password for password reset delivery",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "ok",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_PASS",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "passed",
  },
  {
    consumers: ["nof-mp security audit ingest", "edge audit shipper"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-security-audit",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "Authorization token for sanitized edge security event ingestion",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_SECURITY_AUDIT_INGEST_TOKEN",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp OAuth token signer", "nof-tt OAuth callback", "nof-ht OAuth callback"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-oauth-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "NOF Platform OAuth JWT signing secret",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_PLATFORM_OAUTH_JWT_SECRET",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp legacy auth bridge", "nof-service legacy auth issuer"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret dragon-forge-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp / nof-service",
    purpose: "Legacy session token verification during identity migration",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_AUTH_SECRET_KEY",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp database access"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret postgres-secret",
    nextRotationDueAt: null,
    nextReviewAt: "2026-07-01",
    owner: "nof-infra / database",
    purpose: "PostgreSQL runtime role password for platform data access",
    riskLevel: "P0",
    rotationPeriodDays: null,
    rotationStatus: "hold",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "DB_PASS",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "blocked",
  },
  {
    consumers: ["nof-mp MCP token issue UI", "nof-tt MCP token verification"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp runtime secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "HMAC key for platform-issued MCP token hashes",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_PLATFORM_MCP_TOKEN_SECRET",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-tt OAuth callback", "nof-tt platform callback token verification"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret forge-tasks-oauth-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-tt",
    purpose: "NOF Platform OAuth JWT verification secret for Task Tracker",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "oauth-identity-env-contract",
    secretName: "NOF_PLATFORM_OAUTH_JWT_SECRET",
    serviceKey: "nof-tt",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-tt OAuth callback", "nof-mp OAuth token endpoint"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret forge-tasks-oauth-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-tt / nof-mp",
    purpose: "OAuth client secret for Task Tracker product login",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "oauth-identity-env-contract",
    secretName: "NOF_TT_OAUTH_CLIENT_SECRET",
    serviceKey: "nof-tt",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-tt MCP server"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret task-tracker runtime secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-tt",
    purpose: "HMAC key for Task Tracker MCP token validation during migration",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "mcp-ownership-and-project-scope",
    secretName: "NOF_TT_MCP_TOKEN_SECRET",
    serviceKey: "nof-tt",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-tt bot-to-tracker API"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret task-tracker runtime secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-tt",
    purpose: "API key for bot-to-Task-Tracker service authentication",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_TT_BOT_API_KEY",
    serviceKey: "nof-tt",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-tt database access", "nof-tt MCP service"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret postgres-secret",
    nextRotationDueAt: null,
    nextReviewAt: "2026-07-01",
    owner: "nof-infra / database / nof-tt",
    purpose: "PostgreSQL runtime role password for Task Tracker data access",
    riskLevel: "P0",
    rotationPeriodDays: null,
    rotationStatus: "hold",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "DB_PASS",
    serviceKey: "nof-tt",
    source: "manual",
    uatStatus: "blocked",
  },
  {
    consumers: ["nof-ht platform OAuth callback"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-oauth-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht / nof-mp",
    purpose: "OAuth client secret for Habit Tracker product login",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "oauth-identity-env-contract",
    secretName: "NOF_PLATFORM_CLIENT_SECRET",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht platform OAuth callback", "nof-ht platform link API"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-oauth-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht / nof-mp",
    purpose: "JWT verification contract for NOF Platform OAuth tokens in Habit Tracker",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "oauth-identity-env-contract",
    secretName: "NOF_PLATFORM_JWT_SECRET",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht NextAuth session encryption/signing"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht",
    purpose: "NextAuth secret for Habit Tracker sessions",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NEXTAUTH_SECRET",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht database access"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-secrets",
    nextRotationDueAt: null,
    nextReviewAt: "2026-07-01",
    owner: "nof-infra / database / nof-ht",
    purpose: "PostgreSQL connection string for Habit Tracker",
    riskLevel: "P0",
    rotationPeriodDays: null,
    rotationStatus: "hold",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "DATABASE_URL",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "blocked",
  },
  {
    consumers: ["nof-ht sentinel/linking Telegram webhook"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht",
    purpose: "Telegram token for @nof_sentinel_bot identity/linking flows after platform login",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "td-12-split-bots-plan",
    secretName: "TELEGRAM_NOF_SENTINEL_BOT_TOKEN",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht sentinel/linking Telegram webhook"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht",
    purpose: "Webhook secret for @nof_sentinel_bot identity/linking callbacks",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "td-12-split-bots-plan",
    secretName: "TELEGRAM_NOF_SENTINEL_BOT_WEBHOOK_SECRET",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht habit/product Telegram webhook", "shared public NOF bot integration"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-habit-bot-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht / shared NOF bot",
    purpose: "Telegram token for @naragothal_bot product/community integration",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "td-12-split-bots-plan",
    secretName: "TELEGRAM_HABIT_BOT_TOKEN",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht habit/product Telegram webhook", "shared public NOF bot integration"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-habit-bot-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht / shared NOF bot",
    purpose: "Webhook secret for @naragothal_bot product/community callbacks",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "td-12-split-bots-plan",
    secretName: "TELEGRAM_HABIT_BOT_WEBHOOK_SECRET",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht email delivery"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht",
    purpose: "SMTP provider account username for Habit Tracker email delivery",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_USER",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht email delivery"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht",
    purpose: "SMTP app password/token for Habit Tracker email delivery",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_PASS",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["legacy nof-service web auth bridge"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret dragon-forge-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-service / nof-mp",
    purpose: "Legacy HS256 JWT secret while nof-service remains in migration bridge",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SECRET_KEY",
    serviceKey: "nof-service",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["legacy bots", "legacy nof-service bot API"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret dragon-forge-secrets / bot-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-service",
    purpose: "Legacy X-API-Key for bot-to-legacy-service authentication",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "BOT_API_KEY",
    serviceKey: "nof-service",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["legacy nof-service database access"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret dragon-forge-secrets / postgres-secret",
    nextRotationDueAt: null,
    nextReviewAt: "2026-07-01",
    owner: "nof-infra / database / nof-service",
    purpose: "PostgreSQL runtime role password for legacy nof-service",
    riskLevel: "P0",
    rotationPeriodDays: null,
    rotationStatus: "hold",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "DB_PASS",
    serviceKey: "nof-service",
    source: "manual",
    uatStatus: "blocked",
  },
  {
    consumers: ["nof-mp edge audit ingestion", "Caddy edge audit shipper"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret / edge host environment",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-infra / nof-mp",
    purpose: "Bearer token for sanitized edge security event ingestion",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "caddy-edge-security-audit-ingestion",
    secretName: "NOF_SECURITY_AUDIT_INGEST_TOKEN",
    serviceKey: "nof-infra",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["hbl release-builder"],
    lastRotatedAt: null,
    locationClass: "hbl release-builder host config",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-infra",
    purpose: "GitHub access token for release-builder source fetch operations",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "github-runner-release-builder",
    secretName: "NOF_RELEASE_GITHUB_TOKEN",
    serviceKey: "nof-infra",
    source: "manual",
    uatStatus: "pending",
  },
];

export class SecretRotationRegistryRepository {
  private initialized = false;

  constructor(
    private readonly pool: SecretRotationRegistryPool = new Pool({ connectionString: platformDatabaseUrl("NOF Platform secret rotation registry"), max: 3 }),
    private readonly schema = schemaName(),
    private readonly now = () => new Date(),
  ) {}

  async listRegistry(): Promise<SecretRotationRegistryItem[]> {
    await this.initialize();
    const result = await this.pool.query<SecretRotationRegistryRow>(
      `SELECT
         service_key,
         secret_name,
         purpose,
         owner,
         location_class,
         consumers,
         risk_level,
         source,
         rotation_status,
         last_rotated_at,
         rotation_period_days,
         next_rotation_due_at,
         next_review_at,
         uat_status,
         runbook_slug
       FROM ${this.schema}.secret_rotation_registry
       ORDER BY
         CASE risk_level WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,
         service_key ASC,
         secret_name ASC`,
    );
    return result.rows.map((row) => toRegistryItem(row, this.now()));
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.secret_rotation_registry (
        service_key TEXT NOT NULL,
        secret_name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        owner TEXT NOT NULL,
        location_class TEXT NOT NULL,
        consumers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        risk_level TEXT NOT NULL CHECK (risk_level IN ('P0', 'P1', 'P2')),
        source TEXT NOT NULL CHECK (source IN ('manual', 'k8s', 'db', 'vault')),
        rotation_status TEXT NOT NULL CHECK (rotation_status IN ('needs-rotation', 'planned', 'ok', 'hold')),
        last_rotated_at DATE,
        rotation_period_days INTEGER CHECK (rotation_period_days IS NULL OR rotation_period_days > 0),
        next_rotation_due_at DATE,
        next_review_at DATE,
        uat_status TEXT NOT NULL CHECK (uat_status IN ('pending', 'not-required', 'passed', 'blocked')),
        runbook_slug TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (service_key, secret_name),
        CHECK (secret_name !~* '(value|hash|preview|fragment)$')
      )
    `);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS secret_rotation_registry_status_idx
       ON ${this.schema}.secret_rotation_registry(rotation_status, risk_level, next_rotation_due_at)`,
    );
    await this.seedDefaultRegistry();
    this.initialized = true;
  }

  private async seedDefaultRegistry(): Promise<void> {
    for (const item of registrySeed) {
      await this.pool.query(
        `INSERT INTO ${this.schema}.secret_rotation_registry (
           service_key,
           secret_name,
           purpose,
           owner,
           location_class,
           consumers,
           risk_level,
           source,
           rotation_status,
           last_rotated_at,
           rotation_period_days,
           next_rotation_due_at,
           next_review_at,
           uat_status,
           runbook_slug,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11, $12::date, $13::date, $14, $15, NOW())
         ON CONFLICT (service_key, secret_name)
         DO UPDATE SET
           purpose = EXCLUDED.purpose,
           owner = EXCLUDED.owner,
           location_class = EXCLUDED.location_class,
           consumers = EXCLUDED.consumers,
           risk_level = EXCLUDED.risk_level,
           source = EXCLUDED.source,
           rotation_status = EXCLUDED.rotation_status,
           rotation_period_days = EXCLUDED.rotation_period_days,
           next_rotation_due_at = EXCLUDED.next_rotation_due_at,
           next_review_at = EXCLUDED.next_review_at,
           uat_status = EXCLUDED.uat_status,
           runbook_slug = EXCLUDED.runbook_slug,
           updated_at = NOW()`,
        [
          item.serviceKey,
          item.secretName,
          item.purpose,
          item.owner,
          item.locationClass,
          item.consumers,
          item.riskLevel,
          item.source,
          item.rotationStatus,
          item.lastRotatedAt,
          item.rotationPeriodDays,
          item.nextRotationDueAt,
          item.nextReviewAt,
          item.uatStatus,
          item.runbookSlug,
        ],
      );
    }
  }
}

let repository: SecretRotationRegistryRepository | undefined;

export function getSecretRotationRegistryRepository(): SecretRotationRegistryRepository {
  repository ??= new SecretRotationRegistryRepository();
  return repository;
}
