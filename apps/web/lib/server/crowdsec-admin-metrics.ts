import type { SecurityAuditDashboard, SecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

type CrowdSecSignalType = "forbidden" | "rate_limited" | "suspicious_scan";

export interface CrowdSecAdminMetrics {
  byType: Array<{ count: number; label: string; type: CrowdSecSignalType }>;
  consoleUrl?: string;
  generatedAt: string;
  recentTimeline: Array<{
    bucket: string;
    createdAt: string;
    label: string;
    statusCode: number;
  }>;
  topSourceBuckets: Array<{ bucket: string; count: number }>;
  totalSignals: number;
}

function signalType(event: SecurityAuditEvent): CrowdSecSignalType | undefined {
  if (event.classification === "rate_limited" || event.statusCode === 429) {
    return "rate_limited";
  }
  if (event.classification === "forbidden" || event.statusCode === 401 || event.statusCode === 403) {
    return "forbidden";
  }
  if (event.classification === "suspicious_scan") {
    return "suspicious_scan";
  }
  return undefined;
}

function bucketIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return "unknown";
}

function safeConsoleUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return undefined;
    }
    if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(parsed.hostname)) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function crowdSecMetricsFromDashboard(dashboard: SecurityAuditDashboard, consoleUrl = process.env.CROWDSEC_CONSOLE_URL): CrowdSecAdminMetrics {
  const signals = dashboard.recentEvents
    .map((event) => ({ event, type: signalType(event) }))
    .filter((item): item is { event: SecurityAuditEvent; type: CrowdSecSignalType } => Boolean(item.type));

  const counts = new Map<CrowdSecSignalType, number>();
  const sourceBuckets = new Map<string, number>();
  for (const { event, type } of signals) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
    const bucket = bucketIp(event.ip);
    sourceBuckets.set(bucket, (sourceBuckets.get(bucket) ?? 0) + 1);
  }

  const labels: Record<CrowdSecSignalType, string> = {
    forbidden: "Запреты",
    rate_limited: "Ограничения",
    suspicious_scan: "Сканы",
  };

  return {
    byType: (["rate_limited", "forbidden", "suspicious_scan"] as const)
      .map((type) => ({ count: counts.get(type) ?? 0, label: labels[type], type }))
      .filter((item) => item.count > 0),
    consoleUrl: safeConsoleUrl(consoleUrl),
    generatedAt: dashboard.generatedAt,
    recentTimeline: signals.slice(0, 8).map(({ event }) => ({
      bucket: bucketIp(event.ip),
      createdAt: event.createdAt,
      label: event.activityLabel,
      statusCode: event.statusCode,
    })),
    topSourceBuckets: [...sourceBuckets.entries()]
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5),
    totalSignals: signals.length,
  };
}
