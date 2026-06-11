export interface PasswordResetDeliveryInput {
  email: string;
  expiresAt: Date;
  resetToken: string;
  userId: string;
}

export interface PasswordResetDeliveryResult {
  ok: true;
  mode: "not_configured";
}

export class PasswordResetDelivery {
  async sendResetLink(input: PasswordResetDeliveryInput): Promise<PasswordResetDeliveryResult> {
    void input.email;
    return { mode: "not_configured", ok: true };
  }
}

let delivery: PasswordResetDelivery | undefined;

export function getPasswordResetDelivery(): PasswordResetDelivery {
  delivery ??= new PasswordResetDelivery();
  return delivery;
}
