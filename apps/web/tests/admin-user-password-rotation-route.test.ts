import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const passwordPolicy = vi.hoisted(() => ({
  requireRotation: vi.fn(),
}));

const audit = vi.hoisted(() => ({
  recordSecurityAuditEvent: vi.fn(),
}));

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "admin-1",
      role: { id: 1, name: "admin" },
      username: "admin",
    },
  } as ForgePortalSession,
}));

vi.mock("@/lib/server/password-policy-state-repository", () => ({
  getPasswordPolicyStateRepository: () => passwordPolicy,
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: audit.recordSecurityAuditEvent,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
  requirePortalApiSession: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/admin/users/[userId]/password-rotation/route";

function request(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/user-1/password-rotation", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("admin user password rotation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a selected user for password rotation and records audit", async () => {
    const response = await POST(request({ reason: "legacy_weak_password" }), { params: Promise.resolve({ userId: "user-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, userId: "user-1" });
    expect(passwordPolicy.requireRotation).toHaveBeenCalledWith({
      reason: "legacy_weak_password",
      userId: "user-1",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        actorUsername: "admin",
        eventType: "admin_password_rotation_required",
        path: "/api/admin/users/user-1/password-rotation",
        statusCode: 200,
      }),
    );
  });

  it("uses a safe default reason without exposing raw operator notes", async () => {
    await POST(request({ reason: "please rotate password for owner@example.com" }), { params: Promise.resolve({ userId: "user-1" }) });

    expect(passwordPolicy.requireRotation).toHaveBeenCalledWith({
      reason: "admin_required_rotation",
      userId: "user-1",
    });
    expect(JSON.stringify(audit.recordSecurityAuditEvent.mock.calls)).not.toContain("owner@example.com");
  });
});
