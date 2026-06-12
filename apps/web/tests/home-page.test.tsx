import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

const mocks = vi.hoisted(() => ({
  portalPageSession: vi.fn(),
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  portalPageSession: mocks.portalPageSession,
}));

vi.mock("@/lib/platform-api", () => ({
  fetchPortalSession: vi.fn(),
}));

describe("platform home page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.portalPageSession.mockResolvedValue({
      authenticated: false,
      loginUrl: "/login?next=%2Foverview",
    });
  });

  it("shows a login action for guests on the public home page", async () => {
    render(await Home());

    expect(mocks.portalPageSession).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Narag'Othal Forgath" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login?next=%2Foverview");
    expect(screen.queryByRole("link", { name: "Профиль" })).not.toBeInTheDocument();
  });

  it("shows the compact profile action for authenticated users on the home page", async () => {
    mocks.portalPageSession.mockResolvedValue({
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "u-1", role: { id: 1, name: "admin" }, username: "teanore" },
    });

    render(await Home());

    expect(screen.getByRole("link", { name: "Профиль teanore" })).toHaveTextContent("TE");
    expect(screen.queryByRole("link", { name: "Войти" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Профиль" })).not.toBeInTheDocument();
  });
});
