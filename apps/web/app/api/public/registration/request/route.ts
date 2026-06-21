import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  clientIpFromRequest,
  hasEmailMxRecord,
  recordRegistrationAudit,
  registrationRateLimit,
} from "@/lib/server/registration-abuse-protection";
import { sendRegistrationCodeEmail } from "@/lib/server/email-delivery";
import { getPlatformRegistrationRepository } from "@/lib/server/platform-registration-repository";
import { getPlatformSettingsRepository } from "@/lib/server/platform-settings-repository";
import {
  normalizeRegistrationEmail,
  redirectToRegistrationConfirm,
  redirectToRegistrationRequestError,
} from "@/lib/server/public-registration";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const email = normalizeRegistrationEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!username || !email || !password) {
    return redirectToRegistrationRequestError("invalid");
  }

  if (await getPlatformSettingsRepository().isRegistrationPaused()) {
    return redirectToRegistrationRequestError("unavailable");
  }

  const limit = registrationRateLimit(email, clientIpFromRequest(request));
  if (!limit.allowed) {
    await recordRegistrationAudit(request, { email, eventType: "registration_rate_limited", statusCode: 429 });
    return new NextResponse("Too many registration attempts", {
      headers: { "Retry-After": String(limit.retryAfter) },
      status: 429,
    });
  }

  if (!(await hasEmailMxRecord(email))) {
    await recordRegistrationAudit(request, { email, eventType: "registration_invalid_email", statusCode: 400 });
    return redirectToRegistrationRequestError("invalid_email");
  }

  await recordRegistrationAudit(request, { email, eventType: "registration_attempt", statusCode: 202 });

  try {
    const result = await getPlatformRegistrationRepository().requestRegistration({ email, password, username });
    if (!result.ok) {
      if (result.reason === "conflict") {
        return redirectToRegistrationRequestError("conflict");
      }
      return redirectToRegistrationRequestError("invalid");
    }

    await sendRegistrationCodeEmail({ code: result.code, to: result.email });
    return redirectToRegistrationConfirm(email);
  } catch {
    return redirectToRegistrationRequestError("unavailable");
  }
}
