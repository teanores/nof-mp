import type { NextRequest } from "next/server";

import { recordRegistrationAudit } from "@/lib/server/registration-abuse-protection";
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
      await recordRegistrationAudit(request, { email, eventType: "registration_success", statusCode: upstream.status });
      return redirectToLoginAfterRegistration();
    }
    return redirectToRegistrationConfirmError(email, [404, 502, 503, 504].includes(upstream.status) ? "unavailable" : "invalid");
  } catch {
    return redirectToRegistrationConfirmError(email, "unavailable");
  }
}
