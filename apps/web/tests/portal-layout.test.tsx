import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { PortalBreadcrumbs } from "@/components/PortalBreadcrumbs";
import { PortalPageShell } from "@/components/PortalLayout";
import { NOF_MP_FOOTER_MARKER } from "@/lib/platform-version";

describe("portal layout", () => {
  it("uses a sticky footer shell for short pages", () => {
    const { container } = render(
      <PortalPageShell>
        <section>Короткий контент</section>
      </PortalPageShell>,
    );

    expect(container.firstChild).toHaveClass("min-h-screen", "flex", "flex-col");
    expect(container.querySelector(".flex-1")).toBeTruthy();
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });

  it("uses current NOF naming in breadcrumbs", () => {
    render(<PortalBreadcrumbs items={[{ label: "Task Tracker" }]} />);

    expect(screen.getByRole("link", { name: "NOF Platform" })).toHaveAttribute("href", "/");
    expect(screen.queryByText(/DRAGON FORGE/i)).not.toBeInTheDocument();
  });
});
