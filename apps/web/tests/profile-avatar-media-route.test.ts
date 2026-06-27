import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMock = vi.hoisted(() => ({
  session: {
    authenticated: true,
    loginUrl: "/login",
    user: { experience: 0, id: "user-1", role: { id: 2, name: "user" }, username: "owner" },
  },
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalSessionFromRequest: vi.fn(async () => sessionMock.session),
}));

import { POST as readUrl } from "@/app/api/profile/avatar/read-url/route";
import { POST as uploadUrl } from "@/app/api/profile/avatar/upload-url/route";

function request(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("profile avatar media routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NOF_MEDIA_S3_ENDPOINT", "http://127.0.0.1:9000");
    vi.stubEnv("NOF_MEDIA_S3_REGION", "us-east-1");
    vi.stubEnv("NOF_MEDIA_S3_ACCESS_KEY_ID", "local-access");
    vi.stubEnv("NOF_MEDIA_S3_SECRET_ACCESS_KEY", "local-secret");
    vi.stubEnv("NOF_MEDIA_S3_BUCKET_NOF_MP", "nof-mp");
    sessionMock.session = {
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "user-1", role: { id: 2, name: "user" }, username: "owner" },
    };
  });

  it("creates a scoped presigned upload URL for valid avatar images", async () => {
    const response = await uploadUrl(
      request("https://forgath.ru/api/profile/avatar/upload-url", {
        contentType: "image/png",
        fileName: "avatar.png",
        magicBytesBase64: Buffer.from("89504e470d0a1a0a", "hex").toString("base64"),
        sizeBytes: 1024,
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.bucket).toBe("nof-mp");
    expect(payload.objectKey).toMatch(/^avatars\/user-1\/[0-9a-f-]+\.png$/);
    expect(payload.uploadUrl).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(JSON.stringify(payload)).not.toContain("local-secret");
  });

  it("rejects invalid avatar uploads before presigning", async () => {
    const response = await uploadUrl(
      request("https://forgath.ru/api/profile/avatar/upload-url", {
        contentType: "image/png",
        fileName: "avatar.png",
        magicBytesBase64: Buffer.from("ffd8ffe000", "hex").toString("base64"),
        sizeBytes: 1024,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "magic_mismatch" });
  });

  it("creates read URLs only for the signed-in user's avatar prefix", async () => {
    const own = await readUrl(request("https://forgath.ru/api/profile/avatar/read-url", { objectKey: "avatars/user-1/avatar.png" }));
    const other = await readUrl(request("https://forgath.ru/api/profile/avatar/read-url", { objectKey: "avatars/user-2/avatar.png" }));

    expect(own.status).toBe(200);
    expect((await own.json()).readUrl).toContain("/nof-mp/avatars/user-1/avatar.png");
    expect(other.status).toBe(404);
  });
});
