import type { NextRequest } from "next/server";

import { getPlatformSettingsRepository } from "@/lib/server/platform-settings-repository";
import { getPlatformRegistrationRepository } from "@/lib/server/platform-registration-repository";
import { recordRegistrationAudit } from "@/lib/server/registration-abuse-protection";
import {
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

  if (await getPlatformSettingsRepository().isRegistrationPaused()) {
    return redirectToRegistrationConfirmError(email, "unavailable");
  }

  try {
    const result = await getPlatformRegistrationRepository().confirmRegistration({ code, email });
    if (result.ok) {
      await recordRegistrationAudit(request, { email, eventType: "registration_success", statusCode: 201 });
      return redirectToLoginAfterRegistration();
    }
    return redirectToRegistrationConfirmError(email, result.reason === "conflict" ? "conflict" : "invalid");
  } catch {
    return redirectToRegistrationConfirmError(email, "unavailable");
  }
}
