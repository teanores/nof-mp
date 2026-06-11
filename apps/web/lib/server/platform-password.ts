import crypto from "node:crypto";

export type PlatformPasswordPolicyError =
  | "password_common"
  | "password_contains_identity"
  | "password_disallowed_character"
  | "password_digit"
  | "password_lowercase"
  | "password_min_length"
  | "password_symbol"
  | "password_uppercase";

const minPasswordLength = 12;
const defaultIterations = 29000;
const commonPasswords = new Set(["123456", "12345678", "123456789", "password", "password123", "qwerty", "qwerty123", "admin", "admin123", "dragonforge", "forgath", "teanore"]);

function passlibBase64Encode(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, ".").replace(/=+$/g, "");
}

function passlibBase64Decode(value: string): Buffer {
  const normalized = value.replace(/\./g, "+");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function derivePassword(password: string, salt: Buffer, iterations: number): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
}

export function verifyPlatformPassword(password: string, hash: string): boolean {
  try {
    const [, algorithm, iterationsValue, saltValue, digestValue] = hash.split("$");
    if (algorithm !== "pbkdf2-sha256" || !iterationsValue || !saltValue || !digestValue) {
      return false;
    }

    const iterations = Number(iterationsValue);
    if (!Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    const expected = passlibBase64Decode(digestValue);
    const actual = derivePassword(password, passlibBase64Decode(saltValue), iterations);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashPlatformPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const digest = derivePassword(password, salt, defaultIterations);
  return `$pbkdf2-sha256$${defaultIterations}$${passlibBase64Encode(salt)}$${passlibBase64Encode(digest)}`;
}

export function platformPasswordPolicyErrors(
  password: string,
  identity: { email?: string | null; username?: string | null } = {},
): PlatformPasswordPolicyError[] {
  const normalizedPassword = password;
  const lowerPassword = normalizedPassword.toLowerCase();
  const errors: PlatformPasswordPolicyError[] = [];

  if (normalizedPassword.length < minPasswordLength) errors.push("password_min_length");
  if (/[\s`]/.test(normalizedPassword)) errors.push("password_disallowed_character");
  if (commonPasswords.has(lowerPassword)) errors.push("password_common");
  if (!/[a-z]/.test(normalizedPassword)) errors.push("password_lowercase");
  if (!/[A-Z]/.test(normalizedPassword)) errors.push("password_uppercase");
  if (!/\d/.test(normalizedPassword)) errors.push("password_digit");
  if (!/[^A-Za-z0-9]/.test(normalizedPassword)) errors.push("password_symbol");

  const username = identity.username?.trim().toLowerCase() ?? "";
  const emailLocal = identity.email?.trim().toLowerCase().split("@", 1)[0] ?? "";
  for (const forbidden of [username, emailLocal]) {
    if (forbidden.length >= 3 && lowerPassword.includes(forbidden)) {
      errors.push("password_contains_identity");
      break;
    }
  }

  return errors;
}
