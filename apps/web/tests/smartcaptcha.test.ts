import { afterEach, describe, expect, it, vi } from "vitest";

import { verifySmartCaptchaToken } from "@/lib/server/smartcaptcha";

describe("Yandex SmartCaptcha server validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("bypasses validation when CAPTCHA_DISABLED is enabled", async () => {
    vi.stubEnv("CAPTCHA_DISABLED", "true");
    vi.stubGlobal("fetch", vi.fn());

    await expect(verifySmartCaptchaToken({ ip: "203.0.113.10", token: "" })).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts the local mocked token without a real Yandex key", async () => {
    vi.stubEnv("CAPTCHA_DISABLED", "false");
    vi.stubEnv("YANDEX_CAPTCHA_SERVER_KEY", "test-server-key");
    vi.stubGlobal("fetch", vi.fn());

    await expect(verifySmartCaptchaToken({ ip: "203.0.113.10", token: "mock-smartcaptcha-token" })).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates production tokens through Yandex without logging secrets", async () => {
    vi.stubEnv("CAPTCHA_DISABLED", "false");
    vi.stubEnv("YANDEX_CAPTCHA_SERVER_KEY", "server-secret");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 })));

    await expect(verifySmartCaptchaToken({ ip: "203.0.113.10", token: "captcha-token" })).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      "https://smartcaptcha.yandexcloud.net/validate",
      expect.objectContaining({ method: "POST" }),
    );
    const body = vi.mocked(fetch).mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("token")).toBe("captcha-token");
    expect(body.get("secret")).toBe("server-secret");
    expect(body.get("ip")).toBe("203.0.113.10");
  });

  it("rejects invalid or missing tokens when captcha is enabled", async () => {
    vi.stubEnv("CAPTCHA_DISABLED", "false");
    vi.stubEnv("YANDEX_CAPTCHA_SERVER_KEY", "server-secret");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "failed" }), { status: 200 })));

    await expect(verifySmartCaptchaToken({ ip: "203.0.113.10", token: "bad-token" })).resolves.toBe(false);
    await expect(verifySmartCaptchaToken({ ip: "203.0.113.10", token: "" })).resolves.toBe(false);
  });
});
