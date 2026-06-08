import { timingSafeEqual } from "node:crypto";

import { classifyEdgeRequest, sanitizePath, summarizeUserAgent } from "@/lib/server/security-audit-sanitize";
import type { SecurityAuditEventInput, SecurityAuditEventType } from "@/lib/server/security-audit-types";

const maxBatchSize = 200;

interface CaddyAccessLogEntry {
  request?: {
    headers?: Record<string, string[] | string | undefined>;
    method?: string;
    remote_ip?: string;
    uri?: string;
  };
  status?: number;
}

function firstHeader(headers: Record<string, string[] | string | undefined> | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function eventTypeFor(path: string, statusCode: number): SecurityAuditEventType {
  const classification = classifyEdgeRequest({ path, status: statusCode });
  if (classification === "suspicious_scan") {
    return "edge_suspicious_scan";
  }
  if (classification === "rate_limited") {
    return "edge_rate_limited";
  }
  if (classification === "forbidden") {
    return "edge_forbidden";
  }
  if (classification === "not_found" || classification === "unknown_api") {
    return "edge_not_found";
  }
  return "edge_request";
}

export function isValidIngestToken(candidate: string | null, expected = process.env.NOF_SECURITY_AUDIT_INGEST_TOKEN): boolean {
  if (!candidate || !expected) {
    return false;
  }

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function parseCaddyAccessLogEntry(entry: CaddyAccessLogEntry): SecurityAuditEventInput | undefined {
  const request = entry.request;
  if (!request?.uri) {
    return undefined;
  }

  const path = sanitizePath(request.uri);
  const statusCode = Number.isFinite(entry.status) ? Number(entry.status) : 0;
  return {
    eventType: eventTypeFor(path, statusCode),
    ip: request.remote_ip,
    method: request.method ?? "GET",
    path,
    statusCode,
    userAgent: summarizeUserAgent(firstHeader(request.headers, "User-Agent")),
  };
}

export function parseCaddyAccessLogPayload(payload: string): SecurityAuditEventInput[] {
  const trimmed = payload.trim();
  if (!trimmed) {
    return [];
  }

  const rawEntries = trimmed.startsWith("[") ? (JSON.parse(trimmed) as unknown[]) : trimmed.split(/\r?\n/).map((line) => JSON.parse(line));
  return rawEntries
    .slice(0, maxBatchSize)
    .map((entry) => parseCaddyAccessLogEntry(entry as CaddyAccessLogEntry))
    .filter((event): event is SecurityAuditEventInput => Boolean(event));
}

export function extractBearerToken(header: string | null): string | null {
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice("bearer ".length).trim();
}
