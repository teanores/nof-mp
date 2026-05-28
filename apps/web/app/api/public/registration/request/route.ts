import type { NextRequest } from "next/server";

import {
  buildPublicRegistrationRequestUrl,
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

  try {
    const upstream = await fetch(buildPublicRegistrationRequestUrl(), {
      body: JSON.stringify({ email, password, username }),
      headers: { "content-type": "application/json" },
      method: "POST",
      redirect: "manual",
    });

    if (upstream.ok) {
      return redirectToRegistrationConfirm(email);
    }
    if (upstream.status === 409) {
      return redirectToRegistrationRequestError("conflict");
    }
    if ([404, 502, 503, 504].includes(upstream.status)) {
      return redirectToRegistrationRequestError("unavailable");
    }
    return redirectToRegistrationRequestError("invalid");
  } catch {
    return redirectToRegistrationRequestError("unavailable");
  }
}
