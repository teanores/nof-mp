import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";

export default function ForgeTasksServicePage() {
  return (
    <PortalPageShell maxWidthClassName="max-w-4xl">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Forge Tasks" }]}
        description="Трекер задач, эпиков, спринтов и рабочих планов. Доступ к рабочим проектам выдаётся отдельно."
        eyebrow="Portal module"
        title="Forge Tasks"
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <Link className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs text-black transition hover:border-forge-ink hover:bg-forge-ink" href="/products/nof-tt/launch?next=%2Foverview">
            Перейти в Forge Tasks
          </Link>
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
            К разделам кузницы
          </Link>
        </div>
      </section>
    </PortalPageShell>
  );
}
