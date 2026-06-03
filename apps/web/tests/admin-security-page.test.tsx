import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminSecurityPage } from "@/components/AdminSecurityPage";

describe("admin security page", () => {
  it("uses the platform shell and footer instead of a product shell", () => {
    render(
      <AdminSecurityPage
        session={{
          authenticated: true,
          loginUrl: "/login",
          user: {
            experience: 0,
            id: "admin-1",
            role: { id: 1, name: "admin" },
            username: "teanore",
          },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Безопасность платформы" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Профиль teanore" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Профиль teanore" })).toHaveTextContent("TE");
    expect(screen.getByText("NOF.MP // v0.1.11")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NOF.TT");
    expect(document.body).not.toHaveTextContent("192.168.1.51");
    expect(document.body).not.toHaveTextContent("30500");
    expect(document.body).not.toHaveTextContent("30510");
    expect(document.body).not.toHaveTextContent("token");
    expect(document.body).not.toHaveTextContent("password");
  });
});
