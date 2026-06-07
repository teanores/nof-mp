import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";

export default function StreamerServicePage() {
  return (
    <PortalPageShell maxWidthClassName="max-w-[1200px]">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Портал стримера" }]}
        description="Раздел будет доступен позже. Сейчас мы готовим страницу стримера и публичные материалы Te'An'ore."
        eyebrow="Portal module"
        title="Портал стримера"
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
          К разделам кузницы
        </Link>
      </section>
    </PortalPageShell>
  );
}
