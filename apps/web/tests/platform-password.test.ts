import { describe, expect, it } from "vitest";

import { hashPlatformPassword, platformPasswordPolicyErrors, verifyPlatformPassword } from "@/lib/server/platform-password";

const passlibHash =
  "$pbkdf2-sha256$29000$9T5n7J3z/h8jJITwXksJgQ$FfzSIRrHpUVkmCQUGJ7NDJ2/DEPhZXw52HPQDFhBZq0";

describe("platform password", () => {
  it("verifies existing passlib pbkdf2_sha256 hashes from the legacy user table", () => {
    expect(verifyPlatformPassword("CorrectHorse1!", passlibHash)).toBe(true);
    expect(verifyPlatformPassword("WrongHorse1!", passlibHash)).toBe(false);
  });

  it("generates hashes accepted by the same verifier without storing plain passwords", () => {
    const hash = hashPlatformPassword("CorrectHorse1!");

    expect(hash).toMatch(/^\$pbkdf2-sha256\$29000\$/);
    expect(hash).not.toContain("CorrectHorse1!");
    expect(verifyPlatformPassword("CorrectHorse1!", hash)).toBe(true);
  });

  it("mirrors the shared platform password policy", () => {
    expect(platformPasswordPolicyErrors("short", { email: "teanore@example.com", username: "teanore" })).toContain(
      "password_min_length",
    );
    expect(platformPasswordPolicyErrors("correcthorse1!", { email: "teanore@example.com", username: "teanore" })).toContain(
      "password_uppercase",
    );
    expect(platformPasswordPolicyErrors("CorrectHorse!!", { email: "teanore@example.com", username: "teanore" })).toContain(
      "password_digit",
    );
    expect(platformPasswordPolicyErrors("CorrectHorse11", { email: "teanore@example.com", username: "teanore" })).toContain(
      "password_symbol",
    );
    expect(platformPasswordPolicyErrors("TeanoreStrong1!", { email: "teanore@example.com", username: "teanore" })).toContain(
      "password_contains_identity",
    );
    expect(platformPasswordPolicyErrors("CorrectHorse1!", { email: "teanore@example.com", username: "teanore" })).toEqual([]);
  });
});
