"use client";

import Link from "next/link";
import React, { useState } from "react";

import { PortalLanguageSelect } from "@/components/PortalLanguageSelect";

type RegisterStep = "request" | "confirm";
type RegisterError = "unavailable" | "invalid" | "conflict" | undefined;

interface RegisterPageProps {
  email?: string;
  error?: RegisterError;
  step?: RegisterStep;
}

function ErrorPanel({ error }: { error: RegisterError }) {
  if (!error) {
    return null;
  }

  const message =
    error === "unavailable"
      ? "Регистрация временно недоступна. Мы уже восстанавливаем приём новых аккаунтов; сейчас можно войти в уже созданную учётную запись."
      : error === "conflict"
        ? "Не удалось создать аккаунт с такими данными."
        : "Проверьте введённые данные и попробуйте ещё раз.";

  return (
    <p className="rounded-sm border border-forge-accent bg-forge-surface px-3 py-2 text-sm font-semibold text-forge-accent">
      {message}
    </p>
  );
}

const passwordRuleCopy = [
  { key: "length", label: "Минимум 12 символов", test: (password: string) => password.length >= 12 },
  { key: "lowercase", label: "Есть строчная буква", test: (password: string) => /[a-z]/.test(password) },
  { key: "uppercase", label: "Есть заглавная буква", test: (password: string) => /[A-Z]/.test(password) },
  { key: "digit", label: "Есть цифра", test: (password: string) => /\d/.test(password) },
  { key: "symbol", label: "Есть спецсимвол", test: (password: string) => /[^A-Za-z0-9]/.test(password) },
  { key: "safe", label: "Нет пробелов и обратной кавычки", test: (password: string) => !/[\s`]/.test(password) },
] as const;

function RequestForm({ error }: { error: RegisterError }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isRepeatedPasswordVisible, setIsRepeatedPasswordVisible] = useState(false);
  const passwordRules = [
    ...passwordRuleCopy.map((rule) => ({ isMet: rule.test(password), label: rule.label })),
    {
      isMet: repeatedPassword.length > 0 && password === repeatedPassword,
      label: "Повтор пароля совпадает",
    },
  ];
  const canSubmit = username.trim().length >= 3 && email.trim().length > 0 && passwordRules.every((rule) => rule.isMet);

  return (
    <form id="portal-registration-form" action="/api/portal/registration/request" className="grid max-w-md gap-2.5" method="post">
      <ErrorPanel error={error} />
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Логин</span>
        <input
          autoComplete="username"
          className="rounded-sm border border-forge-line bg-forge-surface px-3 py-2.5 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          minLength={3}
          name="username"
          required
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Электронная почта</span>
        <input
          autoComplete="email"
          className="rounded-sm border border-forge-line bg-forge-surface px-3 py-2.5 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          name="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Пароль</span>
        <span className="relative block">
          <input
            autoComplete="new-password"
            className="w-full rounded-sm border border-forge-line bg-forge-surface px-3 py-2.5 pr-12 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            minLength={12}
            name="password"
            required
            type={isPasswordVisible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordVisibilityButton
            isVisible={isPasswordVisible}
            hideLabel="Скрыть пароль"
            showLabel="Показать пароль"
            onClick={() => setIsPasswordVisible((current) => !current)}
          />
        </span>
      </label>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Повтори пароль</span>
        <span className="relative block">
          <input
            autoComplete="new-password"
            className="w-full rounded-sm border border-forge-line bg-forge-surface px-3 py-2.5 pr-12 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            minLength={12}
            name="repeatedPassword"
            required
            type={isRepeatedPasswordVisible ? "text" : "password"}
            value={repeatedPassword}
            onChange={(event) => setRepeatedPassword(event.target.value)}
          />
          <PasswordVisibilityButton
            isVisible={isRepeatedPasswordVisible}
            hideLabel="Скрыть повтор пароля"
            showLabel="Показать повтор пароля"
            onClick={() => setIsRepeatedPasswordVisible((current) => !current)}
          />
        </span>
      </label>
      <div className="rounded-sm border border-forge-line bg-forge-surface p-2.5" aria-live="polite">
        <p className="tech-label text-[10px] text-forge-muted">Правила пароля</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {passwordRules.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-xs leading-5 ${rule.isMet ? "text-forge-accent" : "text-forge-muted"}`}
            >
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border text-[10px] ${
                  rule.isMet ? "border-forge-accent bg-forge-accent text-black" : "border-forge-line bg-forge-panel text-forge-muted"
                }`}
              >
                {rule.isMet ? "+" : "-"}
              </span>
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <label className="flex items-start gap-3 rounded-sm border border-forge-line bg-forge-surface p-2.5 text-sm leading-6 text-forge-muted">
        <input
          checked={false}
          className="mt-1 h-4 w-4 rounded-sm border-forge-line bg-forge-panel"
          disabled
          readOnly
          type="checkbox"
        />
        <span>
          Согласие с условиями появится после публикации настоящего соглашения. Сейчас это неактивный пример для
          проверки дизайна. Черновик страницы:{" "}
          <Link className="font-semibold text-forge-accent transition hover:text-forge-ink" href="/legal">
            Юридические аспекты
          </Link>
          .
        </span>
      </label>
      <button
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition hover:brightness-110"
        disabled={!canSubmit}
        type="submit"
      >
        Получить код
      </button>
    </form>
  );
}

function PasswordVisibilityButton({
  hideLabel,
  isVisible,
  onClick,
  showLabel,
}: {
  hideLabel: string;
  isVisible: boolean;
  onClick: () => void;
  showLabel: string;
}) {
  return (
    <button
      aria-label={isVisible ? hideLabel : showLabel}
      aria-pressed={isVisible}
      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm border border-transparent text-forge-muted transition hover:border-forge-line hover:text-forge-accent focus:border-forge-accent focus:outline-none"
      title={isVisible ? hideLabel : showLabel}
      type="button"
      onClick={onClick}
    >
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        {isVisible ? (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
            <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.5 4.1 10 8a15.2 15.2 0 0 1-3.1 4.8" />
            <path d="M6.6 6.6A15.2 15.2 0 0 0 2 12c1.5 3.9 5 8 10 8a10.7 10.7 0 0 0 4.1-.8" />
          </>
        ) : (
          <>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}

function ConfirmForm({ email, error }: { email: string; error: RegisterError }) {
  return (
    <form action="/api/portal/registration/confirm" className="grid max-w-md gap-3" method="post">
      <ErrorPanel error={error} />
      <input name="email" type="hidden" value={email} />
      <p className="text-sm leading-6 text-forge-muted">
        Код отправлен на <span className="font-semibold text-forge-ink">{email}</span>. Введите его, чтобы завершить
        регистрацию.
      </p>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Код из письма</span>
        <input
          autoComplete="one-time-code"
          className="rounded-sm border border-forge-line bg-forge-surface px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          inputMode="numeric"
          maxLength={6}
          minLength={6}
          name="code"
          required
          type="text"
        />
      </label>
      <button
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition hover:brightness-110"
        type="submit"
      >
        Завершить регистрацию
      </button>
      <Link
        className="tech-label text-xs text-forge-muted transition hover:text-forge-accent"
        href="/register"
      >
        Запросить новый код
      </Link>
    </form>
  );
}

export function RegisterPage({ email = "", error, step = "request" }: RegisterPageProps) {
  const isConfirmStep = step === "confirm" && email;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-6">
      <section className="panel w-full max-w-lg overflow-hidden">
        <div className="flex min-h-[520px] flex-col justify-between gap-6 p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="tech-label text-xs text-forge-accent">{"Narag'Othal Forgath"}</p>
              <div className="flex items-center gap-2">
                <span className="tech-label text-[10px] text-forge-muted">ЯЗЫК</span>
                <PortalLanguageSelect formId="portal-registration-form" name="language" />
              </div>
            </div>
            <h1 className="heading-tech mt-3 text-3xl font-bold text-forge-ink sm:text-4xl">
              {isConfirmStep ? "Введите код подтверждения" : "Стойка регистрации"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-forge-muted">
              Создаём аккаунт только через проверенный email-код. После регистрации вы сможете войти в профиль и
              продолжить работу с сервисами платформы. Внешние мессенджеры не используются как самостоятельный способ
              входа.
            </p>
          </div>

          {isConfirmStep ? <ConfirmForm email={email} error={error} /> : <RequestForm error={error} />}

          <div className="flex flex-wrap gap-3">
            <Link
              className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
              href="/login"
            >
              Войти
            </Link>
            <Link
              className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
              href="/"
            >
              На портал
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
