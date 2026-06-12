"use client";

import Link from "next/link";
import React from "react";

import { PortalLanguageSelect } from "@/components/PortalLanguageSelect";
import { usePortalLanguage } from "@/lib/use-portal-language";

interface LoginPageProps {
  error?: string;
  next?: string;
}

const copy = {
  en: {
    accountHint: "Use the account registered for Narag'Othal Forgath services.",
    createAccount: "Create account",
    email: "Email",
    forgeName: "Narag'Othal Forgath",
    invalidCredentials: "Invalid email or password.",
    language: "LANGUAGE",
    loginButton: "Sign in",
    password: "Password",
    resetPassword: "Forgot password?",
    tagline: '"Show your guild badge!"',
    subtitle: "Sign in to continue working with platform services.",
    title: "Forge checkpoint",
  },
  ru: {
    accountHint: "Используй аккаунт, зарегистрированный для сервисов Narag'Othal Forgath.",
    createAccount: "Создать аккаунт",
    email: "Электронная почта",
    forgeName: "Narag'Othal Forgath",
    invalidCredentials: "Неверный email или пароль.",
    language: "ЯЗЫК",
    loginButton: "Войти",
    password: "Пароль",
    resetPassword: "Забыли пароль?",
    tagline: "«Покажите жетон гильдии!»",
    subtitle: "Войдите, чтобы продолжить работу с сервисами платформы.",
    title: "Проходная Кузни",
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
      <section className="panel w-full max-w-md overflow-hidden p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="tech-label text-xs text-forge-accent">{text.forgeName}</p>
          <div className="flex items-center gap-2">
            <span className="tech-label text-[10px] text-forge-muted">{text.language}</span>
            <PortalLanguageSelect formId="portal-login-form" name="language" />
          </div>
        </div>

        <div className="mt-10 text-center" data-testid="login-copy-block">
          <h1 className="heading-tech text-4xl font-bold text-forge-ink">{text.title}</h1>
          <p className="mt-3 text-sm font-semibold italic leading-6 text-forge-accent">{text.tagline}</p>
          <p className="mt-4 text-sm leading-7 text-forge-muted">{text.subtitle}</p>
        </div>

        <form id="portal-login-form" action="/api/login" className="mt-8 grid gap-3" method="post">
          <input name="next" type="hidden" value={safeNext} />
          <label className="grid gap-2">
            <span className="tech-label text-[10px] text-forge-muted">{text.email}</span>
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
          <Link className="text-right text-xs font-semibold text-forge-muted transition hover:text-forge-accent" href="/password-reset">
            {text.resetPassword}
          </Link>
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
            className="tech-label rounded-sm border border-forge-line bg-forge-panel px-5 py-3 text-center text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
            href="/register"
          >
            {text.createAccount}
          </Link>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-forge-muted">{text.accountHint}</p>
      </section>
    </main>
  );
}
