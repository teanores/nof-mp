import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const passwordResetRepository = vi.hoisted(() => ({
  confirmReset: vi.fn(),
  requestReset: vi.fn(),
}));

const passwordResetDelivery = vi.hoisted(() => ({
  sendResetLink: vi.fn(),
}));

vi.mock("@/lib/server/platform-password-reset-repository", () => ({
  getPlatformPasswordResetRepository: vi.fn(() => passwordResetRepository),
  normalizePasswordResetEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock("@/lib/server/password-reset-delivery", () => ({
  getPasswordResetDelivery: vi.fn(() => passwordResetDelivery),
}));

import { POST as confirmReset } from "@/app/api/public/password-reset/confirm/route";
import { POST as requestReset } from "@/app/api/public/password-reset/request/route";

function request(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("public password reset routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    passwordResetRepository.requestReset.mockResolvedValue({ ok: true, reason: "missing_or_unresettable" });
    passwordResetRepository.confirmReset.mockResolvedValue({ ok: true });
    passwordResetDelivery.sendResetLink.mockResolvedValue({ mode: "not_configured", ok: true });
  });

  it("returns a uniform request response without exposing account state or reset tokens", async () => {
    passwordResetRepository.requestReset.mockResolvedValue({
      expiresAt: new Date("2026-06-11T11:00:00.000Z"),
      ok: true,
      reason: "token_created",
      resetToken: "raw-reset-token",
      userId: "user-1",
    });

    const response = await requestReset(request("http://localhost/api/public/password-reset/request", { email: " Owner@Example.COM " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.",
    });
    expect(passwordResetRepository.requestReset).toHaveBeenCalledWith({ email: "owner@example.com" });
    expect(passwordResetDelivery.sendResetLink).toHaveBeenCalledWith({
      email: "owner@example.com",
      expiresAt: new Date("2026-06-11T11:00:00.000Z"),
      resetToken: "raw-reset-token",
      userId: "user-1",
    });
    expect(console.info).toHaveBeenCalledWith("NOF password reset delivery outcome", {
      event: "password_reset_delivery",
      outcome: "not_configured",
      userId: "user-1",
    });
  });

  it("records a delivered outcome when the email provider accepts the reset link", async () => {
    passwordResetRepository.requestReset.mockResolvedValue({
      expiresAt: new Date("2026-06-11T11:00:00.000Z"),
      ok: true,
      reason: "token_created",
      resetToken: "raw-reset-token",
      userId: "user-1",
    });
    passwordResetDelivery.sendResetLink.mockResolvedValue({ mode: "http_webhook", ok: true });

    const response = await requestReset(request("http://localhost/api/public/password-reset/request", { email: "owner@example.com" }));

    expect(response.status).toBe(200);
    expect(console.info).toHaveBeenCalledWith("NOF password reset delivery outcome", {
      event: "password_reset_delivery",
      outcome: "delivered",
      userId: "user-1",
    });
  });

  it("does not call delivery when the email is missing or unresettable", async () => {
    const response = await requestReset(request("http://localhost/api/public/password-reset/request", { email: "missing@example.com" }));

    expect(response.status).toBe(200);
    expect(passwordResetDelivery.sendResetLink).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith("NOF password reset delivery outcome", {
      event: "password_reset_delivery",
      outcome: "not_requested",
      userId: undefined,
    });
  });

  it("keeps the public request response uniform when delivery fails", async () => {
    passwordResetRepository.requestReset.mockResolvedValue({
      expiresAt: new Date("2026-06-11T11:00:00.000Z"),
      ok: true,
      reason: "token_created",
      resetToken: "raw-reset-token",
      userId: "user-1",
    });
    passwordResetDelivery.sendResetLink.mockRejectedValue(new Error("password_reset_delivery_failed"));

    const response = await requestReset(request("http://localhost/api/public/password-reset/request", { email: "owner@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.",
    });
    expect(console.warn).toHaveBeenCalledWith("NOF password reset delivery failed", {
      event: "password_reset_delivery",
      outcome: "failed",
      userId: "user-1",
    });
  });

  it("confirms a reset token without returning sensitive data", async () => {
    const response = await confirmReset(
      request("http://localhost/api/public/password-reset/confirm", {
        newPassword: "NextHorse22!",
        token: "raw-reset-token",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(passwordResetRepository.confirmReset).toHaveBeenCalledWith({
      newPassword: "NextHorse22!",
      token: "raw-reset-token",
    });
  });

  it("clears any existing portal session after a successful reset", async () => {
    const response = await confirmReset(
      request("http://localhost/api/public/password-reset/confirm", {
        newPassword: "NextHorse22!",
        token: "raw-reset-token",
      }),
    );

    const cookies = response.headers.getSetCookie();

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^auth_token=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=lax$/),
        expect.stringMatching(
          /^auth_token=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=lax; Domain=forgath\.ru$/,
        ),
        expect.stringMatching(
          /^auth_token=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=lax; Domain=\.forgath\.ru$/,
        ),
      ]),
    );
  });

  it("returns a safe error for invalid or expired tokens", async () => {
    passwordResetRepository.confirmReset.mockResolvedValue({ ok: false, reason: "invalid_or_expired_token" });

    const response = await confirmReset(
      request("http://localhost/api/public/password-reset/confirm", {
        newPassword: "NextHorse22!",
        token: "stale-token",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_or_expired_token" });
  });
});
