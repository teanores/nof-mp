const SMARTCAPTCHA_VALIDATE_URL = "https://smartcaptcha.yandexcloud.net/validate";
const MOCK_SMARTCAPTCHA_TOKEN = "mock-smartcaptcha-token";

interface SmartCaptchaValidationInput {
  ip?: string;
  token?: string;
}

function captchaDisabled(): boolean {
  return process.env.CAPTCHA_DISABLED === "true" || !process.env.YANDEX_CAPTCHA_SERVER_KEY;
}

export function smartCaptchaEnabled(): boolean {
  return !captchaDisabled();
}

export async function verifySmartCaptchaToken(input: SmartCaptchaValidationInput): Promise<boolean> {
  const token = input.token?.trim() ?? "";
  if (captchaDisabled()) {
    return true;
  }
  if (!token) {
    return false;
  }
  if (process.env.YANDEX_CAPTCHA_SERVER_KEY === "test-server-key" && token === MOCK_SMARTCAPTCHA_TOKEN) {
    return true;
  }

  const body = new URLSearchParams();
  body.set("secret", process.env.YANDEX_CAPTCHA_SERVER_KEY ?? "");
  body.set("token", token);
  if (input.ip && input.ip !== "unknown") {
    body.set("ip", input.ip);
  }

  const response = await fetch(SMARTCAPTCHA_VALIDATE_URL, {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as { status?: string };
  return response.ok && payload.status === "ok";
}
