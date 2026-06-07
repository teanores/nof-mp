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
    <PortalPageShell maxWidthClassName="max-w-[1200px]">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Task Tracker" }]}
        description="Task Tracker собирает идеи, требования, задачи, спринты и UAT в один управляемый рабочий контур."
        eyebrow="Сервис NOF"
        title="Task Tracker"
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <div className="grid gap-5">
          <div>
            <p className="tech-label text-xs text-forge-accent">Для кого</p>
            <p className="mt-2 text-sm leading-6 text-forge-muted">
              Для руководителя продукта, владельца проекта и команды, которым нужно видеть не только список задач, но и весь путь от идеи до релиза.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Идеи в работу", "Сырые мысли превращаются в требования, эпики и задачи без потери контекста."],
              ["Спринты и UAT", "Каждая поставка получает понятные acceptance criteria, проверки и owner sign-off."],
              ["Агенты и MCP", "AI-агенты используют тот же трекер и Wiki, поэтому команда видит, что именно было сделано."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-sm border border-forge-line bg-forge-surface p-4">
                <h2 className="heading-tech text-lg font-bold text-forge-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-forge-muted">{text}</p>
              </article>
            ))}
          </div>
          <p className="text-sm leading-6 text-forge-muted">
            Сервис экономит время команды: меньше ручных пересказов, меньше забытых решений, больше прозрачности для владельца и будущей платной поддержки.
          </p>
        </div>
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
