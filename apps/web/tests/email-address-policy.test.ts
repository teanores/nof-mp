import { describe, expect, it } from "vitest";

import { isResettableEmail, isServiceEmail, isTelegramPlaceholderEmail, normalizePlatformEmail } from "@/lib/server/email-address-policy";

describe("email address policy", () => {
  it("normalizes platform emails for lookup and delivery", () => {
    expect(normalizePlatformEmail(" Owner@Example.COM ")).toBe("owner@example.com");
  });

  it("treats telegram placeholder domains as service emails, not user mailboxes", () => {
    for (const email of [
      "251740038@telegram.example.com",
      "251740038@telegram.forgath.ru",
      "1000320432telegram.forgath.ru",
      "user614815689forgath.ru",
    ]) {
      expect(isTelegramPlaceholderEmail(email)).toBe(true);
      expect(isServiceEmail(email)).toBe(true);
      expect(isResettableEmail(email)).toBe(false);
    }
  });

  it("keeps real-looking mailbox domains resettable, including forgath until mail hosting is finalized", () => {
    for (const email of ["owner@proton.me", "owner@ya.ru", "owner@yandex.ru", "owner@forgath.ru"]) {
      expect(isResettableEmail(email)).toBe(true);
    }
  });
});
