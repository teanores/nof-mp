import { describe, expect, it } from "vitest";

import { getMessengerGateway } from "@/lib/server/messenger-gateway";

describe("messenger gateway stub", () => {
  it("blocks real DM delivery until the NOF bot messenger gateway exists", async () => {
    await expect(
      getMessengerGateway().sendEmailLink({
        expiresAt: new Date("2026-06-22T11:00:00.000Z"),
        token: "raw-email-link-token",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "bot_gateway_not_configured",
      status: "blocked",
    });
  });
});
