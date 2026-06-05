import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";

function taskTrackerOAuthStartHref(): string {
  const origin = process.env.NOF_TT_ORIGIN ?? process.env.NEXT_PUBLIC_NOF_TT_ORIGIN ?? "https://task-tracker.forgath.ru";
  const url = new URL("/auth/platform/start", origin);
  url.searchParams.set("next", "/projects");
  return url.toString();
}

export default function TaskTrackerServicePage() {
  return (
    <PortalPageShell maxWidthClassName="max-w-4xl">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Task Tracker" }]}
        description="Трекер задач, эпиков, спринтов и рабочих планов. Доступ к рабочим проектам выдаётся отдельно."
        eyebrow="Portal module"
        title="Task Tracker"
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <Link className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs text-black transition hover:border-forge-ink hover:bg-forge-ink" href={taskTrackerOAuthStartHref()}>
            Перейти в Task Tracker
          </Link>
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
            К разделам кузницы
          </Link>
        </div>
      </section>
    </PortalPageShell>
  );
}
