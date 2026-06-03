import Link from "next/link";
import React from "react";

type RegisterStep = "request" | "confirm";
type RegisterError = "unavailable" | "invalid" | "conflict" | undefined;

interface RegisterPageProps {
  email?: string;
  error?: RegisterError;
  step?: RegisterStep;
}

const registrationPrinciples = [
  "Регистрация доступна только через подтверждённую почту.",
  "Новый аккаунт получает личный профиль и базовые разделы платформы.",
  "Доступ к сервисам подключается отдельно по правилам платформы.",
  "Если письмо не пришло, проверьте папку Спам и попробуйте запросить код снова.",
];

function ErrorPanel({ error }: { error: RegisterError }) {
  if (!error) {
    return null;
  }

  const message =
    error === "unavailable"
      ? "Регистратор ушёл на обЭд кушать технические шоколадки. Регистрация скоро вернётся. Сейчас можно только войти в уже созданный аккаунт."
      : error === "conflict"
        ? "Не удалось создать аккаунт с такими данными."
        : "Проверьте введённые данные и попробуйте ещё раз.";

  return (
    <p className="rounded-sm border border-forge-accent bg-forge-surface px-3 py-2 text-sm font-semibold text-forge-accent">
      {message}
    </p>
  );
}

function RequestForm({ error }: { error: RegisterError }) {
  return (
    <form action="/api/portal/registration/request" className="grid max-w-md gap-3" method="post">
      <ErrorPanel error={error} />
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Логин</span>
        <input
          autoComplete="username"
          className="rounded-sm border border-forge-line bg-forge-surface px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          minLength={3}
          name="username"
          required
          type="text"
        />
      </label>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Email</span>
        <input
          autoComplete="email"
          className="rounded-sm border border-forge-line bg-forge-surface px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2">
        <span className="tech-label text-[10px] text-forge-muted">Пароль</span>
        <input
          autoComplete="new-password"
          className="rounded-sm border border-forge-line bg-forge-surface px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <button
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition hover:brightness-110"
        type="submit"
      >
        Получить код
      </button>
    </form>
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
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="panel grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex min-h-[560px] flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <p className="tech-label text-xs text-forge-accent">{"Narag'Othal Forgath"}</p>
            <h1 className="heading-tech mt-3 text-4xl font-bold text-forge-ink sm:text-5xl">
              {isConfirmStep ? "Введите код подтверждения" : "Стойка регистрации"}
            </h1>
            <p className="mt-4 text-sm leading-7 text-forge-muted">
              Создаём аккаунт только через проверенный email-код. После регистрации вы сможете войти в профиль и
              продолжить работу с сервисами платформы.
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

        <aside className="border-t border-forge-line bg-forge-surface p-6 sm:p-8 lg:border-l lg:border-t-0">
          <p className="tech-label text-xs text-forge-accent">Registration rules</p>
          <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">Как это работает</h2>
          <div className="mt-5 grid gap-3">
            {registrationPrinciples.map((item) => (
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
