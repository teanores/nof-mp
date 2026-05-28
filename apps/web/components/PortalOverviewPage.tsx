"use client";

import Link from "next/link";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import { portalModules, portalModuleStatusLabel, systemHealthCards, type PortalModule } from "@/lib/portal-shell";
import { usePortalLanguage } from "@/lib/use-portal-language";

const overviewCopy = {
  en: {
    description: "Single entry point for account, profile, product discovery, access and platform administration.",
    portalState: "Portal state",
    portalStateNote: "The platform owns identity and access. Products integrate through session and access contracts instead of copying account code.",
    portalTitle: "NOF Platform",
    profile: "PROFILE",
    modules: "Platform modules",
  },
  ru: {
    description: "Единая точка входа для учётной записи, профиля, продуктов, доступа и администрирования платформы.",
    portalState: "Состояние портала",
    portalStateNote: "Платформа хранит идентификацию и доступ. Продукты интегрируются через контракты сессии и прав, а не копируют код учётных записей.",
    portalTitle: "NOF Platform",
    profile: "ПРОФИЛЬ",
    modules: "Разделы платформы",
  },
} as const;

function ModuleCard({ module }: { module: PortalModule }) {
  return (
    <Link className="panel block min-h-[190px] p-4 transition hover:border-forge-accent" href={module.href}>
      <div className="flex items-start justify-between gap-3">
        <p className="tech-label text-xs text-forge-accent">{module.key}</p>
        <span className="tech-label rounded-sm border border-forge-line bg-forge-surface px-2 py-1 text-[10px] text-forge-muted">
          {portalModuleStatusLabel(module.status)}
        </span>
      </div>
      <h3 className="heading-tech mt-3 text-xl font-bold text-forge-ink">{module.title}</h3>
      <p className="mt-3 text-sm leading-6 text-forge-muted">{module.description}</p>
      <span className="tech-label mt-5 inline-flex text-xs text-forge-accent">Открыть {">"}</span>
    </Link>
  );
}

export function PortalOverviewPage() {
  const copy = overviewCopy[usePortalLanguage()];

  return (
    <PortalPageShell>
      <PortalHeader
        actions={
          <Link
            className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-4 py-3 text-xs font-bold text-black transition"
            href="/profile"
          >
            {copy.profile}
          </Link>
        }
        description={copy.description}
        title="Narag'Othal Forgath"
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="panel p-5">
          <p className="tech-label text-xs text-forge-accent">{copy.portalState}</p>
          <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{copy.portalTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-forge-muted">{copy.portalStateNote}</p>
        </article>

        <article className="panel p-5">
          <p className="tech-label text-xs text-forge-accent">System health</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {systemHealthCards.map(({ label, note, value }) => (
              <div key={label} className="rounded-sm border border-forge-line bg-forge-surface p-3">
                <p className="tech-label text-[10px] text-forge-muted">{label}</p>
                <p className="mt-1 text-sm font-bold text-forge-ink">{value}</p>
                <p className="mt-1 text-xs text-forge-muted">{note}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <PortalActionBar eyebrow="Portal modules" title={copy.modules} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {portalModules.map((module) => (
          <ModuleCard key={module.key} module={module} />
        ))}
      </section>
    </PortalPageShell>
  );
}
