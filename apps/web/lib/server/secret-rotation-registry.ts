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

const registrySeed: SecretRotationRegistryItem[] = [
  {
    consumers: ["nof-mp password reset", "nof-mp internal email endpoint"],
    daysUntilRotation: 17,
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "Password reset email delivery authorization token",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_MP_EMAIL_WEBHOOK_TOKEN",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp password reset SMTP delivery"],
    daysUntilRotation: 17,
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "SMTP provider account username for password reset delivery",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_USER",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp password reset SMTP delivery"],
    daysUntilRotation: 17,
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "SMTP provider app password for password reset delivery",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_PASS",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp security audit ingest", "edge audit shipper"],
    daysUntilRotation: 17,
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
    daysUntilRotation: 17,
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
    daysUntilRotation: 17,
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
    daysUntilRotation: null,
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
];

export class SecretRotationRegistryRepository {
  async listRegistry(): Promise<SecretRotationRegistryItem[]> {
    return registrySeed.map((item) => ({ ...item, consumers: [...item.consumers] }));
  }
}

let repository: SecretRotationRegistryRepository | undefined;

export function getSecretRotationRegistryRepository(): SecretRotationRegistryRepository {
  repository ??= new SecretRotationRegistryRepository();
  return repository;
}
