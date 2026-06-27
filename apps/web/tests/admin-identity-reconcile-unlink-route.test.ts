import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const canonicalIdentityRepository = vi.hoisted(() => ({
  unlinkPlatformUser: vi.fn(),
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

vi.mock("@/lib/server/canonical-identity-repository", () => ({
  getCanonicalIdentityRepository: () => canonicalIdentityRepository,
}));

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: audit.recordSecurityAuditEvent,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
  requirePortalApiSession: vi.fn(async () => {
    if (authSession.value.authenticated) return undefined;
    return Response.json({ authenticated: false, error: "Authentication required" }, { status: 401 });
  }),
}));

import { POST } from "@/app/api/admin/identity/reconcile/unlink/route";

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/identity/reconcile/unlink", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("admin identity reconciliation unlink route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canonicalIdentityRepository.unlinkPlatformUser.mockResolvedValue({ ok: true, personId: "person-1", platformUserId: "user-2" });
  });

  it("archives a selected account link through the canonical identity repository", async () => {
    const response = await POST(request({ personId: "person-1", platformUserId: "user-2" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, personId: "person-1", platformUserId: "user-2" });
    expect(canonicalIdentityRepository.unlinkPlatformUser).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      personId: "person-1",
      platformUserId: "user-2",
    });
    expect(audit.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "admin_identity_reconciliation_unlinked" }));
  });

  it("requires person and platform user ids", async () => {
    const response = await POST(request({ personId: "person-1" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "link_required" });
    expect(canonicalIdentityRepository.unlinkPlatformUser).not.toHaveBeenCalled();
  });
});
