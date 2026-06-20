import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { UserSecurityAuditActivity } from "@/lib/server/security-audit-dashboard";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminEventsPage({ events }: { events: UserSecurityAuditActivity[] }) {
  return (
    <PortalPageShell>
      <PortalHeader
        actions={
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-4 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/admin">
            К администрированию
          </Link>
        }
        breadcrumbs={[
          { href: "/", label: "Портал" },
          { href: "/admin", label: "Администрирование" },
          { label: "Журнал событий" },
        ]}
        description="События аккаунтов и админских действий без отображения паролей, токенов, секретов и внутренних адресов."
        title="Журнал событий"
      />

      <section className="panel overflow-hidden">
        {events.length === 0 ? (
          <p className="px-4 py-5 text-sm text-forge-muted">Событий аккаунтов пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-forge-surface text-xs uppercase text-forge-muted">
                <tr>
                  <th className="px-4 py-3">Время</th>
                  <th className="px-4 py-3">Кто</th>
                  <th className="px-4 py-3">Событие</th>
                  <th className="px-4 py-3">Метод</th>
                  <th className="px-4 py-3">Путь</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-forge-line">
                    <td className="px-4 py-3 text-forge-muted">{formatDate(event.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-forge-ink">{event.actorLabel ?? "неизвестно"}</td>
                    <td className="px-4 py-3 text-forge-ink">{event.activityLabel}</td>
                    <td className="px-4 py-3 text-forge-muted">{event.method}</td>
                    <td className="px-4 py-3 font-mono text-xs text-forge-muted">{event.path}</td>
                    <td className="px-4 py-3 text-forge-muted">{event.statusCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalPageShell>
  );
}
