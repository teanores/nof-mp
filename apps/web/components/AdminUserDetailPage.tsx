import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { AdminUserListItem, AdminUserRecoveryState, AdminUserRisk } from "@/lib/server/admin-users-repository";

const riskLabels: Record<AdminUserRisk, string> = {
  "external-email": "почта вне домена",
  "missing-password": "нет пароля",
  "telegram-placeholder-email": "служебная telegram-почта",
};

const recoveryLabels: Record<AdminUserRecoveryState, string> = {
  "email-reset-ready": "почтовое восстановление",
  "missing-email": "почта не указана",
  "service-email": "служебная почта",
};

const badgeBaseClass = "tech-label inline-flex whitespace-nowrap rounded-sm border px-2 py-1 text-[10px]";

function formatDate(value?: string): string {
  if (!value) {
    return "нет данных";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <p className="tech-label text-xs text-forge-muted">{label}</p>
      <div className="mt-2 text-sm font-semibold text-forge-ink">{value}</div>
    </div>
  );
}

function StatusBadge({ children, ready = false }: { children: React.ReactNode; ready?: boolean }) {
  return (
    <span className={`${badgeBaseClass} ${ready ? "border-emerald-500/40 text-emerald-300" : "border-amber-400/50 text-amber-200"}`}>
      {children}
    </span>
  );
}

function recoveryBlockReason(user: AdminUserListItem): string {
  if (user.recoveryState === "missing-email") {
    return "У пользователя не указана электронная почта. Сначала добавь реальную электронную почту.";
  }
  if (user.recoveryState === "service-email") {
    return "У пользователя служебная почта. Сначала нужна реальная электронная почта.";
  }
  return "";
}

function RecoveryActions({ user }: { user: AdminUserListItem }) {
  const canRecoverByEmail = user.recoveryState === "email-reset-ready" && Boolean(user.email);
  const resetHref = canRecoverByEmail ? `/password-reset?email=${encodeURIComponent(user.email ?? "")}` : "";

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Действия с доступом</h2>
          <p className="mt-2 text-sm leading-6 text-forge-muted">
            {canRecoverByEmail ? "Почтовое восстановление доступно" : "Восстановление по почте недоступно"}
          </p>
          {!canRecoverByEmail ? <p className="mt-1 text-sm leading-6 text-forge-muted">{recoveryBlockReason(user)}</p> : null}
        </div>
        {canRecoverByEmail ? (
          <Link
            className="tech-label inline-flex min-h-10 items-center justify-center rounded-sm border border-forge-accent bg-forge-accent px-4 py-2 text-xs font-bold text-black transition hover:brightness-110"
            href={resetHref}
          >
            Открыть восстановление пароля
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function AdminUserDetailPage({ user }: { user: AdminUserListItem }) {
  const telegram = user.telegram?.username ? `@${user.telegram.username}` : user.telegram?.id ? `id ${user.telegram.id}` : "нет";
  const role = user.role?.displayName ?? user.role?.name ?? "без роли";

  return (
    <PortalPageShell>
      <PortalHeader
        actions={
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-4 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/admin/users">
            К списку пользователей
          </Link>
        }
        breadcrumbs={[
          { href: "/", label: "Портал" },
          { href: "/admin", label: "Администрирование" },
          { href: "/admin/users", label: "Пользователи" },
        ]}
        description="Безопасный просмотр состояния аккаунта без отображения паролей, токенов, секретов и внутренних подключений."
        title="Карточка пользователя"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Пользователь" value={user.username} />
        <Field label="Электронная почта" value={user.email ?? "почта не указана"} />
        <Field label="Роль" value={role} />
        <Field label="Telegram" value={telegram} />
        <Field label="Источник регистрации" value={user.registrationSource ?? "источник неизвестен"} />
        <Field label="Создан" value={formatDate(user.createdAt)} />
        <Field label="Последняя активность" value={formatDate(user.lastSeen)} />
        <Field label="Доступ" value={<StatusBadge ready={user.hasPassword}>{user.hasPassword ? "вход по паролю" : "пароль не задан"}</StatusBadge>} />
        <Field label="Восстановление" value={<StatusBadge ready={user.recoveryState === "email-reset-ready"}>{recoveryLabels[user.recoveryState]}</StatusBadge>} />
      </section>

      <section className="panel p-4">
        <p className="tech-label text-xs text-forge-muted">Признаки риска доступа</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {user.risks.length === 0 ? (
            <StatusBadge ready>ок</StatusBadge>
          ) : (
            user.risks.map((risk) => <StatusBadge key={risk}>{riskLabels[risk]}</StatusBadge>)
          )}
        </div>
      </section>

      <RecoveryActions user={user} />
    </PortalPageShell>
  );
}
