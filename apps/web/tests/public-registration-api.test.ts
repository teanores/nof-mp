import { describe, expect, it } from "vitest";

import {
  buildPublicRegistrationConfirmUrl,
  buildPublicRegistrationRequestUrl,
  normalizeRegistrationEmail,
  redirectToRegistrationRequestError,
} from "@/lib/server/public-registration";

describe("public registration api helpers", () => {
  it("builds NOF service public registration URLs from the internal base URL", () => {
    const baseUrl = "http://nof-service-internal:5000";

    expect(buildPublicRegistrationRequestUrl(baseUrl)).toBe(
      "http://nof-service-internal:5000/api/public/registration/request",
    );
    expect(buildPublicRegistrationConfirmUrl(baseUrl)).toBe(
      "http://nof-service-internal:5000/api/public/registration/confirm",
    );
  });

  it("normalizes registration email before redirecting to the confirmation step", () => {
    expect(normalizeRegistrationEmail("  UrdZurab@Proton.Me ")).toBe("urdzurab@proton.me");
  });

  it("redirects registration failures back to the page with a controlled error", () => {
    const response = redirectToRegistrationRequestError("unavailable");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?error=unavailable");
  });
});
