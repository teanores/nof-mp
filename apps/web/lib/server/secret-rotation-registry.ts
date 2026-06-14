export type SecretRiskLevel = "P0" | "P1" | "P2";
export type SecretRotationStatus = "needs-rotation" | "planned" | "ok" | "hold";
export type SecretRotationUatStatus = "pending" | "not-required" | "passed" | "blocked";

export interface SecretRotationRegistryItem {
  consumers: string[];
  lastRotatedAt: string | null;
  locationClass: string;
  nextReviewAt: string | null;
  owner: string;
  purpose: string;
  riskLevel: SecretRiskLevel;
  rotationStatus: SecretRotationStatus;
  runbookSlug: string;
  secretName: string;
  serviceKey: string;
  uatStatus: SecretRotationUatStatus;
}

const registrySeed: SecretRotationRegistryItem[] = [
  {
    consumers: ["nof-mp password reset", "nof-mp internal email endpoint"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "Password reset email delivery authorization token",
    riskLevel: "P0",
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_MP_EMAIL_WEBHOOK_TOKEN",
    serviceKey: "nof-mp",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp password reset SMTP delivery"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "SMTP provider account username for password reset delivery",
    riskLevel: "P0",
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_USER",
    serviceKey: "nof-mp",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp password reset SMTP delivery"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "SMTP provider app password for password reset delivery",
    riskLevel: "P0",
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "SMTP_PASS",
    serviceKey: "nof-mp",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp security audit ingest", "edge audit shipper"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-security-audit",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "Authorization token for sanitized edge security event ingestion",
    riskLevel: "P0",
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_SECURITY_AUDIT_INGEST_TOKEN",
    serviceKey: "nof-mp",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp OAuth token signer", "nof-tt OAuth callback", "nof-ht OAuth callback"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-oauth-secrets",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "NOF Platform OAuth JWT signing secret",
    riskLevel: "P0",
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_PLATFORM_OAUTH_JWT_SECRET",
    serviceKey: "nof-mp",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp legacy auth bridge", "nof-service legacy auth issuer"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret dragon-forge-secrets",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp / nof-service",
    purpose: "Legacy session token verification during identity migration",
    riskLevel: "P0",
    rotationStatus: "planned",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_AUTH_SECRET_KEY",
    serviceKey: "nof-mp",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-mp database access"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret postgres-secret",
    nextReviewAt: "2026-07-01",
    owner: "nof-infra / database",
    purpose: "PostgreSQL runtime role password for platform data access",
    riskLevel: "P0",
    rotationStatus: "hold",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "DB_PASS",
    serviceKey: "nof-mp",
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
