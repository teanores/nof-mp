import { describe, expect, it } from "vitest";

import { canAccessProduct, platformTableSpecs, type PlatformProductAccessPolicy } from "@/lib/platform-access-contract";

const ownersOnly: PlatformProductAccessPolicy = {
  productKey: "nof-onw",
  visibility: "owners",
  ownerUserIds: ["u-owner"],
};

describe("platform access contract", () => {
  it("allows guests to see public products", () => {
    expect(canAccessProduct({ role: "guest" }, { productKey: "nof-cb", visibility: "public" })).toEqual({
      allowed: true,
      reason: "public-product",
    });
  });

  it("requires authentication for registered products", () => {
    expect(canAccessProduct({ role: "guest" }, { productKey: "nof-tt", visibility: "registered" })).toEqual({
      allowed: false,
      reason: "authentication-required",
    });
    expect(canAccessProduct({ role: "user", userId: "u-1" }, { productKey: "nof-tt", visibility: "registered" })).toEqual({
      allowed: true,
      reason: "registered-user",
    });
  });

  it("enforces invited-only products", () => {
    const policy: PlatformProductAccessPolicy = { productKey: "nof-ht", visibility: "invited", invitedUserIds: ["u-2"] };
    expect(canAccessProduct({ role: "user", userId: "u-1" }, policy)).toEqual({ allowed: false, reason: "invitation-required" });
    expect(canAccessProduct({ role: "user", userId: "u-2" }, policy)).toEqual({ allowed: true, reason: "invited-user" });
  });

  it("enforces owner-only products but allows platform staff", () => {
    expect(canAccessProduct({ role: "user", userId: "u-1" }, ownersOnly)).toEqual({ allowed: false, reason: "owner-required" });
    expect(canAccessProduct({ role: "user", userId: "u-owner" }, ownersOnly)).toEqual({ allowed: true, reason: "owner-user" });
    expect(canAccessProduct({ role: "moderator", userId: "u-mod" }, ownersOnly)).toEqual({ allowed: true, reason: "platform-staff" });
  });

  it("documents the first platform-owned tables", () => {
    expect(platformTableSpecs.map((table) => table.name)).toEqual([
      "nof_platform.users",
      "nof_platform.sessions",
      "nof_platform.user_preferences",
      "nof_platform.products",
      "nof_platform.product_access",
      "nof_platform.mcp_tokens",
    ]);
    expect(platformTableSpecs.filter((table) => table.storesSecrets).map((table) => table.name)).toEqual([
      "nof_platform.sessions",
      "nof_platform.mcp_tokens",
    ]);
  });
});
