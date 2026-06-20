import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as confirmRegistration } from "@/app/api/public/registration/confirm/route";
import { POST as requestRegistration } from "@/app/api/public/registration/request/route";

function formRequest(url: string, body: Record<string, string>): NextRequest {
  const formData = new URLSearchParams(body);

  return new NextRequest(url, {
    body: formData,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

describe("public registration routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requests an email registration code through the internal nof-service boundary", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const response = await requestRegistration(
      formRequest("http://localhost/api/public/registration/request", {
        email: " Owner@Example.COM ",
        password: "OwnerLocal123!",
        username: " owner ",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?step=confirm&email=owner%40example.com");
    expect(fetch).toHaveBeenCalledWith("http://nof-service-internal:5000/api/public/registration/request", {
      body: JSON.stringify({ email: "owner@example.com", password: "OwnerLocal123!", username: "owner" }),
      headers: { "content-type": "application/json" },
      method: "POST",
      redirect: "manual",
    });
  });

  it("keeps registration failures controlled and owner-readable", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 409 }));

    const response = await requestRegistration(
      formRequest("http://localhost/api/public/registration/request", {
        email: "owner@example.com",
        password: "OwnerLocal123!",
        username: "owner",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?error=conflict");
  });

  it("confirms an email registration code and redirects to login", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const response = await confirmRegistration(
      formRequest("http://localhost/api/public/registration/confirm", {
        code: "123456",
        email: " Owner@Example.COM ",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?registered=1");
    expect(fetch).toHaveBeenCalledWith("http://nof-service-internal:5000/api/public/registration/confirm", {
      body: JSON.stringify({ code: "123456", email: "owner@example.com" }),
      headers: { "content-type": "application/json" },
      method: "POST",
      redirect: "manual",
    });
  });

  it("returns to the confirmation step when code confirmation fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 400 }));

    const response = await confirmRegistration(
      formRequest("http://localhost/api/public/registration/confirm", {
        code: "000000",
        email: "owner@example.com",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?step=confirm&email=owner%40example.com&error=invalid");
  });
});
