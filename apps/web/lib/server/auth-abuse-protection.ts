interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function bucketFor(key: string, windowMs: number, now: number): Bucket {
  const current = buckets.get(key);
  if (current && current.resetAt > now) {
    return current;
  }
  const next = { count: 0, resetAt: now + windowMs };
  buckets.set(key, next);
  return next;
}

function secondsUntil(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export function authRateLimit(
  key: string,
  options: { limit: number; now?: number; windowMs: number },
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = options.now ?? Date.now();
  const bucket = bucketFor(key, options.windowMs, now);
  bucket.count += 1;
  if (bucket.count > options.limit) {
    return { allowed: false, retryAfter: secondsUntil(bucket.resetAt, now) };
  }
  return { allowed: true };
}

export function resetAuthAbuseProtectionForTests(): void {
  buckets.clear();
}
