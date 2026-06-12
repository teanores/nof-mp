import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn());
const close = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ close, sendMail })),
  },
}));

import nodemailer from "nodemailer";

import { POST } from "@/app/api/internal/email/password-reset/route";

function request(body: unknown, token?: string): NextRequest {
  return new NextRequest("http://localhost/api/internal/email/password-reset", {
    body: JSON.stringify(body),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

describe("internal password reset email route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NOF_MP_EMAIL_FROM: "accounts@example.com",
      NOF_MP_EMAIL_WEBHOOK_TOKEN: "delivery-token",
      NEXT_PUBLIC_PLATFORM_ORIGIN: "https://forgath.ru",
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PASS: "smtp-pass",
      SMTP_PORT: "587",
      SMTP_USER: "smtp-user@example.com",
    };
    sendMail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("rejects requests without the configured bearer token", async () => {
    const response = await POST(request({ kind: "password_reset" }));

    expect(response.status).toBe(401);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads before touching SMTP", async () => {
    const response = await POST(request({ kind: "password_reset", resetUrl: "http://example.com/reset", to: "bad" }, "delivery-token"));

    expect(response.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects foreign reset links before touching SMTP", async () => {
    const response = await POST(
      request(
        {
          expiresAt: "2026-06-11T11:00:00.000Z",
          kind: "password_reset",
          resetUrl: "https://evil.example/password-reset?token=raw-token",
          to: "owner@example.com",
          userId: "user-1",
        },
        "delivery-token",
      ),
    );

    expect(response.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects non-reset platform links before touching SMTP", async () => {
    const response = await POST(
      request(
        {
          expiresAt: "2026-06-11T11:00:00.000Z",
          kind: "password_reset",
          resetUrl: "https://forgath.ru/login?token=raw-token",
          to: "owner@example.com",
          userId: "user-1",
        },
        "delivery-token",
      ),
    );

    expect(response.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends a password reset email through the configured SMTP provider", async () => {
    const response = await POST(
      request(
        {
          expiresAt: "2026-06-11T11:00:00.000Z",
          kind: "password_reset",
          resetUrl: "https://forgath.ru/password-reset?token=raw-token",
          to: "owner@example.com",
          userId: "user-1",
        },
        "delivery-token",
      ),
    );

    expect(response.status).toBe(202);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { pass: "smtp-pass", user: "smtp-user@example.com" },
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "\"NOF Platform\" <accounts@example.com>",
        subject: "Восстановление пароля NOF Platform",
        to: "owner@example.com",
      }),
    );
    expect(close).toHaveBeenCalled();
  });

  it("fails closed when SMTP env is incomplete", async () => {
    delete process.env.SMTP_PASS;

    await expect(
      POST(
        request(
          {
            expiresAt: "2026-06-11T11:00:00.000Z",
            kind: "password_reset",
            resetUrl: "https://forgath.ru/password-reset?token=raw-token",
            to: "owner@example.com",
            userId: "user-1",
          },
          "delivery-token",
        ),
      ),
    ).rejects.toThrow("email_delivery_not_configured");
    expect(sendMail).not.toHaveBeenCalled();
  });
});
