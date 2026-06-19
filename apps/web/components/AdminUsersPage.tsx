"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
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
type AccountFilter = "all" | "password-login" | "telegram-only";
type RecoveryFilter = "all" | AdminUserRecoveryState;
type RiskFilter = "all" | "has-risks" | "no-risks";

const accountFilterLabels: Record<AccountFilter, string> = {
  all: "Все доступы",
  "password-login": "Вход по паролю",
  "telegram-only": "Пароль не задан",
};
const recoveryFilterLabels: Record<RecoveryFilter, string> = {
  all: "Все восстановления",
  "email-reset-ready": "Почтовое восстановление",
  "missing-email": "Почта не указана",
  "service-email": "Служебная почта",
};
const riskFilterLabels: Record<RiskFilter, string> = {
  all: "Все признаки",
  "has-risks": "Требуют внимания",
  "no-risks": "Без признаков",
};

function formatDate(value?: string): string {
  if (!value) {
    return "нет данных";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(username: string): string {
  return username.trim().slice(0, 2).toUpperCase() || "??";
}

function UserRiskBadges({ risks }: { risks: AdminUserRisk[] }) {
  if (risks.length === 0) {
    return <span className={`${badgeBaseClass} border-emerald-500/40 text-emerald-300`}>ок</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {risks.map((risk) => (
        <span key={risk} className={`${badgeBaseClass} border-amber-400/50 text-amber-200`}>
          {riskLabels[risk]}
        </span>
      ))}
    </div>
  );
}

function AccountState({ hasPassword }: { hasPassword: boolean }) {
  return hasPassword ? (
    <span className={`${badgeBaseClass} border-emerald-500/40 text-emerald-300`}>
      вход по паролю
    </span>
  ) : (
    <span className={`${badgeBaseClass} border-amber-400/50 text-amber-200`}>
      пароль не задан
    </span>
  );
}

function RecoveryState({ state }: { state: AdminUserRecoveryState }) {
  const isReady = state === "email-reset-ready";
  return (
    <span className={`${badgeBaseClass} ${isReady ? "border-emerald-500/40 text-emerald-300" : "border-amber-400/50 text-amber-200"}`}>
      {recoveryLabels[state]}
    </span>
  );
}

function AdminActionState({ user }: { user: AdminUserListItem }) {
  return (
    <Link
      aria-label={`Открыть ${user.username}`}
      className="tech-label inline-flex whitespace-nowrap rounded-sm border border-forge-line px-3 py-2 text-[10px] text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
      href={`/admin/users/${encodeURIComponent(user.id)}`}
    >
      Открыть
    </Link>
  );
}

export function AdminUsersPage({ users }: { users: AdminUserListItem[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [recoveryFilter, setRecoveryFilter] = useState<RecoveryFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const riskyUsers = users.filter((user) => user.risks.length > 0).length;
  const passwordLoginUsers = users.filter((user) => user.hasPassword).length;
  const emailRecoveryUsers = users.filter((user) => user.recoveryState === "email-reset-ready").length;
  const recoveryAttentionUsers = users.length - emailRecoveryUsers;
  const roleOptions = useMemo(() => {
    const roles = Array.from(
      new Set(users.map((user) => user.role?.displayName ?? user.role?.name).filter((role): role is string => Boolean(role))),
    ).sort((left, right) => left.localeCompare(right, "ru"));
    return roles;
  }, [users]);
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const role = user.role?.displayName ?? user.role?.name ?? "без роли";
      const searchable = [
        user.username,
        user.email ?? "",
        role,
        user.telegram?.username ? `@${user.telegram.username}` : "",
        user.telegram?.id ? String(user.telegram.id) : "",
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        return false;
      }
      if (roleFilter !== "all" && role !== roleFilter) {
        return false;
      }
      if (accountFilter !== "all" && user.accountState !== accountFilter) {
        return false;
      }
      if (recoveryFilter !== "all" && user.recoveryState !== recoveryFilter) {
        return false;
      }
      if (riskFilter === "has-risks" && user.risks.length === 0) {
        return false;
      }
      if (riskFilter === "no-risks" && user.risks.length > 0) {
        return false;
      }
      return true;
    });
  }, [accountFilter, query, recoveryFilter, riskFilter, roleFilter, users]);

  return (
    <PortalPageShell>
      <PortalHeader
        actions={
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-4 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
            К разделам кузницы
          </Link>
        }
        breadcrumbs={[
          { href: "/", label: "Портал" },
          { href: "/admin/users", label: "Пользователи" },
        ]}
        description="Справочник аккаунтов платформы: роли, Telegram-связки, почта и признаки риска доступа без отображения секретов."
        title="Пользователи"
      />

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Всего</p>
          <p className="heading-tech mt-2 text-3xl font-bold text-forge-ink">{users.length}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Требуют внимания</p>
          <p className="heading-tech mt-2 text-3xl font-bold text-amber-200">{riskyUsers}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Вход по паролю</p>
          <p className="heading-tech mt-2 text-3xl font-bold text-forge-ink">{passwordLoginUsers}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Восстановление по почте</p>
          <p className="heading-tech mt-2 text-3xl font-bold text-forge-ink">{emailRecoveryUsers}</p>
          {recoveryAttentionUsers > 0 ? <p className="mt-1 text-xs text-amber-200">разобрать: {recoveryAttentionUsers}</p> : null}
        </article>
      </section>

      <PortalActionBar eyebrow="Администрирование" title="Аккаунты платформы" />

      <section className="panel grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(160px,220px))]">
        <label className="block">
          <span className="tech-label text-[10px] text-forge-muted">Поиск</span>
          <input
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-bg px-3 py-2 text-sm text-forge-ink outline-none transition placeholder:text-forge-muted focus:border-forge-accent"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Имя, email, роль или Telegram"
            type="search"
            value={query}
          />
        </label>
        <label className="block">
          <span className="tech-label text-[10px] text-forge-muted">Роль</span>
          <select
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-bg px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            onChange={(event) => setRoleFilter(event.target.value)}
            value={roleFilter}
          >
            <option value="all">Все роли</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="tech-label text-[10px] text-forge-muted">Доступ</span>
          <select
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-bg px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            onChange={(event) => setAccountFilter(event.target.value as AccountFilter)}
            value={accountFilter}
          >
            {Object.entries(accountFilterLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="tech-label text-[10px] text-forge-muted">Восстановление</span>
          <select
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-bg px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            onChange={(event) => setRecoveryFilter(event.target.value as RecoveryFilter)}
            value={recoveryFilter}
          >
            {Object.entries(recoveryFilterLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="tech-label text-[10px] text-forge-muted">Признаки</span>
          <select
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-bg px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
            value={riskFilter}
          >
            {Object.entries(riskFilterLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="tech-label text-xs text-forge-muted lg:col-span-5">
          Показано: {filteredUsers.length} из {users.length}
        </p>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-forge-surface text-xs uppercase text-forge-muted">
              <tr>
                <th className="px-4 py-3">Пользователь</th>
                <th className="px-4 py-3">Электронная почта</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Telegram</th>
                <th className="px-4 py-3">Последняя активность</th>
                <th className="px-4 py-3">Доступ</th>
                <th className="px-4 py-3">Восстановление</th>
                <th className="px-4 py-3">Признаки</th>
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-forge-line">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-forge-line bg-forge-surface font-bold text-forge-accent">
                        {initials(user.username)}
                      </div>
                      <div>
                        <Link
                          className="font-bold text-forge-ink underline-offset-4 transition hover:text-forge-accent hover:underline"
                          href={`/admin/users/${encodeURIComponent(user.id)}`}
                        >
                          {user.username}
                        </Link>
                        <p className="text-xs text-forge-muted">{user.registrationSource ?? "источник неизвестен"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-forge-muted">{user.email ?? "почта не указана"}</td>
                  <td className="px-4 py-4 text-forge-muted">{user.role?.displayName ?? user.role?.name ?? "без роли"}</td>
                  <td className="px-4 py-4 text-forge-muted">
                    {user.telegram?.username ? `@${user.telegram.username}` : user.telegram?.id ? `id ${user.telegram.id}` : "нет"}
                  </td>
                  <td className="px-4 py-4 text-forge-muted">{formatDate(user.lastSeen)}</td>
                  <td className="px-4 py-4">
                    <AccountState hasPassword={user.hasPassword} />
                  </td>
                  <td className="px-4 py-4">
                    <RecoveryState state={user.recoveryState} />
                  </td>
                  <td className="px-4 py-4">
                    <UserRiskBadges risks={user.risks} />
                  </td>
                  <td className="px-4 py-4">
                    <AdminActionState user={user} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 ? (
            <p className="border-t border-forge-line px-4 py-6 text-sm text-forge-muted">Пользователи по выбранным фильтрам не найдены.</p>
          ) : null}
        </div>
      </section>
    </PortalPageShell>
  );
}
