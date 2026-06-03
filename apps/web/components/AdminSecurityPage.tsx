import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { ForgePortalSession, ForgePortalUser } from "@/lib/types";

interface SecuritySignal {
  label: string;
  note: string;
  status: "active" | "planned" | "review";
}

const signals: SecuritySignal[] = [
  {
    label: "Login gate",
    note: "Гости уходят на платформенный вход, закрытые страницы не показывают приватный контент.",
    status: "active",
  },
  {
    label: "Rate limit",
    note: "Публичные auth endpoints должны возвращать 429 при частых попытках.",
    status: "review",
  },
  {
    label: "Access audit",
    note: "Детальные события безопасности остаются платформенной зоной и не должны жить в продуктовых shell.",
    status: "planned",
  },
];

function initials(user?: ForgePortalUser): string {
  const username = user?.username?.trim();
  if (!username) {
    return "??";
  }

  const parts = username.split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : username.slice(0, 2)).toUpperCase();
}

function ProfileAction({ session }: { session: ForgePortalSession }) {
  return (
    <Link
      aria-label={`Профиль ${session.user?.username ?? "platform"}`}
      className="grid h-12 w-12 place-items-center rounded-full border border-forge-accent bg-forge-surface text-sm font-bold text-forge-accent transition hover:bg-forge-accent hover:text-black"
      href="/profile"
      title={session.user?.username ?? "profile"}
    >
      {initials(session.user)}
    </Link>
  );
}

function SignalCard({ signal }: { signal: SecuritySignal }) {
  const statusClass =
    signal.status === "active"
      ? "border-emerald-500/40 text-emerald-300"
      : signal.status === "review"
        ? "border-amber-400/50 text-amber-200"
        : "border-forge-line text-forge-muted";

  return (
    <article className="rounded-sm border border-forge-line bg-forge-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="heading-tech text-lg font-bold text-forge-ink">{signal.label}</h3>
        <span className={`tech-label rounded-sm border px-2 py-1 text-[10px] ${statusClass}`}>
          {signal.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-forge-muted">{signal.note}</p>
    </article>
  );
}

export function AdminSecurityPage({ session }: { session: ForgePortalSession }) {
  return (
    <PortalPageShell>
      <PortalHeader
        actions={<ProfileAction session={session} />}
        breadcrumbs={[
          { href: "/overview", label: "Разделы кузницы" },
          { label: "Безопасность" },
        ]}
        description="Платформенная панель безопасности: входы, rate-limit, доступы и будущий аудит без продуктового footer и внутренних адресов."
        eyebrow="Администрирование"
        title="Безопасность платформы"
      />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="panel p-5">
          <p className="tech-label text-xs text-forge-accent">Статус</p>
          <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">Платформенная зона</h2>
          <p className="mt-3 text-sm leading-6 text-forge-muted">
            Эта страница принадлежит NOF Main Platform. Продуктовые сервисы могут передавать безопасные summary-события
            только через согласованный контракт, но не управляют shell, footer или платформенным доступом.
          </p>
        </article>

        <section className="grid gap-3 md:grid-cols-3" aria-label="Security signals">
          {signals.map((signal) => (
            <SignalCard key={signal.label} signal={signal} />
          ))}
        </section>
      </section>

      <section className="panel grid gap-4 p-5 text-sm text-forge-muted md:grid-cols-2">
        <div>
          <p className="tech-label text-xs text-forge-ink">Что проверять сейчас</p>
          <p className="mt-2">
            Страница должна открываться в стандартном тёмном shell, показывать профиль в header и footer `NOF.MP`.
          </p>
        </div>
        <div>
          <p className="tech-label text-xs text-forge-ink">Что не показывать</p>
          <p className="mt-2">
            Никаких секретов, значений env, внутренних NodePort, локальных IP, продуктовых footer или сырых логов.
          </p>
        </div>
      </section>
    </PortalPageShell>
  );
}
