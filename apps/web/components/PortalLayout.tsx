import React from "react";

import { PortalBreadcrumbs, type PortalBreadcrumbItem } from "@/components/PortalBreadcrumbs";

interface PortalPageShellProps {
  children: React.ReactNode;
  maxWidthClassName?: string;
}

interface PortalHeaderProps {
  actions?: React.ReactNode;
  breadcrumbs?: PortalBreadcrumbItem[];
  description?: React.ReactNode;
  eyebrow?: string;
  title: React.ReactNode;
}

interface PortalActionBarProps {
  actions?: React.ReactNode;
  ariaLabel?: string;
  eyebrow?: string;
  title: string;
}

export function PortalPageShell({ children, maxWidthClassName = "max-w-[1500px]" }: PortalPageShellProps) {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className={`mx-auto flex w-full ${maxWidthClassName} flex-col gap-5`}>{children}</div>
    </main>
  );
}

export function PortalHeader({ actions, breadcrumbs, description, eyebrow, title }: PortalHeaderProps) {
  return (
    <header className="panel flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <PortalBreadcrumbs items={breadcrumbs} />
        {eyebrow ? <p className="tech-label text-xs text-forge-accent">{eyebrow}</p> : null}
        <h1 className="heading-tech mt-2 text-3xl font-bold text-forge-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-forge-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function PortalActionBar({ actions, ariaLabel, eyebrow = "Board controls", title }: PortalActionBarProps) {
  return (
    <section className="panel flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between" aria-label={ariaLabel ?? `${title} actions`}>
      <div>
        <p className="tech-label text-xs text-forge-accent">{eyebrow}</p>
        <h2 className="heading-tech mt-1 text-lg font-bold text-forge-ink">{title}</h2>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
