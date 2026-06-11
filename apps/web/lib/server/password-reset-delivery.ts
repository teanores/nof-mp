export interface PasswordResetDeliveryInput {
  email: string;
  expiresAt: Date;
  resetToken: string;
  userId: string;
}

export interface PasswordResetDeliveryResult {
  ok: true;
  mode: "http_webhook" | "not_configured";
}

export class PasswordResetDelivery {
  async sendResetLink(input: PasswordResetDeliveryInput): Promise<PasswordResetDeliveryResult> {
    const endpoint = process.env.NOF_MP_EMAIL_WEBHOOK_URL?.trim();
    const token = process.env.NOF_MP_EMAIL_WEBHOOK_TOKEN?.trim();
    if (!endpoint || !token) {
      return { mode: "not_configured", ok: true };
    }

    const resetUrl = passwordResetUrl(input.resetToken);
    const response = await fetch(endpoint, {
      body: JSON.stringify({
        expiresAt: input.expiresAt.toISOString(),
        kind: "password_reset",
        resetUrl,
        to: input.email,
        userId: input.userId,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("password_reset_delivery_failed");
    }

    return { mode: "http_webhook", ok: true };
  }
}

export function passwordResetUrl(resetToken: string): string {
  const origin = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN?.trim() || "https://forgath.ru";
  const url = new URL("/password-reset", origin);
  url.searchParams.set("token", resetToken);
  return url.toString();
}

let delivery: PasswordResetDelivery | undefined;

export function getPasswordResetDelivery(): PasswordResetDelivery {
  delivery ??= new PasswordResetDelivery();
  return delivery;
}
