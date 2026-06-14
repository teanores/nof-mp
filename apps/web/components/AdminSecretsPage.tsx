import Link from "next/link";
import React from "react";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { SecretRotationRegistryItem, SecretRotationStatus, SecretRotationUatStatus } from "@/lib/server/secret-rotation-registry";

const statusLabels: Record<SecretRotationStatus, string> = {
  hold: "HOLD",
  "needs-rotation": "Требует ротации",
  ok: "OK",
  planned: "Запланировано",
};

const uatLabels: Record<SecretRotationUatStatus, string> = {
  blocked: "Блокировано",
  "not-required": "Не требуется",
  passed: "Принято",
  pending: "Ожидает",
};

export function AdminSecretsPage({ registry }: { registry: SecretRotationRegistryItem[] }) {
  const pendingCount = registry.filter((item) => item.rotationStatus === "needs-rotation" || item.rotationStatus === "planned").length;
  const p0Count = registry.filter((item) => item.riskLevel === "P0").length;

  return (
    <PortalPageShell>
      <PortalHeader
        actions={
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-4 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/admin">
            К администрированию
          </Link>
        }
        breadcrumbs={[
          { href: "/", label: "Портал" },
          { href: "/admin", label: "Администрирование" },
          { label: "Ротация секретов" },
        ]}
        description="Реестр имён секретов, владельцев, потребителей и статуса ротации. Значения, хэши, фрагменты токенов и пароли здесь не хранятся и не отображаются."
        eyebrow="Безопасность платформы"
        title="Ротация секретов"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">Записей</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{registry.length}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">P0</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{p0Count}</p>
        </article>
        <article className="panel p-4">
          <p className="tech-label text-xs text-forge-muted">В работе</p>
          <p className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{pendingCount}</p>
        </article>
      </section>

      <PortalActionBar eyebrow="Секреты" title="Реестр ротации" />

      <section className="overflow-hidden rounded border border-forge-line">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-forge-panel text-xs uppercase text-forge-muted">
            <tr>
              <th className="px-3 py-3">Имя</th>
              <th className="px-3 py-3">Сервис</th>
              <th className="px-3 py-3">Риск</th>
              <th className="px-3 py-3">Статус</th>
              <th className="px-3 py-3">Где хранится</th>
              <th className="px-3 py-3">Потребители</th>
              <th className="px-3 py-3">UAT</th>
            </tr>
          </thead>
          <tbody>
            {registry.map((item) => (
              <tr key={`${item.serviceKey}:${item.secretName}`} className="border-t border-forge-line">
                <td className="px-3 py-3 font-mono text-xs text-forge-ink">{item.secretName}</td>
                <td className="px-3 py-3 text-forge-muted">{item.serviceKey}</td>
                <td className="px-3 py-3 text-forge-muted">{item.riskLevel}</td>
                <td className="px-3 py-3 text-forge-ink">{statusLabels[item.rotationStatus]}</td>
                <td className="px-3 py-3 text-forge-muted">{item.locationClass}</td>
                <td className="px-3 py-3 text-forge-muted">{item.consumers.join(", ")}</td>
                <td className="px-3 py-3 text-forge-muted">{uatLabels[item.uatStatus]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel grid gap-3 p-4 text-sm text-forge-muted md:grid-cols-2">
        <div>
          <p className="tech-label text-xs text-forge-ink">Правило</p>
          <p className="mt-2">В этом разделе хранится только metadata. Значения секретов остаются в Kubernetes, провайдерах или будущем secret manager.</p>
        </div>
        <div>
          <p className="tech-label text-xs text-forge-ink">Runbook</p>
          <p className="mt-2">План ротации: nof-mp-secret-rotation-incident-runbook-2026-06-14.</p>
        </div>
      </section>
    </PortalPageShell>
  );
}
