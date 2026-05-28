import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST as introspectSession } from "@/app/api/auth/session/introspect/route";

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/session/introspect", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("session introspection API", () => {
  it("fails closed for missing platform auth", async () => {
    const response = await introspectSession(jsonRequest({ action: "task.write", productKey: "nof-tt" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      active: false,
      allowed: false,
      error: "Authentication required",
      productKey: "nof-tt",
    });
  });

  it("requires a product key", async () => {
    const response = await introspectSession(jsonRequest({ action: "task.write" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      active: false,
      allowed: false,
      error: "invalid_request",
    });
  });
});
