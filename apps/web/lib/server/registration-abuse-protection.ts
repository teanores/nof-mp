import crypto from "node:crypto";
import { resolveMx } from "node:dns/promises";

import type { NextRequest } from "next/server";

import { summarizeUserAgent } from "@/lib/server/security-audit-sanitize";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

const ipLimit = 5;
const ipWindowMs = 60 * 60 * 1000;
const emailLimit = 3;
const emailWindowMs = 24 * 60 * 60 * 1000;

interface Bucket {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, Bucket>();
const emailBuckets = new Map<string, Bucket>();

function bucketFor(store: Map<string, Bucket>, key: string, windowMs: number, now: number): Bucket {
  const current = store.get(key);
  if (current && current.resetAt > now) {
    return current;
  }
  const next = { count: 0, resetAt: now + windowMs };
  store.set(key, next);
  return next;
}

function secondsUntil(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export function clientIpFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function hashRegistrationEmail(email: string): string {
  return `sha256:${crypto.createHash("sha256").update(email).digest("hex").slice(0, 24)}`;
}

export async function hasEmailMxRecord(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.trim();
  if (!domain) {
    return false;
  }
  try {
    return (await resolveMx(domain)).length > 0;
  } catch {
    return false;
  }
}

export function registrationRateLimit(email: string, ip: string, now = Date.now()): { allowed: true } | { allowed: false; retryAfter: number; reason: "email" | "ip" } {
  const ipBucket = bucketFor(ipBuckets, ip, ipWindowMs, now);
  const emailBucket = bucketFor(emailBuckets, email, emailWindowMs, now);
  ipBucket.count += 1;
  emailBucket.count += 1;

  if (ipBucket.count > ipLimit) {
    return { allowed: false, reason: "ip", retryAfter: secondsUntil(ipBucket.resetAt, now) };
  }
  if (emailBucket.count > emailLimit) {
    return { allowed: false, reason: "email", retryAfter: secondsUntil(emailBucket.resetAt, now) };
  }
  return { allowed: true };
}

export async function recordRegistrationAudit(
  request: NextRequest,
  input: {
    email: string;
    eventType: "registration_attempt" | "registration_invalid_email" | "registration_rate_limited" | "registration_success";
    statusCode: number;
  },
): Promise<void> {
  await recordSecurityAuditEvent({
    eventType: input.eventType,
    ip: clientIpFromRequest(request),
    loginIdentifier: hashRegistrationEmail(input.email),
    method: "POST",
    path: request.nextUrl.pathname,
    statusCode: input.statusCode,
    userAgent: summarizeUserAgent(request.headers.get("user-agent") ?? undefined),
  });
}

export function resetRegistrationAbuseProtectionForTests(): void {
  ipBuckets.clear();
  emailBuckets.clear();
}
