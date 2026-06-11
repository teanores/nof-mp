import { type NextRequest, NextResponse } from "next/server";

import { portalSessionFromRequest, requirePortalApiSession } from "@/lib/server/portal-auth-gate";
import { oauthIssuer, signOAuthJwt } from "@/lib/server/oauth-token-signer";
import type { ForgeServiceLink } from "@/lib/types";

export const dynamic = "force-dynamic";

type ServiceLinkContractResponse = {
  ok?: boolean;
  link?: Omit<ForgeServiceLink, "openHref">;
};

function nofHtOrigin(): string {
  return process.env.NOF_HT_ORIGIN ?? process.env.NEXT_PUBLIC_NOF_HT_ORIGIN ?? "https://habit-tracker.forgath.ru";
}

function nofHtOpenHref(): string {
  const url = new URL("/api/auth/platform/authorize", nofHtOrigin());
  url.searchParams.set("callbackUrl", "/");
  return url.toString();
}

function serviceLinksToken(platformUserId: string, scope: string): string {
  const now = Math.floor(Date.now() / 1000);
  return signOAuthJwt({
    aud: "nof-ht",
    exp: now + 60,
    iat: now,
    iss: oauthIssuer(),
    nonce: "service-link-contract",
    scope,
    sub: platformUserId,
  });
}

function unavailableNofHtLink(): ForgeServiceLink {
  return {
    serviceKey: "nof-ht",
    serviceName: "Habit Tracker",
    status: "unavailable",
    canUnlink: false,
    openHref: nofHtOpenHref(),
  };
}

async function fetchNofHtLink(platformUserId: string): Promise<ForgeServiceLink> {
  try {
    const response = await fetch(new URL("/api/platform/links/habit-tracker", nofHtOrigin()).toString(), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${serviceLinksToken(platformUserId, "service_links.read")}`,
      },
    });
    if (!response.ok) return unavailableNofHtLink();

    const body = (await response.json()) as ServiceLinkContractResponse;
    if (!body.ok || !body.link) return unavailableNofHtLink();

    return { ...body.link, openHref: nofHtOpenHref() };
  } catch {
    return unavailableNofHtLink();
  }
}

async function unlinkNofHt(platformUserId: string): Promise<ForgeServiceLink> {
  const response = await fetch(new URL("/api/platform/links/habit-tracker", nofHtOrigin()).toString(), {
    cache: "no-store",
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${serviceLinksToken(platformUserId, "service_links.unlink")}`,
    },
  });
  if (!response.ok) return unavailableNofHtLink();

  const body = (await response.json()) as ServiceLinkContractResponse;
  if (!body.ok || !body.link) return unavailableNofHtLink();

  return { ...body.link, openHref: nofHtOpenHref() };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  return NextResponse.json({ links: [await fetchNofHtLink(userId)] });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requirePortalApiSession(request);
  if (authError) return authError;

  const session = await portalSessionFromRequest(request);
  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const serviceKey = request.nextUrl.searchParams.get("serviceKey");
  if (serviceKey !== "nof-ht") {
    return NextResponse.json({ error: "unsupported_service" }, { status: 400 });
  }

  return NextResponse.json({ link: await unlinkNofHt(userId) });
}
