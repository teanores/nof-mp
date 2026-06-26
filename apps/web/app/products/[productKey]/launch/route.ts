import { type NextRequest, NextResponse } from "next/server";

import { nofHtOidcAuthorizeHref } from "@/lib/server/nof-ht-oidc-handoff";
import { nofTtOidcStartHref } from "@/lib/server/nof-tt-oidc-handoff";
import { portalLoginUrl, portalSessionFromRequest, safePortalReturnTo } from "@/lib/server/portal-auth-gate";
import { getProductAccessRepository, subjectFromPortalSession } from "@/lib/server/product-access-repository";

export const dynamic = "force-dynamic";

interface ProductLaunchContext {
  params: Promise<{ productKey: string }>;
}

export async function GET(request: NextRequest, context: ProductLaunchContext): Promise<NextResponse> {
  const { productKey } = await context.params;
  const session = await portalSessionFromRequest(request);

  if (!session.authenticated || !session.user?.id) {
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return new NextResponse(null, {
      headers: { location: session.loginUrl || portalLoginUrl(returnTo) },
      status: 303,
    });
  }

  const accessRepository = getProductAccessRepository();
  const products = await accessRepository.listForSubject(subjectFromPortalSession(session));
  const product = products.find((candidate) => candidate.key === productKey);

  if (!product) {
    return NextResponse.json({ error: "unknown_product", ok: false }, { status: 404 });
  }
  if (!product.access.allowed) {
    return NextResponse.json({ error: "access_denied", ok: false, reason: product.access.reason }, { status: 403 });
  }
  if (productKey === "nof-ht") {
    return new NextResponse(null, {
      headers: { location: nofHtOidcAuthorizeHref("/") },
      status: 303,
    });
  }
  if (productKey === "nof-tt") {
    const returnTo = safePortalReturnTo(request.nextUrl.searchParams.get("next") ?? "/projects");
    return new NextResponse(null, {
      headers: { location: nofTtOidcStartHref(returnTo) },
      status: 303,
    });
  }

  return NextResponse.json({ error: "standard_oauth_required", ok: false, productKey }, { status: 410 });
}
