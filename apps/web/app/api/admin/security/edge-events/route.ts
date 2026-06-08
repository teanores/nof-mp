import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { extractBearerToken, isValidIngestToken, parseCaddyAccessLogPayload } from "@/lib/server/caddy-edge-audit";
import { recordSecurityAuditEvent } from "@/lib/server/security-audit-dashboard";

const maxPayloadBytes = 256 * 1024;

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-api-key") ?? extractBearerToken(request.headers.get("authorization"));
  if (!isValidIngestToken(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxPayloadBytes) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let events;
  try {
    events = parseCaddyAccessLogPayload(await request.text());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  for (const event of events) {
    await recordSecurityAuditEvent(event);
  }

  return NextResponse.json({ accepted: events.length });
}
