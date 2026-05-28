import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";

describe("portal layout primitives", () => {
  it("renders a stable page shell with constrained content", () => {
    render(
      <PortalPageShell maxWidthClassName="max-w-test">
        <p>Portal content</p>
      </PortalPageShell>,
    );

    expect(screen.getByRole("main")).toHaveClass("min-h-screen");
    expect(screen.getByText("Portal content").parentElement).toHaveClass("max-w-test");
  });

  it("renders a header with eyebrow, title, description and actions", () => {
    render(
      <PortalHeader
        actions={<button type="button">Action</button>}
        description="Unified portal description"
        eyebrow="Dragon Forge"
        title="Narag'Othal Forgath"
      />,
    );

    expect(screen.getByRole("banner")).toHaveClass("panel");
    expect(screen.getByRole("link", { name: "// DRAGON FORGE // Narag'Othal Forgath" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Dragon Forge")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Narag'Othal Forgath" })).toBeInTheDocument();
    expect(screen.getByText("Unified portal description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("renders clickable slash-separated breadcrumbs after the brand", () => {
    render(
      <PortalHeader
        breadcrumbs={[
          { href: "/projects", label: "Проекты" },
          { href: "/projects/nof-tt/wiki", label: "Wiki" },
          { label: "contracts" },
        ]}
        title="Contracts"
      />,
    );

    expect(screen.getByRole("navigation", { name: "Portal breadcrumbs" })).toHaveTextContent(
      "// DRAGON FORGE // Narag'Othal Forgath//Проекты//Wiki//contracts",
    );
    expect(screen.getByRole("link", { name: "Проекты" })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: "Wiki" })).toHaveAttribute("href", "/projects/nof-tt/wiki");
  });

  it("renders an action bar without page-specific duplicated structure", () => {
    render(
      <PortalActionBar actions={<button type="button">Create</button>} eyebrow="Board controls" title="Overview" />,
    );

    expect(screen.getByLabelText("Overview actions")).toHaveClass("panel");
    expect(screen.getByText("Board controls")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
