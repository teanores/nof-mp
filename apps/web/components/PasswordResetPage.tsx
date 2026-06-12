"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { PortalLanguageSelect } from "@/components/PortalLanguageSelect";

interface PasswordResetPageProps {
  token?: string;
}

const passwordRules = [
  { label: "Минимум 12 символов", test: (value: string) => value.length >= 12 },
  { label: "Есть строчная буква", test: (value: string) => /[a-z]/.test(value) },
  { label: "Есть заглавная буква", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Есть цифра", test: (value: string) => /\d/.test(value) },
  { label: "Есть спецсимвол", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { label: "Нет пробелов и обратной кавычки", test: (value: string) => !/[\s`]/.test(value) },
];

interface ApiResponse {
  error?: string;
  errors?: string[];
  ok?: boolean;
}

class ApiError extends Error {
  readonly errors: string[];

  constructor(error: string, errors: string[] = []) {
    super(error);
    this.errors = errors;
  }
}

const policyErrorCopy: Record<string, string> = {
  password_common: "Пароль слишком простой.",
  password_contains_identity: "Пароль не должен содержать логин или email.",
  password_digit: "Добавь цифру.",
  password_disallowed_character: "Убери пробелы и обратную кавычку.",
  password_lowercase: "Добавь строчную букву.",
  password_min_length: "Минимум 12 символов.",
  password_symbol: "Добавь спецсимвол.",
  password_uppercase: "Добавь заглавную букву.",
};

async function postJson(url: string, body: unknown): Promise<ApiResponse> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = (await response.json().catch(() => ({}))) as ApiResponse;
  if (!response.ok) {
    throw new ApiError(data.error ?? "request_failed", data.errors ?? []);
  }
  return data;
}

function resetErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Не удалось выполнить запрос. Попробуйте позже.";
  }
  if (error.message === "password_policy") {
    const details = error instanceof ApiError ? error.errors.map((item) => policyErrorCopy[item]).filter(Boolean) : [];
    return details.length > 0
      ? `Новый пароль не соответствует правилам безопасности: ${details.join(" ")}`
      : "Новый пароль не соответствует правилам безопасности.";
  }
  if (error.message === "password_reset_fields_required") {
    return "Заполните все поля восстановления пароля.";
  }
  if (error.message === "invalid_or_expired_token") {
    return "Ссылка недействительна или срок действия истёк.";
  }
  return "Не удалось выполнить запрос. Попробуйте позже.";
}

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "submitting">("idle");
  const [error, setError] = useState<string | undefined>();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setStatus("submitting");
    try {
      await postJson("/api/public/password-reset/request", { email });
      setStatus("sent");
    } catch (caught) {
      setError(resetErrorMessage(caught));
      setStatus("idle");
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Электронная почта</span>
        <input
          autoComplete="email"
          className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <button
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === "submitting"}
        type="submit"
      >
        {status === "submitting" ? "Отправляем" : "Получить ссылку"}
      </button>
      {status === "sent" ? (
        <p className="rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-sm leading-6 text-forge-muted">
          Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-sm border border-forge-accent bg-forge-panel px-3 py-2 text-sm font-semibold text-forge-accent">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function ConfirmResetForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | undefined>();

  const checks = useMemo(
    () => [
      ...passwordRules.map((rule) => ({ isMet: rule.test(newPassword), label: rule.label })),
      {
        isMet: repeatedPassword.length > 0 && repeatedPassword === newPassword,
        label: "Повтор пароля совпадает",
      },
    ],
    [newPassword, repeatedPassword],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (newPassword !== repeatedPassword) {
      setError("Новые пароли не совпадают.");
      return;
    }
    setStatus("submitting");
    try {
      await postJson("/api/public/password-reset/confirm", { newPassword, token });
      setStatus("success");
      setNewPassword("");
      setRepeatedPassword("");
    } catch (caught) {
      setError(resetErrorMessage(caught));
      setStatus("idle");
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Новый пароль</span>
        <input
          autoComplete="new-password"
          className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          name="newPassword"
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
      </label>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Повтори новый пароль</span>
        <input
          autoComplete="new-password"
          className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          name="repeatedPassword"
          onChange={(event) => setRepeatedPassword(event.target.value)}
          required
          type="password"
          value={repeatedPassword}
        />
      </label>
      <ul className="grid gap-2 rounded-sm border border-forge-line bg-forge-surface p-3 text-sm text-forge-muted">
        {checks.map((check) => (
          <li key={check.label} className={check.isMet ? "text-forge-accent" : "text-forge-muted"}>
            <span className="font-bold">{check.isMet ? "+" : "-"}</span> {check.label}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="rounded-sm border border-forge-accent bg-forge-panel px-3 py-2 text-sm font-semibold text-forge-accent">
          {error}
        </p>
      ) : null}
      {status === "success" ? (
        <p className="rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-sm leading-6 text-forge-muted">
          Пароль изменён. Теперь можно войти с новым паролем.
        </p>
      ) : null}
      <button
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === "submitting"}
        type="submit"
      >
        {status === "submitting" ? "Сохраняем" : "Сменить пароль"}
      </button>
    </form>
  );
}

export function PasswordResetPage({ token = "" }: PasswordResetPageProps) {
  const hasToken = token.trim().length > 0;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="panel grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1fr_0.9fr]">
        <div className="flex min-h-[560px] flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="tech-label text-xs text-forge-accent">{"Narag'Othal Forgath"}</p>
              <div className="flex items-center gap-2">
                <span className="tech-label text-[10px] text-forge-muted">ЯЗЫК</span>
                <PortalLanguageSelect name="language" />
              </div>
            </div>
            <h1 className="heading-tech mt-3 text-4xl font-bold text-forge-ink sm:text-5xl">
              {hasToken ? "Новый пароль" : "Восстановление пароля"}
            </h1>
            <p className="mt-4 text-sm leading-7 text-forge-muted">
              {hasToken
                ? "Введите новый пароль для аккаунта платформы. Ссылка одноразовая и действует ограниченное время."
                : "Укажи почту аккаунта. Ответ будет одинаковым даже если аккаунт не найден, чтобы не раскрывать данные пользователей."}
            </p>
          </div>

          <div>{hasToken ? <ConfirmResetForm token={token} /> : <RequestResetForm />}</div>

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

        <aside className="border-t border-forge-line bg-forge-surface p-6 sm:p-8 lg:border-l lg:border-t-0">
          <p className="tech-label text-xs text-forge-accent">Безопасность</p>
          <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">Как работает восстановление</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Ссылка отправляется только на подтверждённую почту аккаунта.",
              "Ответ формы не раскрывает, существует ли пользователь с таким email.",
              "Ссылка одноразовая и перестаёт работать после смены пароля.",
              "Служебные и синтетические адреса не используются для самостоятельного восстановления.",
            ].map((item) => (
              <article key={item} className="rounded-sm border border-forge-line bg-forge-panel p-3">
                <p className="text-sm leading-6 text-forge-muted">{item}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
