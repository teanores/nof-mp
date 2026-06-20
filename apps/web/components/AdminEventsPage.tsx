"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { UserSecurityAuditActivity } from "@/lib/server/security-audit-dashboard";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const eventFilters = [
  { label: "Все события", value: "all" },
  { label: "Восстановление", value: "Администратор отправил восстановление" },
  { label: "Карточки пользователей", value: "Просмотр карточки пользователя" },
  { label: "Связи сервисов", value: "Отключение связи сервиса" },
  { label: "Входы", value: "Успешный вход" },
  { label: "Авторизованные запросы", value: "Авторизованный" },
] as const;

export function AdminEventsPage({ events }: { events: UserSecurityAuditActivity[] }) {
  const [eventFilter, setEventFilter] = useState<(typeof eventFilters)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesFilter = eventFilter === "all" || event.activityLabel.includes(eventFilter);
        const haystack = `${event.actorLabel ?? ""} ${event.activityLabel} ${event.method} ${event.path} ${event.statusCode}`.toLowerCase();
        return matchesFilter && (!normalizedSearch || haystack.includes(normalizedSearch));
      }),
    [eventFilter, events, normalizedSearch],
  );

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

      <section className="panel grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
        <label className="flex flex-col gap-2 text-sm text-forge-muted">
          <span className="tech-label text-xs">Поиск</span>
          <input
            className="min-h-11 rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-forge-ink outline-none transition placeholder:text-forge-muted focus:border-forge-accent"
            placeholder="Администратор, действие или путь"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-forge-muted">
          <span className="tech-label text-xs">Тип события</span>
          <select
            className="min-h-11 rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-forge-ink outline-none transition focus:border-forge-accent"
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value as (typeof eventFilters)[number]["value"])}
          >
            {eventFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel overflow-hidden">
        {filteredEvents.length === 0 ? (
          <p className="px-4 py-5 text-sm text-forge-muted">
            {events.length === 0 ? "Событий аккаунтов пока нет." : "По выбранным фильтрам событий не найдено."}
          </p>
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
                {filteredEvents.map((event) => (
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
