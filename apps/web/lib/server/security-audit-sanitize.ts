import type { EdgeEventClassification } from "@/lib/server/security-audit-types";

const sensitiveQueryKeys = new Set(["access_token", "auth", "code", "cookie", "key", "password", "secret", "session", "token"]);

const suspiciousPathFragments = [
  "/.env",
  "/.git",
  "/adminer",
  "/cgi-bin",
  "/phpmyadmin",
  "/vendor",
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
];

export function maskLoginIdentifier(identifier: string): string | undefined {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return undefined;
  }

  const [local, domain] = trimmed.split("@");
  if (domain) {
    const first = local[0] ?? "*";
    const last = local.length > 2 ? local[local.length - 1] : "";
    return `${first}*${last ? `**${last}` : ""}@${domain.toLowerCase()}`;
  }

  if (trimmed.length <= 2) {
    return `${trimmed[0] ?? "*"}*`;
  }
  return `${trimmed[0]}***${trimmed[trimmed.length - 1]}`;
}

export function sanitizePath(path = "/"): string {
  let parsed: URL;
  try {
    parsed = new URL(path, "http://portal.local");
  } catch {
    return "/";
  }

  for (const key of Array.from(parsed.searchParams.keys())) {
    if (sensitiveQueryKeys.has(key.toLowerCase())) {
      parsed.searchParams.set(key, "[redacted]");
    }
  }

  return `${parsed.pathname}${parsed.search}`;
}

export function summarizeUserAgent(userAgent = ""): string {
  const value = userAgent.toLowerCase();
  if (!value) {
    return "unknown";
  }
  if (value.includes("curl")) {
    return "curl";
  }
  if (value.includes("chrome")) {
    return "Chrome";
  }
  if (value.includes("firefox")) {
    return "Firefox";
  }
  if (value.includes("safari")) {
    return "Safari";
  }
  if (value.includes("edge")) {
    return "Edge";
  }
  if (value.includes("bot") || value.includes("spider") || value.includes("crawler")) {
    return "bot";
  }
  return userAgent.slice(0, 40);
}

export function classifyEdgeRequest({ path, status }: { path?: string; status?: number }): EdgeEventClassification {
  const safePath = sanitizePath(path).toLowerCase();
  if (suspiciousPathFragments.some((fragment) => safePath.startsWith(fragment))) {
    return "suspicious_scan";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 401 || status === 403) {
    return "forbidden";
  }
  if (status === 404 && safePath.startsWith("/api/")) {
    return "unknown_api";
  }
  if (status === 404) {
    return "not_found";
  }
  if (status === 307 || status === 308) {
    return "protected_redirect";
  }
  return "normal";
}
