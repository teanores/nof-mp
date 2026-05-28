import { describe, expect, it } from "vitest";

import { ProductAccessRepository, subjectFromPortalSession } from "@/lib/server/product-access-repository";

describe("product access repository", () => {
  it("lists products with access decisions for guests", async () => {
    const repository = ProductAccessRepository.fromStaticRegistry();

    await expect(repository.listForSubject({ role: "guest" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "nof-cb", access: { allowed: true, reason: "public-product" } }),
        expect.objectContaining({ key: "noftt", access: { allowed: false, reason: "authentication-required" } }),
      ]),
    );
  });

  it("checks product existence from the repository source", async () => {
    const repository = ProductAccessRepository.fromStaticRegistry();

    await expect(repository.exists("nof-ht")).resolves.toBe(true);
    await expect(repository.exists("unknown-product")).resolves.toBe(false);
  });

  it("builds an access subject from an authenticated portal session", () => {
    expect(
      subjectFromPortalSession({
        authenticated: true,
        loginUrl: "/login",
        user: {
          id: "u-admin",
          username: "admin",
          experience: 0,
          role: { id: 1, name: "admin" },
        },
      }),
    ).toEqual({ role: "admin", userId: "u-admin" });
  });

  it("treats missing sessions as guests", () => {
    expect(subjectFromPortalSession({ authenticated: false, loginUrl: "/login" })).toEqual({ role: "guest" });
  });
});