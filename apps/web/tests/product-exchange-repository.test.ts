import { describe, expect, it } from "vitest";

import { InMemoryProductExchangeRepository } from "@/lib/server/product-exchange-repository";

describe("product exchange repository", () => {
  it("issues a one-time code scoped to a user and product", async () => {
    const repository = new InMemoryProductExchangeRepository();

    const issued = await repository.issue({
      platformUserId: "user-1",
      productKey: "nof-tt",
      returnTo: "/projects",
      state: "state-1",
      ttlSeconds: 120,
    });

    expect(issued.code).toMatch(/^px_/);
    expect(issued.productKey).toBe("nof-tt");
    expect(issued.platformUserId).toBe("user-1");
    expect(issued.expiresAt).toBeTruthy();
  });

  it("redeems a code only once", async () => {
    const repository = new InMemoryProductExchangeRepository();
    const issued = await repository.issue({
      platformUserId: "user-1",
      productKey: "nof-tt",
      returnTo: "/projects",
      state: "state-1",
      ttlSeconds: 120,
    });

    const first = await repository.redeem({ code: issued.code, productKey: "nof-tt", state: "state-1" });
    const second = await repository.redeem({ code: issued.code, productKey: "nof-tt", state: "state-1" });

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: "already_used" });
  });

  it("rejects product and state mismatch", async () => {
    const repository = new InMemoryProductExchangeRepository();
    const issued = await repository.issue({
      platformUserId: "user-1",
      productKey: "nof-tt",
      returnTo: "/projects",
      state: "state-1",
      ttlSeconds: 120,
    });

    await expect(repository.redeem({ code: issued.code, productKey: "nof-ht", state: "state-1" })).resolves.toEqual({
      ok: false,
      error: "product_mismatch",
    });
    await expect(repository.redeem({ code: issued.code, productKey: "nof-tt", state: "state-2" })).resolves.toEqual({
      ok: false,
      error: "state_mismatch",
    });
  });
});
