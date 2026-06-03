import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import ForgeTasksServicePage from "@/app/services/forge-tasks/page";

describe("Forge Tasks service preview page", () => {
  it("shows an explicit service entry button without auto redirecting the preview page", () => {
    render(<ForgeTasksServicePage />);

    expect(screen.getByRole("heading", { name: "Forge Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти в Forge Tasks" })).toHaveAttribute(
      "href",
      "/products/nof-tt/launch?next=%2Foverview",
    );
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
  });
});
