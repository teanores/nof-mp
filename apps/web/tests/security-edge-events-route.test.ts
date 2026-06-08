import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/admin/security/edge-events/route";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

vi.mock("@/lib/server/security-audit-dashboard", () => ({
  recordSecurityAuditEvent: vi.fn(),
}));

function request(body: string, token?: string): NextRequest {
  return new NextRequest("http://portal.local/api/admin/security/edge-events", {
    body,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-length": String(Buffer.byteLength(body)),
    },
    method: "POST",
  });
}

describe("security edge events route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOF_SECURITY_AUDIT_INGEST_TOKEN = "test-token";
  });

  it("hides the endpoint when token is missing", async () => {
    const response = await POST(request("", undefined));

    expect(response.status).toBe(404);
    expect(recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("records sanitized Caddy events when token is valid", async () => {
    const response = await POST(
      request(
        JSON.stringify({
          request: { headers: { "User-Agent": ["curl/8.5.0"] }, method: "GET", remote_ip: "203.0.113.9", uri: "/.git/config?password=secret" },
          status: 404,
        }),
        "test-token",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ accepted: 1 });
    expect(recordSecurityAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "edge_suspicious_scan",
        ip: "203.0.113.9",
        path: "/.git/config?password=%5Bredacted%5D",
      }),
    );
    expect(JSON.stringify(vi.mocked(recordSecurityAuditEvent).mock.calls)).not.toContain("secret");
  });

  it("rejects invalid JSON payload", async () => {
    const response = await POST(request("{", "test-token"));

    expect(response.status).toBe(400);
    expect(recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
