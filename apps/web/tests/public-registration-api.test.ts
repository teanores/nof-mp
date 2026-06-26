import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizeRegistrationEmail,
  redirectToLoginAfterRegistration,
  redirectToRegistrationRequestError,
} from "@/lib/server/public-registration";

describe("public registration api helpers", () => {
  it("keeps registration helper contract native to nof-mp without legacy nof-service URLs", () => {
    const moduleText = readFileSync(join(process.cwd(), "lib", "server", "public-registration.ts"), "utf8");

    expect(moduleText).not.toContain("nof-service-internal");
    expect(moduleText).not.toContain("NOF_SERVICE_INTERNAL_URL");
    expect(moduleText).not.toContain("buildPublicRegistrationRequestUrl");
    expect(moduleText).not.toContain("buildPublicRegistrationConfirmUrl");
  });

  it("normalizes registration email before redirecting to the confirmation step", () => {
    expect(normalizeRegistrationEmail("  UrdZurab@Proton.Me ")).toBe("urdzurab@proton.me");
  });

  it("redirects registration failures back to the page with a controlled error", () => {
    const response = redirectToRegistrationRequestError("unavailable");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/register?error=unavailable");
  });

  it("redirects successful native registration to login", () => {
    const response = redirectToLoginAfterRegistration();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login?registered=1");
  });
});
