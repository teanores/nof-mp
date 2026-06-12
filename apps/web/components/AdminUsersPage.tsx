import Link from "next/link";
import React from "react";

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

function AdminActionState() {
  return (
    <span className={`${badgeBaseClass} border-forge-line text-forge-muted`}>
      блокировка готовится
    </span>
  );
}

export function AdminUsersPage({ users }: { users: AdminUserListItem[] }) {
  const riskyUsers = users.filter((user) => user.risks.length > 0).length;
  const passwordLoginUsers = users.filter((user) => user.hasPassword).length;
  const emailRecoveryUsers = users.filter((user) => user.recoveryState === "email-reset-ready").length;
  const recoveryAttentionUsers = users.length - emailRecoveryUsers;

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

      <section className="panel grid gap-3 p-4 text-sm text-forge-muted md:grid-cols-2">
        <div>
          <p className="tech-label text-xs text-forge-ink">Что уже можно контролировать</p>
          <p className="mt-2">Видны роли, почта, Telegram-связки, наличие пароля, готовность восстановления, последняя активность и признаки риска доступа.</p>
        </div>
        <div>
          <p className="tech-label text-xs text-forge-ink">Что нельзя имитировать</p>
          <p className="mt-2">Блокировка аккаунта появится только после серверной проверки запрета входа.</p>
        </div>
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
              {users.map((user) => (
                <tr key={user.id} className="border-t border-forge-line">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-forge-line bg-forge-surface font-bold text-forge-accent">
                        {initials(user.username)}
                      </div>
                      <div>
                        <p className="font-bold text-forge-ink">{user.username}</p>
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
                    <AdminActionState />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PortalPageShell>
  );
}
