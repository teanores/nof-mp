"use client";

import Link from "next/link";
import React from "react";

import { PortalLanguageSelect } from "@/components/PortalLanguageSelect";
import { usePortalLanguage } from "@/lib/use-portal-language";

interface LoginPageProps {
  error?: string;
  next?: string;
}

const authMethods = [
  {
    description: {
      en: "Current working sign-in through Dragon Forge users.",
      ru: "Текущий рабочий вход через пользователей Dragon Forge.",
    },
    status: "active",
    title: "Email + password",
  },
  {
    description: {
      en: "Target external sign-in; tracked as a separate task.",
      ru: "Целевой внешний вход, будет добавлен отдельной задачей.",
    },
    status: "planned",
    title: "Google OAuth",
  },
  {
    description: {
      en: "Target external sign-in; tracked as a separate task.",
      ru: "Целевой внешний вход, будет добавлен отдельной задачей.",
    },
    status: "planned",
    title: "Yandex OAuth",
  },
  {
    description: {
      en: "Target sign-in for Telegram flows and bots.",
      ru: "Целевой вход для Telegram-сценариев и ботов.",
    },
    status: "planned",
    title: "Telegram OAuth",
  },
];

const copy = {
  en: {
    currentMode: "Current mode",
    forgeName: "Narag'Othal Forgath",
    invalidCredentials: "Invalid email or password.",
    language: "LANGUAGE",
    loginButton: "Sign in",
    password: "Password",
    register: "Registration",
    subtitle: "The portal uses the shared Dragon Forge user database. After sign-in, you return to the safe route",
    title: "Unified forge sign-in",
    workingMode:
      "This is currently a bridge to the Python Dragon Forge authorization. OAuth2 and Telegram sign-in remain separate May-goal tasks.",
  },
  ru: {
    currentMode: "Current mode",
    forgeName: "Narag'Othal Forgath",
    invalidCredentials: "Неверный email или пароль.",
    language: "ЯЗЫК",
    loginButton: "Войти",
    password: "Пароль",
    register: "Регистрация",
    subtitle: "Портал использует общую базу пользователей Dragon Forge. После входа ты возвращаешься на безопасный маршрут",
    title: "Единый вход в кузницу",
    workingMode:
      "Сейчас это мост к Python-авторизации Dragon Forge. OAuth2 и Telegram-вход остаются отдельными задачами майской цели.",
  },
};

function safeLoginReturnTo(returnTo?: string): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.startsWith("/login")) {
    return "/";
  }
  return returnTo;
}

export function LoginPage({ error, next = "/" }: LoginPageProps) {
  const safeNext = safeLoginReturnTo(next);
  const language = usePortalLanguage();
  const text = copy[language];

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="panel grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1fr_0.95fr]">
        <div className="flex min-h-[560px] flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="tech-label text-xs text-forge-accent">Dragon Forge / Auth Boundary</p>
              <div className="flex items-center gap-2">
                <span className="tech-label text-[10px] text-forge-muted">{text.language}</span>
                <PortalLanguageSelect formId="portal-login-form" name="language" />
              </div>
            </div>
            <p className="tech-label mt-10 text-xs text-forge-muted">{text.forgeName}</p>
            <h1 className="heading-tech mt-3 text-4xl font-bold text-forge-ink sm:text-5xl">{text.title}</h1>
            <p className="mt-4 text-sm leading-7 text-forge-muted">
              {text.subtitle} <span className="font-semibold text-forge-ink">{safeNext}</span>.
            </p>
          </div>

          <div className="grid gap-3">
            {authMethods.map((method) => (
              <article key={method.title} className="rounded-sm border border-forge-line bg-forge-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-forge-ink">{method.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-forge-muted">{method.description[language]}</p>
                  </div>
                  <span className="tech-label rounded-sm border border-forge-line px-2 py-1 text-[10px] text-forge-muted">
                    {method.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="border-t border-forge-line bg-forge-surface p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="flex h-full flex-col justify-center gap-6">
            <div>
              <p className="tech-label text-xs text-forge-accent">{text.currentMode}</p>
              <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">Email + password</h2>
              <p className="mt-3 text-sm leading-6 text-forge-muted">{text.workingMode}</p>
            </div>

            <form id="portal-login-form" action="/api/login" className="grid gap-3" method="post">
              <input name="next" type="hidden" value={safeNext} />
              <label className="grid gap-2">
                <span className="tech-label text-[10px] text-forge-muted">Email</span>
                <input
                  autoComplete="email"
                  className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
                  name="username"
                  required
                  type="email"
                />
              </label>
              <label className="grid gap-2">
                <span className="tech-label text-[10px] text-forge-muted">{text.password}</span>
                <input
                  autoComplete="current-password"
                  className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
                  name="password"
                  required
                  type="password"
                />
              </label>
              {error === "invalid_credentials" ? (
                <p className="rounded-sm border border-forge-accent bg-forge-panel px-3 py-2 text-sm font-semibold text-forge-accent">
                  {text.invalidCredentials}
                </p>
              ) : null}
              <button
                className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition hover:brightness-110"
                type="submit"
              >
                {text.loginButton}
              </button>
              <Link
                className="tech-label text-center rounded-sm border border-forge-line bg-forge-panel px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
                href="/register"
              >
                {text.register}
              </Link>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
