import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as confirmRegistration } from "@/app/api/public/registration/confirm/route";
import { POST as requestRegistration } from "@/app/api/public/registration/request/route";
import { resetRegistrationAbuseProtectionForTests } from "@/lib/server/registration-abuse-protection";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

const dnsMocks = vi.hoisted(() => ({
  resolveMx: vi.fn(async () => [{ exchange: "mail.example.com", priority: 10 }]),
}));

const settingsMocks = vi.hoisted(() => ({
  isRegistrationPaused: vi.fn(),
}));

const registrationMocks = vi.hoisted(() => ({
  confirmRegistration: vi.fn(),
  requestRegistration: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendRegistrationCodeEmail: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  default: { resolveMx: dnsMocks.resolveMx },
  resolveMx: dnsMocks.resolveMx,
}));

vi.mock("@/lib/server/email-delivery", () => ({
  sendRegistrationCodeEmail: emailMocks.sendRegistrationCodeEmail,
}));

vi.mock("@/lib/server/platform-registration-repository", () => ({
  getPlatformRegistrationRepository: () => ({
    confirmRegistration: registrationMocks.confirmRegistration,
    requestRegistration: registrationMocks.requestRegistration,
  }),
}));

vi.mock("@/lib/server/platform-settings-repository", () => ({
  getPlatformSettingsRepository: () => ({
    isRegistrationPaused: settingsMocks.isRegistrationPaused,
  }),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: vi.fn(),
}));

function formRequest(url: string, body: Record<string, string>): NextRequest {
  const formData = new URLSearchParams(body);

  return new NextRequest(url, {
    body: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

describe("public registration routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    dnsMocks.resolveMx.mockResolvedValue([{ exchange: "mail.example.com", priority: 10 }]);
    settingsMocks.isRegistrationPaused.mockResolvedValue(false);
    registrationMocks.requestRegistration.mockResolvedValue({ code: "123456", email: "owner@example.com", ok: true, reason: "code_created" });
    registrationMocks.confirmRegistration.mockResolvedValue({ ok: true, userId: "user-1" });
    emailMocks.sendRegistrationCodeEmail.mockResolvedValue(undefined);
    resetRegistrationAbuseProtectionForTests();
  });

  it("requests an email registration code through native nof-mp registration", async () => {
    const response = await requestRegistration(
      formRequest("http://localhost/api/public/registration/request", {
        email: " Owner@Example.COM ",
        password: "OwnerLocal123!",
        username: " owner ",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?step=confirm&email=owner%40example.com");
    expect(registrationMocks.requestRegistration).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "OwnerLocal123!",
      username: "owner",
    });
    expect(emailMocks.sendRegistrationCodeEmail).toHaveBeenCalledWith({ code: "123456", to: "owner@example.com" });
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "registration_attempt",
        loginIdentifier: expect.stringMatching(/^sha256:/),
        path: "/api/public/registration/request",
        statusCode: 202,
      }),
    );
    expect(JSON.stringify(vi.mocked(recordSecurityAuditEvent).mock.calls)).not.toContain("owner@example.com");
  });

  it("keeps registration failures controlled and owner-readable", async () => {
    registrationMocks.requestRegistration.mockResolvedValueOnce({ ok: false, reason: "conflict" });

    const response = await requestRegistration(
      formRequest("http://localhost/api/public/registration/request", {
        email: "owner@example.com",
        password: "OwnerLocal123!",
        username: "owner",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?error=conflict");
    expect(emailMocks.sendRegistrationCodeEmail).not.toHaveBeenCalled();
  });

  it("keeps registration paused without calling upstream", async () => {
    settingsMocks.isRegistrationPaused.mockResolvedValueOnce(true);

    const response = await requestRegistration(
      formRequest("http://localhost/api/public/registration/request", {
        email: "owner@example.com",
        password: "OwnerLocal123!",
        username: "owner",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?error=unavailable");
    expect(registrationMocks.requestRegistration).not.toHaveBeenCalled();
  });

  it("confirms an email registration code and redirects to login", async () => {
    const response = await confirmRegistration(
      formRequest("http://localhost/api/public/registration/confirm", {
        code: "123456",
        email: " Owner@Example.COM ",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?registered=1");
    expect(registrationMocks.confirmRegistration).toHaveBeenCalledWith({ code: "123456", email: "owner@example.com" });
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "registration_success",
        loginIdentifier: expect.stringMatching(/^sha256:/),
        path: "/api/public/registration/confirm",
        statusCode: 201,
      }),
    );
  });

  it("returns to the confirmation step when code confirmation fails", async () => {
    registrationMocks.confirmRegistration.mockResolvedValueOnce({ ok: false, reason: "invalid_or_expired_code" });

    const response = await confirmRegistration(
      formRequest("http://localhost/api/public/registration/confirm", {
        code: "000000",
        email: "owner@example.com",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?step=confirm&email=owner%40example.com&error=invalid");
  });

  it("rate limits repeated registration attempts by IP before upstream", async () => {
    for (let index = 0; index < 5; index += 1) {
      await requestRegistration(
        formRequest("http://localhost/api/public/registration/request", {
          email: `owner-${index}@example.com`,
          password: "OwnerLocal123!",
          username: `owner-${index}`,
        }),
      );
    }

    const response = await requestRegistration(
      formRequest("http://localhost/api/public/registration/request", {
        email: "owner-6@example.com",
        password: "OwnerLocal123!",
        username: "owner-6",
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(registrationMocks.requestRegistration).toHaveBeenCalledTimes(5);
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "registration_rate_limited",
        loginIdentifier: expect.stringMatching(/^sha256:/),
        statusCode: 429,
      }),
    );
  });

  it("rejects email addresses without MX records before upstream", async () => {
    dnsMocks.resolveMx.mockRejectedValueOnce(new Error("ENOTFOUND"));

    const response = await requestRegistration(
      formRequest("http://localhost/api/public/registration/request", {
        email: "owner@invalid.test",
        password: "OwnerLocal123!",
        username: "owner",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?error=invalid_email");
    expect(registrationMocks.requestRegistration).not.toHaveBeenCalled();
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "registration_invalid_email",
        loginIdentifier: expect.stringMatching(/^sha256:/),
        statusCode: 400,
      }),
    );
  });
});
