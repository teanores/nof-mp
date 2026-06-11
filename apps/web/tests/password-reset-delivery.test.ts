import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordResetDelivery, passwordResetUrl } from "@/lib/server/password-reset-delivery";

describe("password reset delivery", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NOF_MP_EMAIL_WEBHOOK_TOKEN;
    delete process.env.NOF_MP_EMAIL_WEBHOOK_URL;
    process.env.NEXT_PUBLIC_PLATFORM_ORIGIN = "https://forgath.ru";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("builds reset links from the public platform origin", () => {
    expect(passwordResetUrl("raw-token")).toBe("https://forgath.ru/password-reset?token=raw-token");
  });

  it("does not call an email provider when webhook env is not configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      new PasswordResetDelivery().sendResetLink({
        email: "owner@example.com",
        expiresAt: new Date("2026-06-11T11:00:00.000Z"),
        resetToken: "raw-token",
        userId: "user-1",
      }),
    ).resolves.toEqual({ mode: "not_configured", ok: true });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a protected webhook request when provider env is configured", async () => {
    process.env.NOF_MP_EMAIL_WEBHOOK_URL = "https://email.internal/send";
    process.env.NOF_MP_EMAIL_WEBHOOK_TOKEN = "delivery-token";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);

    await expect(
      new PasswordResetDelivery().sendResetLink({
        email: "owner@example.com",
        expiresAt: new Date("2026-06-11T11:00:00.000Z"),
        resetToken: "raw-token",
        userId: "user-1",
      }),
    ).resolves.toEqual({ mode: "http_webhook", ok: true });

    expect(fetch).toHaveBeenCalledWith(
      "https://email.internal/send",
      expect.objectContaining({
        body: JSON.stringify({
          expiresAt: "2026-06-11T11:00:00.000Z",
          kind: "password_reset",
          resetUrl: "https://forgath.ru/password-reset?token=raw-token",
          to: "owner@example.com",
          userId: "user-1",
        }),
        headers: {
          Authorization: "Bearer delivery-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("fails closed when the configured provider rejects delivery", async () => {
    process.env.NOF_MP_EMAIL_WEBHOOK_URL = "https://email.internal/send";
    process.env.NOF_MP_EMAIL_WEBHOOK_TOKEN = "delivery-token";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);

    await expect(
      new PasswordResetDelivery().sendResetLink({
        email: "owner@example.com",
        expiresAt: new Date("2026-06-11T11:00:00.000Z"),
        resetToken: "raw-token",
        userId: "user-1",
      }),
    ).rejects.toThrow("password_reset_delivery_failed");
  });
});
