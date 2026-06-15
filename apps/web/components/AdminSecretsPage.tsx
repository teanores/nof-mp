"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { SecretRiskLevel, SecretRotationRegistryItem, SecretRotationStatus, SecretRotationUatStatus } from "@/lib/server/secret-rotation-registry";

type SecretCategory = "all" | "oauth" | "bot" | "database" | "email" | "mcp" | "edge" | "legacy" | "session" | "other";
type SecretSort = "risk" | "service" | "status" | "next-rotation";

const statusLabels: Record<SecretRotationStatus, string> = {
  hold: "HOLD",
  "needs-rotation": "Требует ротации",
  ok: "OK",
  planned: "Запланировано",
};

const uatLabels: Record<SecretRotationUatStatus, string> = {
  blocked: "Блокировано",
  "not-required": "Не требуется",
  passed: "Принято",
  pending: "Ожидает",
};

const categoryLabels: Record<SecretCategory, string> = {
  all: "Все типы",
  bot: "Боты",
  database: "БД",
  edge: "Edge",
  email: "Email",
  legacy: "Legacy",
  mcp: "MCP",
  oauth: "OAuth",
  other: "Прочее",
  session: "Сессии",
};

const riskOrder: Record<SecretRiskLevel, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

const statusOrder: Record<SecretRotationStatus, number> = {
  "needs-rotation": 0,
  planned: 1,
  hold: 2,
  ok: 3,
};

function formatDate(value: string | null): string {
  if (!value) {
    return "Не задано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDaysLeft(value: number | null): string {
  if (value === null) {
    return "HOLD";
  }

  if (value < 0) {
    return `Просрочено ${Math.abs(value)} дн.`;
  }

  if (value === 0) {
    return "Сегодня";
  }

  return `${value} дн.`;
}

function categoryForSecret(item: SecretRotationRegistryItem): Exclude<SecretCategory, "all"> {
  const haystack = [item.secretName, item.purpose, item.locationClass, ...item.consumers].join(" ").toLowerCase();

  if (haystack.includes("oauth") || haystack.includes("jwt") || haystack.includes("client_secret")) {
    return "oauth";
  }
  if (haystack.includes("telegram") || haystack.includes("bot")) {
    return "bot";
  }
  if (haystack.includes("database") || haystack.includes("postgres") || haystack.includes("db_") || item.secretName === "DATABASE_URL" || item.secretName === "DB_PASS") {
    return "database";
  }
  if (haystack.includes("smtp") || haystack.includes("email")) {
    return "email";
  }
  if (haystack.includes("mcp")) {
    return "mcp";
  }
  if (haystack.includes("edge") || haystack.includes("caddy")) {
    return "edge";
  }
  if (haystack.includes("legacy") || haystack.includes("dragon-forge")) {
    return "legacy";
  }
  if (haystack.includes("nextauth") || haystack.includes("session")) {
    return "session";
  }

  return "other";
}

function compareDate(left: string | null, right: string | null): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }
  return left.localeCompare(right);
}

function sortRegistry(registry: SecretRotationRegistryItem[], sort: SecretSort): SecretRotationRegistryItem[] {
  return [...registry].sort((left, right) => {
    if (sort === "service") {
      return left.serviceKey.localeCompare(right.serviceKey) || left.secretName.localeCompare(right.secretName);
    }
    if (sort === "status") {
      return statusOrder[left.rotationStatus] - statusOrder[right.rotationStatus] || left.serviceKey.localeCompare(right.serviceKey) || left.secretName.localeCompare(right.secretName);
    }
    if (sort === "next-rotation") {
      return compareDate(left.nextRotationDueAt, right.nextRotationDueAt) || riskOrder[left.riskLevel] - riskOrder[right.riskLevel] || left.secretName.localeCompare(right.secretName);
    }
    return riskOrder[left.riskLevel] - riskOrder[right.riskLevel] || left.serviceKey.localeCompare(right.serviceKey) || left.secretName.localeCompare(right.secretName);
  });
}

export function AdminSecretsPage({ registry }: { registry: SecretRotationRegistryItem[] }) {
  const [serviceFilter, setServiceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<SecretCategory>("all");
  const [sort, setSort] = useState<SecretSort>("risk");

  const services = useMemo(() => ["all", ...Array.from(new Set(registry.map((item) => item.serviceKey))).sort()], [registry]);
  const categories = useMemo(() => {
    const knownCategories = new Set<Exclude<SecretCategory, "all">>();
    for (const item of registry) {
      knownCategories.add(categoryForSecret(item));
    }
    const sortedCategories = Array.from(knownCategories).sort((left, right) => categoryLabels[left].localeCompare(categoryLabels[right], "ru"));
    return ["all", ...sortedCategories] satisfies SecretCategory[];
  }, [registry]);
  const filteredRegistry = useMemo(() => {
    const filtered = registry.filter((item) => {
      const serviceMatches = serviceFilter === "all" || item.serviceKey === serviceFilter;
      const categoryMatches = categoryFilter === "all" || categoryForSecret(item) === categoryFilter;
      return serviceMatches && categoryMatches;
    });
    return sortRegistry(filtered, sort);
  }, [categoryFilter, registry, serviceFilter, sort]);

  const pendingCount = registry.filter((item) => item.rotationStatus === "needs-rotation" || item.rotationStatus === "planned").length;
  const p0Count = registry.filter((item) => item.riskLevel === "P0").length;

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
          { label: "Ротация секретов" },
        ]}
        description="Реестр имён секретов, владельцев, потребителей и статуса ротации. Значения, хэши, фрагменты токенов и пароли здесь не хранятся и не отображаются."
        eyebrow="Безопасность платформы"
        title="Ротация секретов"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Записей</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{registry.length}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">P0</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{p0Count}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">В работе</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{pendingCount}</p>
        </article>
      </section>

      <PortalActionBar eyebrow="Секреты" title="Реестр ротации" />

      <section className="panel grid gap-4 p-4 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="tech-label text-[10px] text-forge-muted">Сервис</span>
          <select
            aria-label="Фильтр по сервису"
            className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          >
            {services.map((service) => (
              <option key={service} value={service}>
                {service === "all" ? "Все сервисы" : service}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="tech-label text-[10px] text-forge-muted">Тип</span>
          <select
            aria-label="Фильтр по типу"
            className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as SecretCategory)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="tech-label text-[10px] text-forge-muted">Сортировка</span>
          <select
            aria-label="Сортировка"
            className="rounded-sm border border-forge-line bg-forge-panel px-3 py-3 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            value={sort}
            onChange={(event) => setSort(event.target.value as SecretSort)}
          >
            <option value="risk">Риск</option>
            <option value="service">Сервис</option>
            <option value="status">Статус</option>
            <option value="next-rotation">Следующая ротация</option>
          </select>
        </label>
      </section>

      <p className="text-sm text-forge-muted">
        Показано {filteredRegistry.length} из {registry.length}.
      </p>

      <section className="overflow-hidden rounded border border-forge-line">
        <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
          <thead className="bg-forge-panel text-xs uppercase text-forge-muted">
            <tr>
              <th className="px-3 py-3">Имя</th>
              <th className="px-3 py-3">Сервис</th>
              <th className="px-3 py-3">Тип</th>
              <th className="px-3 py-3">Риск</th>
              <th className="px-3 py-3">Статус</th>
              <th className="px-3 py-3">Источник</th>
              <th className="px-3 py-3">Последняя ротация</th>
              <th className="px-3 py-3">Следующая ротация</th>
              <th className="px-3 py-3">Осталось</th>
              <th className="px-3 py-3">Где хранится</th>
              <th className="px-3 py-3">Потребители</th>
              <th className="px-3 py-3">UAT</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistry.map((item) => (
              <tr key={`${item.serviceKey}:${item.secretName}`} className="border-t border-forge-line">
                <td className="px-3 py-3 font-mono text-xs text-forge-ink">{item.secretName}</td>
                <td className="px-3 py-3 text-forge-muted">{item.serviceKey}</td>
                <td className="px-3 py-3 text-forge-muted">{categoryLabels[categoryForSecret(item)]}</td>
                <td className="px-3 py-3 text-forge-muted">{item.riskLevel}</td>
                <td className="px-3 py-3 text-forge-ink">{statusLabels[item.rotationStatus]}</td>
                <td className="px-3 py-3 text-forge-muted">{item.source}</td>
                <td className="px-3 py-3 text-forge-muted">{formatDate(item.lastRotatedAt)}</td>
                <td className="px-3 py-3 text-forge-muted">{formatDate(item.nextRotationDueAt)}</td>
                <td className="px-3 py-3 text-forge-ink">{formatDaysLeft(item.daysUntilRotation)}</td>
                <td className="px-3 py-3 text-forge-muted">{item.locationClass}</td>
                <td className="px-3 py-3 text-forge-muted">{item.consumers.join(", ")}</td>
                <td className="px-3 py-3 text-forge-muted">{uatLabels[item.uatStatus]}</td>
              </tr>
            ))}
            {filteredRegistry.length === 0 ? (
              <tr className="border-t border-forge-line">
                <td className="px-3 py-6 text-center text-forge-muted" colSpan={12}>
                  По выбранным фильтрам записей нет.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel grid gap-3 p-4 text-sm text-forge-muted md:grid-cols-2">
        <div>
          <p className="tech-label text-xs text-forge-ink">Правило</p>
          <p className="mt-2">В этом разделе хранится только metadata. Значения секретов остаются в Kubernetes, провайдерах или будущем secret manager.</p>
        </div>
        <div>
          <p className="tech-label text-xs text-forge-ink">Runbook</p>
          <p className="mt-2">План ротации: nof-mp-secret-rotation-incident-runbook-2026-06-14.</p>
        </div>
      </section>
    </PortalPageShell>
  );
}
