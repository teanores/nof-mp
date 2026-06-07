import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";

export default function StreamerServicePage() {
  return (
    <PortalPageShell maxWidthClassName="max-w-[1200px]">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Портал стримера" }]}
        description="Портал стримера собирает подготовку эфиров, публичные материалы и будущую автоматизацию публикаций в один рабочий контур."
        eyebrow="Инкубационный сервис"
        title="Портал стримера"
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <div className="grid gap-5">
          <div>
            <p className="tech-label text-xs text-forge-accent">Сценарии</p>
            <p className="mt-2 text-sm leading-6 text-forge-muted">
              Сейчас это инкубационный модуль для ручных прототипов: планирование стримов, подготовка описаний, публикаций и материалов, которые позже можно будет автоматизировать.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Подготовка эфира", "Собрать тему, тезисы, ссылки и контекст до выхода в эфир."],
              ["Публичные материалы", "Не терять тексты, анонсы и описания, которые нужны зрителю после стрима."],
              ["Будущая автоматизация", "Отделить рабочие прототипы от платформенного ядра и спокойно довести их до сервиса."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-sm border border-forge-line bg-forge-surface p-4">
                <h2 className="heading-tech text-lg font-bold text-forge-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-forge-muted">{text}</p>
              </article>
            ))}
          </div>
          <p className="text-sm leading-6 text-forge-muted">
            В платной модели этот сервис может стать рабочим кабинетом для автора: меньше ручной рутины перед эфиром, понятнее процесс публикации и больше повторно используемого контента.
          </p>
        </div>
        <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
          К разделам кузницы
        </Link>
      </section>
    </PortalPageShell>
  );
}
