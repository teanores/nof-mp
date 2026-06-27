"use client";

import Script from "next/script";

interface SmartCaptchaProps {
  hidden?: boolean;
}

const clientKey = process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY;

export function SmartCaptcha({ hidden = false }: SmartCaptchaProps) {
  if (!clientKey) {
    return <input name="smart-token" type="hidden" value="mock-smartcaptcha-token" />;
  }

  return (
    <>
      <Script src="https://smartcaptcha.yandexcloud.net/captcha.js" strategy="afterInteractive" />
      <div
        className={hidden ? "sr-only" : "min-h-[102px]"}
        data-hl="ru"
        data-sitekey={clientKey}
        data-testid="smartcaptcha-widget"
      />
    </>
  );
}
