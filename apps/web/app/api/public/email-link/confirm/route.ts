import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPlatformEmailLinkRepository } from "@/lib/server/platform-email-link-repository";
import { normalizeRegistrationEmail, redirectToRegistrationRequestError } from "@/lib/server/public-registration";
import { recordRegistrationAudit } from "@/lib/server/registration-abuse-protection";

function redirectToLoginAfterTelegramLink(): NextResponse {
  return new NextResponse(null, { headers: { Location: "/login?registered=1&linked=telegram" }, status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = normalizeRegistrationEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "");

  if (!email || !password || !token) {
    return redirectToRegistrationRequestError("invalid_link");
  }

  const result = await getPlatformEmailLinkRepository().confirmLink({ email, newPassword: password, token });
  if (!result.ok) {
    const error = result.reason === "password_policy" ? "password_policy" : "invalid_link";
    return redirectToRegistrationRequestError(error);
  }

  await recordRegistrationAudit(request, { email, eventType: "registration_success", statusCode: 201 });
  return redirectToLoginAfterTelegramLink();
}
