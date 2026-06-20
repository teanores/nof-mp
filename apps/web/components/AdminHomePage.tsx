import Link from "next/link";
import React from "react";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { ForgePortalSession } from "@/lib/types";

const adminSections = [
  {
    description: "Аккаунты, роли, Telegram-связки, признаки риска и готовность действий по доступу.",
    href: "/admin/users",
    metric: "Аккаунты",
    title: "Пользователи",
  },
  {
    description: "Входы, rate-limit, публичные сканы и последние события безопасности платформы.",
    href: "/admin/security",
    metric: "События",
    title: "Безопасность",
  },
  {
    description: "Кто открывал карточки пользователей, отправлял восстановление и менял связи сервисов.",
    href: "/admin/events",
    metric: "Журнал",
    title: "Журнал событий",
  },
  {
    description: "Имена секретов, владельцы, потребители, статус ротации и UAT без хранения значений.",
    href: "/admin/secrets",
    metric: "Ротация",
    title: "Ротация секретов",
  },
  {
    description: "Глобальные флаги платформы, включая доступность регистрации без деплоя.",
    href: "/admin/settings",
    metric: "Флаги",
    title: "Настройки",
  },
];

function displayRole(session: ForgePortalSession): string {
  return session.user?.role?.displayName ?? session.user?.role?.name ?? "администратор";
}

export function AdminHomePage({ session }: { session: ForgePortalSession }) {
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
          { label: "Администрирование" },
        ]}
        description="Единый раздел для управления платформой: пользователи, безопасность и доступы без отображения секретов и внутренней инфраструктуры."
        eyebrow="Панель управления"
        title="Администрирование"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Сессия</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{session.user?.username ?? "администратор"}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Роль</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{displayRole(session)}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Разделы</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{adminSections.length}</p>
        </article>
      </section>

      <PortalActionBar eyebrow="Администрирование" title="Рабочие разделы" />

      <section className="grid gap-4 md:grid-cols-3">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            className="panel group block p-5 transition hover:border-forge-accent"
            href={section.href}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="tech-label text-xs text-forge-accent">{section.metric}</p>
                <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{section.title}</h2>
              </div>
              <span className="tech-label text-xs text-forge-muted transition group-hover:text-forge-accent">Открыть &gt;</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-forge-muted">{section.description}</p>
          </Link>
        ))}
      </section>
    </PortalPageShell>
  );
}
