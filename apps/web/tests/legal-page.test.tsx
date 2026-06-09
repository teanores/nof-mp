import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import LegalDraftPage from "@/app/legal/page";

describe("legal draft page", () => {
  it("renders a clear non-binding legal draft in the platform shell", () => {
    render(<LegalDraftPage />);

    expect(screen.getByRole("heading", { name: "Юридические аспекты" })).toBeInTheDocument();
    expect(screen.getByText("Черновик / пример")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Не является юридическим документом" })).toBeInTheDocument();
    expect(screen.getByText(/не является публичной офертой/)).toBeInTheDocument();
    expect(screen.getByText(/не создаёт прав и обязанностей/)).toBeInTheDocument();
    expect(screen.getByText(/Настоящие условия использования/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(document.body).not.toHaveTextContent("Настоящая страница является публичной офертой");
    expect(document.body).not.toHaveTextContent("финальное пользовательское соглашение");
    expect(document.body).not.toHaveTextContent("политика конфиденциальности действует");
  });
});
