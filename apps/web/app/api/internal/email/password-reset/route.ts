import { type NextRequest, NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/server/email-delivery";

export const dynamic = "force-dynamic";

interface PasswordResetEmailPayload {
  expiresAt?: unknown;
  kind?: unknown;
  resetUrl?: unknown;
  to?: unknown;
  userId?: unknown;
}

interface ValidPasswordResetEmailPayload {
  expiresAt: string;
  kind: "password_reset";
  resetUrl: string;
  to: string;
  userId: string;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized", ok: false }, { status: 401 });
}

function configuredToken(): string | undefined {
  return process.env.NOF_MP_EMAIL_WEBHOOK_TOKEN?.trim() || undefined;
}

function platformOrigin(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_ORIGIN?.trim() || "https://forgath.ru";
}

function isValidResetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === platformOrigin() && url.pathname === "/password-reset" && Boolean(url.searchParams.get("token"));
  } catch {
    return false;
  }
}

function isValidPayload(payload: PasswordResetEmailPayload): payload is ValidPasswordResetEmailPayload {
  return (
    payload.kind === "password_reset" &&
    typeof payload.to === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.to) &&
    typeof payload.resetUrl === "string" &&
    isValidResetUrl(payload.resetUrl) &&
    typeof payload.expiresAt === "string" &&
    typeof payload.userId === "string" &&
    payload.userId.length > 0
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = configuredToken();
  const authorization = request.headers.get("authorization") ?? "";
  if (!expectedToken || authorization !== `Bearer ${expectedToken}`) {
    return unauthorized();
  }

  const payload = (await request.json().catch(() => ({}))) as PasswordResetEmailPayload;
  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "invalid_request", ok: false }, { status: 400 });
  }

  await sendPasswordResetEmail({
    expiresAt: payload.expiresAt,
    resetUrl: payload.resetUrl,
    to: payload.to,
    userId: payload.userId,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
