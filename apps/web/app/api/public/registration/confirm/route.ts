import type { NextRequest } from "next/server";

import {
  buildPublicRegistrationConfirmUrl,
  normalizeRegistrationEmail,
  redirectToLoginAfterRegistration,
  redirectToRegistrationConfirmError,
} from "@/lib/server/public-registration";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = normalizeRegistrationEmail(String(formData.get("email") ?? ""));
  const code = String(formData.get("code") ?? "").trim();

  if (!email || !code) {
    return redirectToRegistrationConfirmError(email, "invalid");
  }

  try {
    const upstream = await fetch(buildPublicRegistrationConfirmUrl(), {
      body: JSON.stringify({ code, email }),
      headers: { "content-type": "application/json" },
      method: "POST",
      redirect: "manual",
    });

    if (upstream.ok) {
      return redirectToLoginAfterRegistration();
    }
    return redirectToRegistrationConfirmError(email, [404, 502, 503, 504].includes(upstream.status) ? "unavailable" : "invalid");
  } catch {
    return redirectToRegistrationConfirmError(email, "unavailable");
  }
}
