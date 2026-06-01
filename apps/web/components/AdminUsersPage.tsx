import Link from "next/link";
import React from "react";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { AdminUserListItem, AdminUserRisk } from "@/lib/server/admin-users-repository";

const riskLabels: Record<AdminUserRisk, string> = {
  "external-email": "внешний email",
  "missing-password": "нет пароля",
  "telegram-placeholder-email": "telegram email",
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
    return <span className="tech-label rounded-sm border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-300">ок</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {risks.map((risk) => (
        <span key={risk} className="tech-label rounded-sm border border-amber-400/50 px-2 py-1 text-[10px] text-amber-200">
          {riskLabels[risk]}
        </span>
      ))}
    </div>
  );
}

export function AdminUsersPage({ users }: { users: AdminUserListItem[] }) {
  const riskyUsers = users.filter((user) => user.risks.length > 0).length;
  const telegramUsers = users.filter((user) => user.telegram?.id).length;

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
        description="Справочник аккаунтов платформы: роли, Telegram-связки, служебные email и парольные риски без отображения секретов."
        title="Пользователи"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Всего</p>
          <p className="heading-tech mt-2 text-3xl font-bold text-forge-ink">{users.length}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Требуют внимания</p>
          <p className="heading-tech mt-2 text-3xl font-bold text-amber-200">{riskyUsers}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Telegram связки</p>
          <p className="heading-tech mt-2 text-3xl font-bold text-forge-ink">{telegramUsers}</p>
        </article>
      </section>

      <PortalActionBar eyebrow="Admin directory" title="Аккаунты платформы" />

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-forge-surface text-xs uppercase text-forge-muted">
              <tr>
                <th className="px-4 py-3">Пользователь</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Telegram</th>
                <th className="px-4 py-3">Последняя активность</th>
                <th className="px-4 py-3">Статус</th>
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
                        <p className="text-xs text-forge-muted">{user.registrationSource ?? "source unknown"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-forge-muted">{user.email ?? "нет email"}</td>
                  <td className="px-4 py-4 text-forge-muted">{user.role?.displayName ?? user.role?.name ?? "без роли"}</td>
                  <td className="px-4 py-4 text-forge-muted">
                    {user.telegram?.username ? `@${user.telegram.username}` : user.telegram?.id ? `id ${user.telegram.id}` : "нет"}
                  </td>
                  <td className="px-4 py-4 text-forge-muted">{formatDate(user.lastSeen)}</td>
                  <td className="px-4 py-4">
                    <UserRiskBadges risks={user.risks} />
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
