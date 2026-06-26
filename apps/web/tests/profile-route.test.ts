import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "user-1",
      username: "owner",
    },
  } as ForgePortalSession,
}));

const profileRepository = vi.hoisted(() => ({
  updateOwnProfile: vi.fn(),
}));

const audit = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn(),
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
}));

vi.mock("@/lib/server/platform-profile-repository", () => ({
  getPlatformProfileRepository: vi.fn(() => profileRepository),
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: audit.recordSecurityAuditEvent,
}));

import { PATCH } from "@/app/api/profile/route";

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/profile", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

describe("profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "user-1",
        username: "owner",
      },
    };
    profileRepository.updateOwnProfile.mockResolvedValue({
      ok: true,
      profile: { aboutMe: "Updated", id: "user-1", username: "Owner" },
    });
  });

  it("requires an authenticated platform session", async () => {
    authSession.value = { authenticated: false, loginUrl: "/login" };

    const response = await PATCH(request({ username: "Owner" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
    expect(profileRepository.updateOwnProfile).not.toHaveBeenCalled();
  });

  it("updates only the signed-in user's own profile and records sanitized audit", async () => {
    const response = await PATCH(request({ aboutMe: "Updated", userId: "other-user", username: "Owner" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      profile: { aboutMe: "Updated", id: "user-1", username: "Owner" },
    });
    expect(profileRepository.updateOwnProfile).toHaveBeenCalledWith({
      aboutMe: "Updated",
      userId: "user-1",
      username: "Owner",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        actorUsername: "Owner",
        eventType: "profile_updated",
        method: "PATCH",
        path: "/api/profile",
        statusCode: 200,
      }),
    );
    expect(JSON.stringify(audit.recordSecurityAuditEvent.mock.calls)).not.toContain("Updated");
    expect(JSON.stringify(audit.recordSecurityAuditEvent.mock.calls)).not.toContain("other-user");
  });

  it("returns a safe validation error for invalid profile data", async () => {
    profileRepository.updateOwnProfile.mockResolvedValue({ ok: false, reason: "invalid_username" });

    const response = await PATCH(request({ username: "x" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_username" });
    expect(audit.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
