import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { SecurityAuditDashboard } from "@/lib/server/security-audit-dashboard";
import type { ForgePortalSession, ForgePortalUser } from "@/lib/types";

function initials(user?: ForgePortalUser): string {
  const username = user?.username?.trim();
  if (!username) {
    return "??";
  }

  const parts = username.split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : username.slice(0, 2)).toUpperCase();
}

function ProfileAction({ session }: { session: ForgePortalSession }) {
  return (
    <Link
      aria-label={`Профиль ${session.user?.username ?? "platform"}`}
      className="grid h-12 w-12 place-items-center rounded-full border border-forge-accent bg-forge-surface text-sm font-bold text-forge-accent transition hover:bg-forge-accent hover:text-black"
      href="/profile"
      title={session.user?.username ?? "profile"}
    >
      {initials(session.user)}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-forge-line bg-forge-surface p-3">
      <p className="tech-label text-xs text-forge-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-forge-ink">{value}</p>
    </div>
  );
}

export function AdminSecurityPage({
  dashboard,
  session,
}: {
  dashboard: SecurityAuditDashboard;
  session: ForgePortalSession;
}) {
  const hasEvents = dashboard.recentEvents.length > 0;

  return (
    <PortalPageShell>
      <PortalHeader
        actions={<ProfileAction session={session} />}
        breadcrumbs={[
          { href: "/overview", label: "Разделы кузницы" },
          { label: "Безопасность" },
        ]}
        description="Платформенная панель безопасности: входы, rate-limit, доступы и очищенные edge-события без продуктового footer и внутренних адресов."
        eyebrow="Администрирование"
        title="Безопасность платформы"
      />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="panel p-5">
          <p className="tech-label text-xs text-forge-accent">Рекомендация</p>
          <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{dashboard.recommendation}</h2>
          <p className="mt-3 text-sm leading-6 text-forge-muted">
            {hasEvents
              ? "Сводка построена по очищенным событиям за последние 24 часа. Сырые логи, секреты, cookie и чувствительные значения не отображаются."
              : "За последние 24 часа событий безопасности не найдено. Если на портале был трафик, проверьте доставку edge-логов и платформенных audit-событий."}
          </p>
        </article>

        <article className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Успешные входы" value={dashboard.summary.successfulLogins} />
          <StatCard label="Неудачные входы" value={dashboard.summary.failedLogins} />
          <StatCard label="Rate limit / 429" value={dashboard.summary.rateLimited} />
          <StatCard label="403 / 401" value={dashboard.summary.forbidden} />
          <StatCard label="404 / unknown" value={dashboard.summary.notFound} />
          <StatCard label="Сканы" value={dashboard.summary.suspiciousScans} />
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="heading-tech text-xl font-bold text-forge-ink">Источники</h2>
          <div className="mt-4 space-y-3">
            {dashboard.topSources.length === 0 ? <p className="text-sm text-forge-muted">Событий пока нет.</p> : null}
            {dashboard.topSources.map((source) => (
              <div key={source.ip} className="rounded-sm border border-forge-line bg-forge-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm text-forge-ink">{source.ip}</p>
                  <span className="tech-label text-xs text-forge-muted">{source.total}</span>
                </div>
                <p className="mt-2 text-xs text-forge-muted">
                  Ошибки входа: {source.failedLogins} / сканы: {source.scans}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5">
          <h2 className="heading-tech text-xl font-bold text-forge-ink">Пути</h2>
          <div className="mt-4 space-y-3">
            {dashboard.topPaths.length === 0 ? <p className="text-sm text-forge-muted">Подозрительных путей пока нет.</p> : null}
            {dashboard.topPaths.map((path) => (
              <div key={path.path} className="rounded-sm border border-forge-line bg-forge-surface p-3">
                <p className="font-mono text-sm text-forge-ink">{path.path}</p>
                <p className="mt-2 text-xs text-forge-muted">Событий: {path.count}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel p-5">
        <h2 className="heading-tech text-xl font-bold text-forge-ink">Последние события</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="tech-label text-xs text-forge-muted">
              <tr>
                <th className="border-b border-forge-line py-2 pr-3">Время</th>
                <th className="border-b border-forge-line py-2 pr-3">Кто</th>
                <th className="border-b border-forge-line py-2 pr-3">Действие</th>
                <th className="border-b border-forge-line py-2 pr-3">IP</th>
                <th className="border-b border-forge-line py-2 pr-3">Путь</th>
                <th className="border-b border-forge-line py-2 pr-3">Статус</th>
                <th className="border-b border-forge-line py-2">User-agent</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentEvents.map((event) => (
                <tr key={event.id} className="align-top text-forge-muted">
                  <td className="border-b border-forge-line py-2 pr-3">
                    {new Date(event.createdAt).toLocaleString("ru-RU")}
                  </td>
                  <td className="border-b border-forge-line py-2 pr-3">
                    <p className="font-medium text-forge-ink">{event.actorLabel}</p>
                    {event.investigationHint ? <p className="mt-1 text-xs text-forge-muted">{event.investigationHint}</p> : null}
                  </td>
                  <td className="border-b border-forge-line py-2 pr-3">{event.activityLabel}</td>
                  <td className="border-b border-forge-line py-2 pr-3 font-mono">{event.ip}</td>
                  <td className="border-b border-forge-line py-2 pr-3 font-mono">{event.path}</td>
                  <td className="border-b border-forge-line py-2 pr-3">{event.statusCode}</td>
                  <td className="border-b border-forge-line py-2">{event.userAgent}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dashboard.recentEvents.length === 0 ? <p className="mt-4 text-sm text-forge-muted">Событий пока нет.</p> : null}
        </div>
      </section>
    </PortalPageShell>
  );
}
