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

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
  requirePortalApiSession: vi.fn(async () => {
    if (authSession.value.authenticated) return undefined;
    return Response.json({ authenticated: false, error: "Authentication required" }, { status: 401 });
  }),
}));

vi.stubEnv("NOF_PLATFORM_OAUTH_JWT_SECRET", "test-oauth-jwt-secret");
vi.stubEnv("NOF_HT_ORIGIN", "https://habit-tracker.forgath.ru");

import { DELETE, GET } from "@/app/api/profile/service-links/route";

function request(method = "GET", search = ""): NextRequest {
  return new NextRequest(`http://localhost/api/profile/service-links${search}`, { method });
}

describe("profile service links route", () => {
  beforeEach(() => {
    authSession.value = {
      authenticated: true,
      loginUrl: "/login",
      user: {
        experience: 0,
        id: "platform-user-1",
        username: "teanore",
      },
    };
    vi.restoreAllMocks();
  });

  it("requires platform authentication", async () => {
    authSession.value = { authenticated: false, loginUrl: "/login" };

    const response = await GET(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Authentication required" });
  });

  it("returns Habit Tracker link summary from the service contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        ok: true,
        link: {
          serviceKey: "nof-ht",
          serviceName: "Habit Tracker",
          status: "connected",
          accountEmail: "habit@example.com",
          accountLabel: "Habit User",
          linkedAt: "2026-06-11T10:00:00.000Z",
          canUnlink: true,
        },
      }),
    );

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      links: [
        {
          serviceKey: "nof-ht",
          serviceName: "Habit Tracker",
          status: "connected",
          accountEmail: "habit@example.com",
          accountLabel: "Habit User",
          linkedAt: "2026-06-11T10:00:00.000Z",
          canUnlink: true,
          openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://habit-tracker.forgath.ru/api/platform/links/habit-tracker");
    expect(init?.headers).toMatchObject({ Authorization: expect.stringMatching(/^Bearer [^.]+\.[^.]+\.[^.]+$/) });
  });

  it("returns unavailable status without leaking service errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ok: false, error: "db_down" }, { status: 503 }));

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      links: [
        {
          serviceKey: "nof-ht",
          serviceName: "Habit Tracker",
          status: "unavailable",
          canUnlink: false,
          openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
        },
      ],
    });
  });

  it("unlinks Habit Tracker through the service contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        ok: true,
        link: {
          serviceKey: "nof-ht",
          serviceName: "Habit Tracker",
          status: "not_connected",
          canUnlink: false,
        },
      }),
    );

    const response = await DELETE(request("DELETE", "?serviceKey=nof-ht"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      link: {
        serviceKey: "nof-ht",
        status: "not_connected",
        canUnlink: false,
      },
    });
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
