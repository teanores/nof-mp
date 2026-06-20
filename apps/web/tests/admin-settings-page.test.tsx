import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSettingsPage } from "@/components/AdminSettingsPage";

describe("admin settings page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the registration pause toggle", () => {
    render(<AdminSettingsPage initialSettings={{ registrationPaused: true }} />);

    expect(screen.getByRole("heading", { name: "Настройки" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Регистрация приостановлена" })).toBeInTheDocument();
    expect(screen.getByText("Статус: приостановлена")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Включить регистрацию" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders enabled registration as enabled", () => {
    render(<AdminSettingsPage initialSettings={{ registrationPaused: false }} />);

    expect(screen.getByRole("heading", { name: "Регистрация включена" })).toBeInTheDocument();
    expect(screen.getByText("Статус: включена")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Приостановить регистрацию" })).toHaveAttribute("aria-pressed", "false");
  });

  it("updates the registration pause setting", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ settings: { registrationPaused: false } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    render(<AdminSettingsPage initialSettings={{ registrationPaused: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Включить регистрацию" }));

    await waitFor(() => expect(screen.getByText("Статус: включена")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Регистрация включена" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/settings",
      expect.objectContaining({
        body: JSON.stringify({ registrationPaused: false }),
        method: "PATCH",
      }),
    );
  });
});
