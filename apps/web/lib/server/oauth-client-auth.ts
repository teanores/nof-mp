import { createHash, timingSafeEqual } from "node:crypto";

function secretHashEnvName(clientId: string): string {
  const suffix = clientId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `NOF_PLATFORM_OAUTH_CLIENT_SECRET_SHA256_${suffix}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authenticateOAuthClient(clientId: string, clientSecret: string): boolean {
  const expectedHash = process.env[secretHashEnvName(clientId)];
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash) || !clientSecret) {
    return false;
  }

  const actualHash = createHash("sha256").update(clientSecret).digest("hex");
  return safeEqual(actualHash, expectedHash.toLowerCase());
}
