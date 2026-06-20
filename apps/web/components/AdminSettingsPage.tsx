"use client";

import React, { useState, useTransition } from "react";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { PlatformSettings } from "@/lib/server/platform-settings-repository";

async function patchSettings(registrationPaused: boolean): Promise<PlatformSettings> {
  const response = await fetch("/api/admin/settings", {
    body: JSON.stringify({ registrationPaused }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("settings_update_failed");
  }
  const data = (await response.json()) as { settings: PlatformSettings };
  return data.settings;
}

export function AdminSettingsPage({ initialSettings }: { initialSettings: PlatformSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const nextPaused = !settings.registrationPaused;

  function updateRegistrationPaused() {
    setError("");
    startTransition(async () => {
      try {
        setSettings(await patchSettings(nextPaused));
      } catch {
        setError("Не удалось сохранить настройку.");
      }
    });
  }

  return (
    <PortalPageShell>
      <PortalHeader
        breadcrumbs={[
          { href: "/", label: "Портал" },
          { href: "/admin", label: "Администрирование" },
          { label: "Настройки" },
        ]}
        description="Глобальные настройки платформы, которые администратор может менять без деплоя."
        eyebrow="Администрирование"
        title="Настройки"
      />

      <PortalActionBar eyebrow="Регистрация" title="Доступ новых пользователей" />

      <section className="panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="tech-label text-xs text-forge-muted">Регистрация</p>
            <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">Регистрация приостановлена</h2>
            <p className="mt-3 text-sm leading-6 text-forge-muted">
              Статус: {settings.registrationPaused ? "приостановлена" : "включена"}
            </p>
          </div>
          <button
            aria-pressed={settings.registrationPaused}
            className="tech-label rounded-sm border border-forge-line bg-forge-surface px-4 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={updateRegistrationPaused}
            type="button"
          >
            {isPending ? "Сохранение..." : settings.registrationPaused ? "Включить регистрацию" : "Приостановить регистрацию"}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </section>
    </PortalPageShell>
  );
}
