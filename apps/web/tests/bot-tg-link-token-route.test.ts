import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const emailLinkRepository = vi.hoisted(() => ({
  issueTelegramLink: vi.fn(),
}));

vi.mock("@/lib/server/platform-email-link-repository", () => ({
  getPlatformEmailLinkRepository: () => emailLinkRepository,
}));

import { POST } from "@/app/api/bot/tg-link-token/route";

function request(body: Record<string, unknown>, token = "bot-service-token"): NextRequest {
  return new NextRequest("http://localhost/api/bot/tg-link-token", {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
}

describe("bot tg-link token route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NOF_MP_BOT_GATEWAY_TOKEN", "bot-service-token");
    emailLinkRepository.issueTelegramLink.mockResolvedValue({
      expiresAt: new Date("2026-06-22T10:15:00.000Z"),
      ok: true,
      reason: "token_created",
      registerUrl: "https://forgath.ru/register?tg=signed-token",
      token: "signed-token",
      userId: "user-1",
    });
  });

  it("issues a tg-link token through service-auth without exposing internal user id", async () => {
    const response = await POST(request({ telegram_id: 251740038, username: "@teanore" }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(emailLinkRepository.issueTelegramLink).toHaveBeenCalledWith({
      telegramId: 251740038,
      telegramUsername: "teanore",
    });
    expect(payload).toEqual({
      expiresAt: "2026-06-22T10:15:00.000Z",
      ok: true,
      registerUrl: "https://forgath.ru/register?tg=signed-token",
      token: "signed-token",
    });
    expect(JSON.stringify(payload)).not.toContain("user-1");
  });

  it("rejects missing or invalid service auth", async () => {
    const response = await POST(request({ telegram_id: 251740038 }, "wrong-token"));

    expect(response.status).toBe(401);
    expect(emailLinkRepository.issueTelegramLink).not.toHaveBeenCalled();
  });
});
