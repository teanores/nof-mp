import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "platform-user-1",
      username: "teanore",
    },
  } as ForgePortalSession,
}));

const passwordRepository = vi.hoisted(() => ({
  changePassword: vi.fn(),
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
}));

vi.mock("@/lib/server/platform-password-repository", () => ({
  getPlatformPasswordRepository: vi.fn(() => passwordRepository),
}));

import { POST } from "@/app/api/profile/password/route";

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/profile/password", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("profile password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "platform-user-1",
        username: "teanore",
      },
    };
    passwordRepository.changePassword.mockResolvedValue({ ok: true });
  });

  it("requires an authenticated platform session", async () => {
    authSession.value = { authenticated: false, loginUrl: "/login" };

    const response = await POST(request({ currentPassword: "CurrentHorse1!", newPassword: "NextHorse22!" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });

  it("changes the current user's password without returning sensitive data", async () => {
    const response = await POST(
      request({
        currentPassword: "CurrentHorse1!",
        newPassword: "NextHorse22!",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(passwordRepository.changePassword).toHaveBeenCalledWith({
      currentPassword: "CurrentHorse1!",
      newPassword: "NextHorse22!",
      userId: "platform-user-1",
    });
  });

  it("returns a safe error for invalid current passwords", async () => {
    passwordRepository.changePassword.mockResolvedValue({ ok: false, reason: "invalid_current_password" });

    const response = await POST(request({ currentPassword: "wrong", newPassword: "NextHorse22!" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_current_password" });
  });
});
