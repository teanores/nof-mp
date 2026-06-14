import { describe, expect, it, vi } from "vitest";

import type { ForgePortalSession } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  listRegistry: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  portalPageSession: vi.fn<() => Promise<ForgePortalSession>>(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  requirePortalPageSession: mocks.portalPageSession,
}));

vi.mock("@/lib/server/secret-rotation-registry", () => ({
  getSecretRotationRegistryRepository: () => ({ listRegistry: mocks.listRegistry }),
}));

import AdminSecretsRoute from "@/app/admin/secrets/page";

function sessionWithRole(role: string): ForgePortalSession {
  return {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "u-1",
      role: { id: 1, name: role },
      username: role,
    },
  };
}

describe("admin secrets route", () => {
  it("renders registry for admins", async () => {
    mocks.portalPageSession.mockResolvedValue(sessionWithRole("admin"));
    mocks.listRegistry.mockResolvedValue([]);

    const result = await AdminSecretsRoute();

    expect(result.type.name).toBe("AdminSecretsPage");
    expect(result.props.registry).toEqual([]);
  });

  it("returns not found for moderators", async () => {
    mocks.portalPageSession.mockResolvedValue(sessionWithRole("moderator"));

    await expect(AdminSecretsRoute()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
