"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { PasswordVisibilityButton } from "@/components/PasswordVisibilityButton";
import { PortalLanguageSelect } from "@/components/PortalLanguageSelect";
import type { PortalLanguage } from "@/lib/portal-language";
import { usePortalLanguage } from "@/lib/use-portal-language";

interface PasswordResetPageProps {
  initialEmail?: string;
  token?: string;
  tokenStatus?: "invalid" | "valid";
}

const passwordRules = [
  { key: "minLength", test: (value: string) => value.length >= 12 },
  { key: "lowercase", test: (value: string) => /[a-z]/.test(value) },
  { key: "uppercase", test: (value: string) => /[A-Z]/.test(value) },
  { key: "digit", test: (value: string) => /\d/.test(value) },
  { key: "symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
  { key: "noWhitespace", test: (value: string) => !/[\s`]/.test(value) },
] as const;

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

const copy = {
  en: {
    backToPortal: "Portal",
    confirmButton: "Change password",
    confirmIntro: "Enter a new platform account password. The link is single-use and expires after a limited time.",
    confirmTitle: "New password",
    email: "Email",
    expiredIntro: "Request a new password recovery link to continue.",
    expiredTitle: "Link expired",
    forgeName: "Narag'Othal Forgath",
    genericError: "Request failed. Try again later.",
    invalidToken: "This link is invalid or expired.",
    language: "LANGUAGE",
    login: "Sign in",
    newPassword: "New password",
    passwordChanged: "Password changed. You can now sign in with the new password.",
    passwordHide: "Hide new password",
    passwordMismatch: "New passwords do not match.",
    passwordShow: "Show new password",
    policyGeneric: "The new password does not meet security rules.",
    policyPrefix: "The new password does not meet security rules:",
    repeatMatches: "Repeated password matches",
    repeatPasswordHide: "Hide repeated password",
    repeatPassword: "Repeat new password",
    repeatPasswordShow: "Show repeated password",
    requestButton: "Get link",
    requestNewLink: "Get a new link",
    requestIntro: "Enter the account email. The response is the same even if the account is not found, so user data is not exposed.",
    requestSent: "If such an account exists and can receive email, we will send a password recovery link.",
    requestTitle: "Password recovery",
    rules: {
      digit: "Contains a digit",
      lowercase: "Contains a lowercase letter",
      minLength: "At least 12 characters",
      noWhitespace: "No spaces or backticks",
      symbol: "Contains a special character",
      uppercase: "Contains an uppercase letter",
    },
    submittingConfirm: "Saving",
    submittingRequest: "Sending",
  },
  ru: {
    backToPortal: "На портал",
    confirmButton: "Сменить пароль",
    confirmIntro: "Введите новый пароль для аккаунта платформы. Ссылка одноразовая и действует ограниченное время.",
    confirmTitle: "Новый пароль",
    email: "Электронная почта",
    expiredIntro: "Запросите новую ссылку для восстановления пароля.",
    expiredTitle: "Ссылка истекла",
    forgeName: "Narag'Othal Forgath",
    genericError: "Не удалось выполнить запрос. Попробуйте позже.",
    invalidToken: "Ссылка недействительна или срок действия истёк.",
    language: "ЯЗЫК",
    login: "Войти",
    newPassword: "Новый пароль",
    passwordChanged: "Пароль изменён. Теперь можно войти с новым паролем.",
    passwordHide: "Скрыть новый пароль",
    passwordMismatch: "Новые пароли не совпадают.",
    passwordShow: "Показать новый пароль",
    policyGeneric: "Новый пароль не соответствует правилам безопасности.",
    policyPrefix: "Новый пароль не соответствует правилам безопасности:",
    repeatMatches: "Повтор пароля совпадает",
    repeatPassword: "Повтори новый пароль",
    repeatPasswordHide: "Скрыть повтор пароля",
    repeatPasswordShow: "Показать повтор пароля",
    requestButton: "Получить ссылку",
    requestNewLink: "Получить новую ссылку",
    requestIntro: "Укажи почту аккаунта. Ответ будет одинаковым даже если аккаунт не найден, чтобы не раскрывать данные пользователей.",
    requestSent: "Если такой аккаунт существует и может получать письма, мы отправим ссылку для восстановления пароля.",
    requestTitle: "Восстановление пароля",
    rules: {
      digit: "Есть цифра",
      lowercase: "Есть строчная буква",
      minLength: "Минимум 12 символов",
      noWhitespace: "Нет пробелов и обратной кавычки",
      symbol: "Есть спецсимвол",
      uppercase: "Есть заглавная буква",
    },
    submittingConfirm: "Сохраняем",
    submittingRequest: "Отправляем",
  },
};

const policyErrorCopy: Record<PortalLanguage, Record<string, string>> = {
  en: {
    password_common: "The password is too simple.",
    password_contains_identity: "The password must not contain login or email.",
    password_digit: "Add a digit.",
    password_disallowed_character: "Remove spaces and backticks.",
    password_lowercase: "Add a lowercase letter.",
    password_min_length: "Use at least 12 characters.",
    password_symbol: "Add a special character.",
    password_uppercase: "Add an uppercase letter.",
  },
  ru: {
    password_common: "Пароль слишком простой.",
    password_contains_identity: "Пароль не должен содержать логин или email.",
    password_digit: "Добавь цифру.",
    password_disallowed_character: "Убери пробелы и обратную кавычку.",
    password_lowercase: "Добавь строчную букву.",
    password_min_length: "Минимум 12 символов.",
    password_symbol: "Добавь спецсимвол.",
    password_uppercase: "Добавь заглавную букву.",
  },
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

function resetErrorMessage(error: unknown, language: PortalLanguage): string {
  const text = copy[language];
  if (!(error instanceof Error)) {
    return text.genericError;
  }
  if (error.message === "password_policy") {
    const details = error instanceof ApiError ? error.errors.map((item) => policyErrorCopy[language][item]).filter(Boolean) : [];
    return details.length > 0 ? `${text.policyPrefix} ${details.join(" ")}` : text.policyGeneric;
  }
  if (error.message === "password_reset_fields_required") {
    return language === "ru" ? "Заполните все поля восстановления пароля." : "Fill in all password recovery fields.";
  }
  if (error.message === "invalid_or_expired_token") {
    return text.invalidToken;
  }
  return text.genericError;
}

function RequestResetForm({ initialEmail = "", language }: { initialEmail?: string; language: PortalLanguage }) {
  const text = copy[language];
  const [email, setEmail] = useState(initialEmail);
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
      setError(resetErrorMessage(caught, language));
      setStatus("idle");
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">{text.email}</span>
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
        {status === "submitting" ? text.submittingRequest : text.requestButton}
      </button>
      {status === "sent" ? (
        <p className="rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-sm leading-6 text-forge-muted">
          {text.requestSent}
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

function ConfirmResetForm({ language, token }: { language: PortalLanguage; token: string }) {
  const router = useRouter();
  const text = copy[language];
  const [newPassword, setNewPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isRepeatedPasswordVisible, setIsRepeatedPasswordVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | undefined>();

  const checks = useMemo(
    () => [
      ...passwordRules.map((rule) => ({ isMet: rule.test(newPassword), label: text.rules[rule.key] })),
      {
        isMet: repeatedPassword.length > 0 && repeatedPassword === newPassword,
        label: text.repeatMatches,
      },
    ],
    [newPassword, repeatedPassword, text],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (newPassword !== repeatedPassword) {
      setError(text.passwordMismatch);
      return;
    }
    setStatus("submitting");
    try {
      await postJson("/api/public/password-reset/confirm", { newPassword, token });
      setStatus("success");
      setNewPassword("");
      setRepeatedPassword("");
      router.push("/");
    } catch (caught) {
      setError(resetErrorMessage(caught, language));
      setStatus("idle");
    }
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">{text.newPassword}</span>
        <span className="relative block">
          <input
            autoComplete="new-password"
            className="w-full rounded-sm border border-forge-line bg-forge-panel px-3 py-3 pr-12 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            name="newPassword"
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type={isNewPasswordVisible ? "text" : "password"}
            value={newPassword}
          />
          <PasswordVisibilityButton
            hideLabel={text.passwordHide}
            isVisible={isNewPasswordVisible}
            showLabel={text.passwordShow}
            onClick={() => setIsNewPasswordVisible((current) => !current)}
          />
        </span>
      </label>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">{text.repeatPassword}</span>
        <span className="relative block">
          <input
            autoComplete="new-password"
            className="w-full rounded-sm border border-forge-line bg-forge-panel px-3 py-3 pr-12 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            name="repeatedPassword"
            onChange={(event) => setRepeatedPassword(event.target.value)}
            required
            type={isRepeatedPasswordVisible ? "text" : "password"}
            value={repeatedPassword}
          />
          <PasswordVisibilityButton
            hideLabel={text.repeatPasswordHide}
            isVisible={isRepeatedPasswordVisible}
            showLabel={text.repeatPasswordShow}
            onClick={() => setIsRepeatedPasswordVisible((current) => !current)}
          />
        </span>
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
          {text.passwordChanged}
        </p>
      ) : null}
      <button
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === "submitting"}
        type="submit"
      >
        {status === "submitting" ? text.submittingConfirm : text.confirmButton}
      </button>
    </form>
  );
}

function ExpiredResetLink({ language }: { language: PortalLanguage }) {
  const text = copy[language];

  return (
    <div className="grid gap-3">
      <p className="rounded-sm border border-forge-accent bg-forge-panel px-3 py-3 text-sm font-semibold leading-6 text-forge-accent">
        {text.invalidToken}
      </p>
      <Link
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-center text-xs font-bold text-black transition hover:brightness-110"
        href="/password-reset"
      >
        {text.requestNewLink}
      </Link>
    </div>
  );
}

export function PasswordResetPage({ initialEmail = "", token = "", tokenStatus }: PasswordResetPageProps) {
  const hasToken = token.trim().length > 0;
  const isInvalidToken = hasToken && tokenStatus === "invalid";
  const language = usePortalLanguage();
  const text = copy[language];

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="panel w-full max-w-xl overflow-hidden">
        <div className="flex min-h-[560px] flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="tech-label text-xs text-forge-accent">{text.forgeName}</p>
              <div className="flex items-center gap-2">
                <span className="tech-label text-[10px] text-forge-muted">{text.language}</span>
                <PortalLanguageSelect name="language" />
              </div>
            </div>
            <h1 className="heading-tech mt-3 text-4xl font-bold text-forge-ink sm:text-5xl">
              {isInvalidToken ? text.expiredTitle : hasToken ? text.confirmTitle : text.requestTitle}
            </h1>
            <p className="mt-4 text-sm leading-7 text-forge-muted">
              {isInvalidToken ? text.expiredIntro : hasToken ? text.confirmIntro : text.requestIntro}
            </p>
          </div>

          <div>
            {isInvalidToken ? (
              <ExpiredResetLink language={language} />
            ) : hasToken ? (
              <ConfirmResetForm language={language} token={token} />
            ) : (
              <RequestResetForm initialEmail={initialEmail} language={language} />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
              href="/login"
            >
              {text.login}
            </Link>
            <Link
              className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
              href="/"
            >
              {text.backToPortal}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
