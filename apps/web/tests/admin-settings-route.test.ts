import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  portalApiSession: vi.fn(),
  portalSession: vi.fn<() => Promise<ForgePortalSession>>(),
  recordSecurityAuditEvent: vi.fn(),
  setRegistrationPaused: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: mocks.portalSession,
  requirePortalApiSession: mocks.portalApiSession,
}));

vi.mock("@/lib/server/platform-settings-repository", () => ({
  getPlatformSettingsRepository: () => ({
    getSettings: mocks.getSettings,
    setRegistrationPaused: mocks.setRegistrationPaused,
  }),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: mocks.recordSecurityAuditEvent,
}));

import { GET, PATCH } from "@/app/api/admin/settings/route";

function request(body?: unknown): NextRequest {
  return new NextRequest("https://forgath.ru/api/admin/settings", {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method: body === undefined ? "GET" : "PATCH",
  });
}

function sessionWithRole(role: string): ForgePortalSession {
  return {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "admin-1",
      role: { id: 1, name: role },
      username: "admin",
    },
  };
}

describe("admin settings route", () => {
  it("returns settings for admins", async () => {
    mocks.portalApiSession.mockResolvedValue(undefined);
    mocks.portalSession.mockResolvedValue(sessionWithRole("admin"));
    mocks.getSettings.mockResolvedValue({ registrationPaused: true });

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual({ settings: { registrationPaused: true } });
  });

  it("updates settings for admins and records audit", async () => {
    mocks.portalApiSession.mockResolvedValue(undefined);
    mocks.portalSession.mockResolvedValue(sessionWithRole("admin"));
    mocks.setRegistrationPaused.mockResolvedValue({ registrationPaused: false });

    const response = await PATCH(request({ registrationPaused: false }));

    await expect(response.json()).resolves.toEqual({ settings: { registrationPaused: false } });
    expect(mocks.setRegistrationPaused).toHaveBeenCalledWith(false, "admin-1");
    expect(mocks.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        eventType: "admin_settings_updated",
        path: "/api/admin/settings",
      }),
    );
  });

  it("rejects invalid payloads", async () => {
    mocks.portalApiSession.mockResolvedValue(undefined);
    mocks.portalSession.mockResolvedValue(sessionWithRole("admin"));

    const response = await PATCH(request({ registrationPaused: "no" }));

    expect(response.status).toBe(400);
  });
});
