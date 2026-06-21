import nodemailer from "nodemailer";

export interface PasswordResetEmailInput {
  expiresAt: string;
  resetUrl: string;
  to: string;
  userId: string;
}

export interface RegistrationCodeEmailInput {
  code: string;
  to: string;
}

interface SmtpConfig {
  from: string;
  host: string;
  pass: string;
  port: number;
  user: string;
}

function smtpConfig(): SmtpConfig | undefined {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.NOF_MP_EMAIL_FROM?.trim() || user;
  const port = Number(process.env.SMTP_PORT ?? 587);

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    return undefined;
  }

  return { from, host, pass, port, user };
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(smtpConfig());
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  const config = smtpConfig();
  if (!config) {
    throw new Error("email_delivery_not_configured");
  }

  const transport = nodemailer.createTransport({
    auth: {
      pass: config.pass,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });

  try {
    await transport.sendMail({
      from: `"NOF Platform" <${config.from}>`,
      html: passwordResetHtml(input.resetUrl, input.expiresAt),
      subject: "Восстановление пароля NOF Platform",
      text: passwordResetText(input.resetUrl, input.expiresAt),
      to: input.to,
    });
  } finally {
    transport.close();
  }
}

export async function sendRegistrationCodeEmail(input: RegistrationCodeEmailInput): Promise<void> {
  const config = smtpConfig();
  if (!config) {
    throw new Error("email_delivery_not_configured");
  }

  const transport = nodemailer.createTransport({
    auth: {
      pass: config.pass,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });

  try {
    await transport.sendMail({
      from: `"NOF Platform" <${config.from}>`,
      html: registrationCodeHtml(input.code),
      subject: "Код регистрации NOF Platform",
      text: registrationCodeText(input.code),
      to: input.to,
    });
  } finally {
    transport.close();
  }
}

function passwordResetText(resetUrl: string, expiresAt: string): string {
  return [
    "Запрошено восстановление пароля NOF Platform.",
    "",
    `Ссылка: ${resetUrl}`,
    `Срок действия: ${expiresAt}`,
    "",
    "Если вы не запрашивали восстановление, проигнорируйте это письмо.",
  ].join("\n");
}

function passwordResetHtml(resetUrl: string, expiresAt: string): string {
  const safeUrl = escapeHtml(resetUrl);
  const safeExpiresAt = escapeHtml(expiresAt);
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#18181b;max-width:560px">
      <h1 style="font-size:20px;margin:0 0 16px">Восстановление пароля NOF Platform</h1>
      <p>Запрошено восстановление пароля для учётной записи NOF Platform.</p>
      <p>
        <a href="${safeUrl}" style="display:inline-block;padding:10px 14px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px">
          Сменить пароль
        </a>
      </p>
      <p style="font-size:13px;color:#52525b">Срок действия ссылки: ${safeExpiresAt}</p>
      <p style="font-size:13px;color:#52525b">Если вы не запрашивали восстановление, проигнорируйте это письмо.</p>
    </div>
  `;
}

function registrationCodeText(code: string): string {
  return [
    "Код регистрации NOF Platform.",
    "",
    `Код: ${code}`,
    "",
    "Если вы не регистрировались на платформе, проигнорируйте это письмо.",
  ].join("\n");
}

function registrationCodeHtml(code: string): string {
  const safeCode = escapeHtml(code);
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#18181b;max-width:560px">
      <h1 style="font-size:20px;margin:0 0 16px">Код регистрации NOF Platform</h1>
      <p>Введите этот код на странице регистрации:</p>
      <p style="font-size:28px;letter-spacing:4px;font-weight:700">${safeCode}</p>
      <p style="font-size:13px;color:#52525b">Если вы не регистрировались на платформе, проигнорируйте это письмо.</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
