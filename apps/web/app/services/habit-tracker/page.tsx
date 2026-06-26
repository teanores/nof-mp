import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import { nofHtOidcAuthorizeHref } from "@/lib/server/nof-ht-oidc-handoff";

export default function HabitTrackerServicePage() {
  return (
    <PortalPageShell maxWidthClassName="max-w-[1200px]">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Habit Tracker" }]}
        description="Habit Tracker помогает удерживать регулярные практики, видеть прогресс и не терять важные личные ритуалы."
        eyebrow="Сервис NOF"
        title="Habit Tracker"
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <div className="grid gap-5">
          <div>
            <p className="tech-label text-xs text-forge-accent">Сценарии</p>
            <p className="mt-2 text-sm leading-6 text-forge-muted">
              Подходит для личных целей и командных ритуалов: привычки, предупреждения о срывах, регулярные проверки и видимая история прогресса.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Ежедневный фокус", "Пользователь видит, что важно сделать сегодня, без лишнего шума."],
              ["Честная история", "Прогресс и пропуски видны сразу, поэтому легче менять поведение."],
              ["Мотивация", "Ценность видна каждый день: привычка становится измеримой, а не абстрактной."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-sm border border-forge-line bg-forge-surface p-4">
                <h2 className="heading-tech text-lg font-bold text-forge-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-forge-muted">{text}</p>
              </article>
            ))}
          </div>
          <p className="text-sm leading-6 text-forge-muted">
            Когда появится платная модель, Habit Tracker будет ценен как спокойный персональный инструмент для удержания режима, здоровья и рабочих практик.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs text-black transition hover:border-forge-ink hover:bg-forge-ink" href={nofHtOidcAuthorizeHref()}>
            Перейти в Habit Tracker
          </Link>
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
            К разделам кузницы
          </Link>
        </div>
      </section>
    </PortalPageShell>
  );
}
