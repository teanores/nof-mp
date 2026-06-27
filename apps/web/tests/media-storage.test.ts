import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildMediaObjectKey,
  createPresignedMediaUrl,
  validateImageUploadRequest,
} from "@/lib/server/media-storage";

describe("shared media storage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts png, jpeg and webp only when extension, mime and magic bytes match", () => {
    expect(
      validateImageUploadRequest({
        contentType: "image/png",
        fileName: "avatar.png",
        magicBytes: Buffer.from("89504e470d0a1a0a", "hex"),
        sizeBytes: 1024,
      }),
    ).toEqual({ extension: "png", ok: true });

    expect(
      validateImageUploadRequest({
        contentType: "image/jpeg",
        fileName: "avatar.jpg",
        magicBytes: Buffer.from("ffd8ffe000", "hex"),
        sizeBytes: 1024,
      }),
    ).toEqual({ extension: "jpg", ok: true });

    expect(
      validateImageUploadRequest({
        contentType: "image/webp",
        fileName: "avatar.webp",
        magicBytes: Buffer.from("524946460000000057454250", "hex"),
        sizeBytes: 1024,
      }),
    ).toEqual({ extension: "webp", ok: true });
  });

  it("rejects oversize, mismatched and unsupported uploads", () => {
    expect(
      validateImageUploadRequest({
        contentType: "image/png",
        fileName: "avatar.png",
        magicBytes: Buffer.from("ffd8ffe000", "hex"),
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: "magic_mismatch" });

    expect(
      validateImageUploadRequest({
        contentType: "image/svg+xml",
        fileName: "avatar.svg",
        magicBytes: Buffer.from("<svg"),
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: "unsupported_type" });

    expect(
      validateImageUploadRequest({
        contentType: "image/png",
        fileName: "avatar.png",
        magicBytes: Buffer.from("89504e470d0a1a0a", "hex"),
        sizeBytes: 5 * 1024 * 1024 + 1,
      }),
    ).toEqual({ ok: false, reason: "too_large" });
  });

  it("creates user-scoped avatar object keys", () => {
    const key = buildMediaObjectKey({ extension: "png", userId: "user/1" });

    expect(key).toMatch(/^avatars\/user-1\/[0-9a-f-]+\.png$/);
  });

  it("creates S3-compatible presigned URLs without exposing the secret key", () => {
    vi.stubEnv("NOF_MEDIA_S3_ENDPOINT", "http://127.0.0.1:9000");
    vi.stubEnv("NOF_MEDIA_S3_REGION", "us-east-1");
    vi.stubEnv("NOF_MEDIA_S3_ACCESS_KEY_ID", "local-access");
    vi.stubEnv("NOF_MEDIA_S3_SECRET_ACCESS_KEY", "local-secret");
    vi.stubEnv("NOF_MEDIA_S3_BUCKET_NOF_MP", "nof-mp");

    const url = createPresignedMediaUrl({
      contentType: "image/png",
      method: "PUT",
      objectKey: "avatars/user-1/avatar.png",
      now: new Date("2026-06-27T16:30:00.000Z"),
    });

    expect(url).toContain("http://127.0.0.1:9000/nof-mp/avatars/user-1/avatar.png");
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Expires=300");
    expect(url).not.toContain("local-secret");
  });
});
