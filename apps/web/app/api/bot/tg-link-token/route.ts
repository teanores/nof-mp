import { type NextRequest, NextResponse } from "next/server";

import { getPlatformEmailLinkRepository } from "@/lib/server/platform-email-link-repository";

export const dynamic = "force-dynamic";

interface TelegramLinkPayload {
  telegram_id?: unknown;
  username?: unknown;
}

function configuredToken(): string | undefined {
  return process.env.NOF_MP_BOT_GATEWAY_TOKEN?.trim() || undefined;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized", ok: false }, { status: 401 });
}

function normalizeTelegramUsername(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replace(/^@+/, "");
  return normalized || undefined;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = configuredToken();
  const authorization = request.headers.get("authorization") ?? "";
  if (!expectedToken || authorization !== `Bearer ${expectedToken}`) {
    return unauthorized();
  }

  const payload = (await request.json().catch(() => ({}))) as TelegramLinkPayload;
  const telegramId = Number(payload.telegram_id);
  const result = await getPlatformEmailLinkRepository().issueTelegramLink({
    telegramId,
    telegramUsername: normalizeTelegramUsername(payload.username),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason, ok: false }, { status: 400 });
  }

  return NextResponse.json(
    {
      expiresAt: result.expiresAt.toISOString(),
      ok: true,
      registerUrl: result.registerUrl,
      token: result.token,
    },
    { status: 201 },
  );
}
