import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";

export default function HabitTrackerServicePage() {
  return (
    <PortalPageShell maxWidthClassName="max-w-4xl">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Habit Tracker" }]}
        description="Трекер привычек, целей и регулярных практик. Вход через платформу откроется после общего NOF Platform identity flow."
        eyebrow="Portal module"
        title="Habit Tracker"
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <p className="text-sm leading-6 text-forge-muted">
          Прямой переход закрыт, чтобы не подхватить старую сессию другого пользователя. Следующий стандарт входа:
          явная авторизация или привязка учётной записи через NOF Platform.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
            К разделам кузницы
          </Link>
        </div>
      </section>
    </PortalPageShell>
  );
}
