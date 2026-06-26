import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authSession = vi.hoisted(() => ({
  value: {
    authenticated: true,
    loginUrl: "/login",
    user: {
      experience: 0,
      id: "user-1",
      username: "teanore",
    },
  },
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => authSession.value),
  requirePortalApiSession: vi.fn(async () => {
    if (authSession.value.authenticated) return undefined;
    return Response.json({ authenticated: false, error: "Authentication required" }, { status: 401 });
  }),
}));

import { DELETE } from "@/app/api/mcp-tokens/[tokenId]/route";
import { GET, POST } from "@/app/api/mcp-tokens/route";

function request(method = "GET", body?: Record<string, unknown>): NextRequest {
  return new NextRequest("https://forgath.ru/api/mcp-tokens", {
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
    method,
  });
}

describe("deprecated MCP token routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not list nof-mp-owned MCP tokens", async () => {
    const response = await GET(request());
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload).toEqual({
      error: "mcp_tokens_owned_by_nof_tt",
      mcpUrl: "https://task-tracker.forgath.ru/api/mcp",
      owner: "nof-tt",
    });
  });

  it("does not create MCP tokens from nof-mp", async () => {
    const response = await POST(request("POST", { name: "NOF TT" }));
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error).toBe("mcp_tokens_owned_by_nof_tt");
  });

  it("does not revoke MCP tokens from nof-mp", async () => {
    const response = await DELETE(request("DELETE"), { params: Promise.resolve({ tokenId: "token-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error).toBe("mcp_tokens_owned_by_nof_tt");
  });
});
