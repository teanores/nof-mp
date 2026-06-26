"use client";

import Link from "next/link";
import React, { useState } from "react";

import { compactPrimaryActionClassName } from "@/components/ActionButtonStyles";
import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import type { AdminUserListItem, AdminUserRecoveryState, AdminUserRisk } from "@/lib/server/admin-users-repository";
import type { UserSecurityAuditActivity } from "@/lib/server/security-audit-dashboard";
import type { ForgeServiceLink } from "@/lib/types";

const riskLabels: Record<AdminUserRisk, string> = {
  "external-email": "почта вне домена",
  "missing-password": "нет пароля",
  "telegram-placeholder-email": "служебная telegram-почта",
};

const recoveryLabels: Record<AdminUserRecoveryState, string> = {
  "email-reset-ready": "почтовое восстановление",
  "missing-email": "почта не указана",
  "service-email": "служебная почта",
};
const serviceStatusLabels: Record<ForgeServiceLink["status"], string> = {
  connected: "связано",
  not_connected: "не связано",
  unavailable: "недоступно",
};

const badgeBaseClass = "tech-label inline-flex whitespace-nowrap rounded-sm border px-2 py-1 text-[10px]";

function formatDate(value?: string): string {
  if (!value) {
    return "нет данных";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <p className="tech-label text-xs text-forge-muted">{label}</p>
      <div className="mt-2 text-sm font-semibold text-forge-ink">{value}</div>
    </div>
  );
}

function StatusBadge({ children, ready = false }: { children: React.ReactNode; ready?: boolean }) {
  return (
    <span className={`${badgeBaseClass} ${ready ? "border-emerald-500/40 text-emerald-300" : "border-amber-400/50 text-amber-200"}`}>
      {children}
    </span>
  );
}

function recoveryBlockReason(user: AdminUserListItem): string {
  if (user.recoveryState === "missing-email") {
    return "У пользователя не указана электронная почта. Сначала добавь реальную электронную почту.";
  }
  if (user.recoveryState === "service-email") {
    return "У пользователя служебная почта. Сначала нужна реальная электронная почта.";
  }
  return "";
}

function EmailLinkActions({ user }: { user: AdminUserListItem }) {
  const canPrepareEmailLink = user.recoveryState === "service-email" && user.risks.includes("telegram-placeholder-email") && Boolean(user.telegram?.id);
  const [status, setStatus] = useState<"idle" | "preparing" | "blocked" | "failed">("idle");

  async function handlePrepareEmailLink() {
    if (!canPrepareEmailLink) {
      return;
    }

    setStatus("preparing");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/email-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      setStatus("blocked");
    } catch {
      setStatus("failed");
    }
  }

  if (!canPrepareEmailLink) {
    return null;
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Привязка реальной почты</h2>
          <p className="mt-2 text-sm leading-6 text-forge-muted">Можно подготовить одноразовую ссылку для замены служебной почты на реальную.</p>
        </div>
        <button
          className={compactPrimaryActionClassName(status === "preparing" || status === "blocked", "inline-flex items-center justify-center text-xs")}
          disabled={status === "preparing" || status === "blocked"}
          type="button"
          onClick={() => void handlePrepareEmailLink()}
        >
          {status === "preparing" ? "Готовим" : status === "blocked" ? "Ожидает шлюз" : "Подготовить привязку email"}
        </button>
      </div>
      {status === "blocked" ? (
        <p className="mt-3 text-sm leading-6 text-forge-muted">Ссылка подготовлена. Отправка пользователю ждёт отдельный шлюз сообщений.</p>
      ) : null}
      {status === "failed" ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-forge-amber" role="alert">
          Привязку не удалось подготовить. Повтори позже.
        </p>
      ) : null}
    </section>
  );
}

function RecoveryActions({ user }: { user: AdminUserListItem }) {
  const canRecoverByEmail = user.recoveryState === "email-reset-ready" && Boolean(user.email);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function handleSendReset() {
    if (!canRecoverByEmail || !user.email) {
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Действия с доступом</h2>
          <p className="mt-2 text-sm leading-6 text-forge-muted">
            {canRecoverByEmail ? "Почтовое восстановление доступно" : "Восстановление по почте недоступно"}
          </p>
          {!canRecoverByEmail ? <p className="mt-1 text-sm leading-6 text-forge-muted">{recoveryBlockReason(user)}</p> : null}
        </div>
        {canRecoverByEmail ? (
          <button
            className={compactPrimaryActionClassName(status === "sending" || status === "sent", "inline-flex items-center justify-center text-xs")}
            disabled={status === "sending" || status === "sent"}
            type="button"
            onClick={() => void handleSendReset()}
          >
            {status === "sending" ? "Отправляем" : status === "sent" ? "Письмо отправлено" : "Отправить письмо восстановления"}
          </button>
        ) : null}
      </div>
      {status === "sent" ? (
        <p className="mt-3 text-sm leading-6 text-forge-muted">Письмо восстановления отправлено, если аккаунт может получать почту.</p>
      ) : null}
      {status === "failed" ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-forge-amber" role="alert">
          Письмо не отправлено. Повтори позже.
        </p>
      ) : null}
    </section>
  );
}

function PasswordRotationActions({ user }: { user: AdminUserListItem }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function handleRequireRotation() {
    setStatus("saving");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/password-rotation`, {
        body: JSON.stringify({ reason: "admin_required_rotation" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Смена пароля</h2>
          <p className="mt-2 text-sm leading-6 text-forge-muted">
            {user.hasPassword ? "Можно потребовать смену пароля при следующем входе." : "У пользователя нет пароля для входа."}
          </p>
        </div>
        {user.hasPassword ? (
          <button
            className={compactPrimaryActionClassName(status === "saving" || status === "saved", "inline-flex items-center justify-center text-xs")}
            disabled={status === "saving" || status === "saved"}
            type="button"
            onClick={() => void handleRequireRotation()}
          >
            {status === "saving" ? "Сохраняем" : status === "saved" ? "Смена пароля требуется" : "Потребовать смену пароля"}
          </button>
        ) : null}
      </div>
      {status === "saved" ? (
        <p className="mt-3 text-sm leading-6 text-forge-muted">При следующем входе пользователь будет направлен на смену пароля.</p>
      ) : null}
      {status === "failed" ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-forge-amber" role="alert">
          Требование смены пароля не сохранено. Повтори позже.
        </p>
      ) : null}
    </section>
  );
}

function AccessActions({ user }: { user: AdminUserListItem }) {
  const [accessState, setAccessState] = useState(user.accessState);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const isDenied = accessState === "denied";

  async function handleAccessChange() {
    setStatus("saving");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/access`, {
        body: JSON.stringify({ action: isDenied ? "restore" : "deny", reason: isDenied ? undefined : "admin_review" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      const payload = (await response.json()) as { accessState?: AdminUserListItem["accessState"] };
      setAccessState(payload.accessState ?? (isDenied ? "active" : "denied"));
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Управление доступом</h2>
          <p className="mt-2 text-sm leading-6 text-forge-muted">
            {isDenied ? "Пользователь не может входить в платформу." : "Пользователь может входить при наличии действующих учётных данных."}
          </p>
        </div>
        <button
          className={
            isDenied
              ? compactPrimaryActionClassName(status === "saving", "inline-flex items-center justify-center text-xs")
              : "tech-label inline-flex min-h-10 items-center justify-center rounded-sm border border-red-400/60 bg-transparent px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          }
          disabled={status === "saving"}
          type="button"
          onClick={() => void handleAccessChange()}
        >
          {status === "saving" ? "Сохраняем" : isDenied ? "Вернуть доступ" : "Запретить доступ"}
        </button>
      </div>
      {status === "saved" ? <p className="mt-3 text-sm leading-6 text-forge-muted">Состояние доступа обновлено.</p> : null}
      {status === "failed" ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-forge-amber" role="alert">
          Состояние доступа не изменено. Повтори позже.
        </p>
      ) : null}
    </section>
  );
}

function DeleteActions({ user }: { user: AdminUserListItem }) {
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "deleting" | "deleted" | "failed">("idle");

  async function handleDelete() {
    if (!confirmed || status === "deleted") {
      return;
    }

    setStatus("deleting");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/delete`, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      setStatus("deleted");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className="panel border-red-400/40 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Удаление пользователя</h2>
          <label className="mt-3 flex items-center gap-2 text-sm text-forge-muted">
            <input
              checked={confirmed}
              className="h-4 w-4 accent-red-400"
              disabled={status === "deleting" || status === "deleted"}
              type="checkbox"
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>Я понимаю, что действие необратимо</span>
          </label>
        </div>
        <button
          className="tech-label inline-flex min-h-10 items-center justify-center rounded-sm border border-red-400/60 bg-transparent px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!confirmed || status === "deleting" || status === "deleted"}
          type="button"
          onClick={() => void handleDelete()}
        >
          {status === "deleting" ? "Удаляем" : status === "deleted" ? "Пользователь удалён" : "Удалить пользователя"}
        </button>
      </div>
      {status === "deleted" ? <p className="mt-3 text-sm leading-6 text-forge-muted">Пользователь удалён. Вернись к списку пользователей.</p> : null}
      {status === "failed" ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-forge-amber" role="alert">
          Пользователь не удалён. Проверь связи аккаунта и повтори позже.
        </p>
      ) : null}
    </section>
  );
}

function candidateLabel(candidate: AdminUserListItem): string {
  const parts = [
    `пользователь: ${candidate.username}`,
    candidate.email ? `email: ${candidate.email}` : undefined,
    candidate.telegram?.username ? `@${candidate.telegram.username}` : undefined,
    candidate.telegram?.id ? `id ${candidate.telegram.id}` : undefined,
  ].filter(Boolean);
  return parts.join(" // ");
}

function CanonicalMergeActions({ candidates = [], user }: { candidates?: AdminUserListItem[]; user: AdminUserListItem }) {
  const availableCandidates = candidates.filter((candidate) => candidate.id !== user.id);
  const [targetUserId, setTargetUserId] = useState("");
  const [query, setQuery] = useState("");
  const selectedCandidate = availableCandidates.find((candidate) => candidate.id === targetUserId);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCandidates = availableCandidates
    .filter((candidate) => !normalizedQuery || candidateLabel(candidate).toLowerCase().includes(normalizedQuery))
    .slice(0, 6);

  return (
    <section className="panel p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Связывание учётных записей</h2>
          <label className="mt-4 block" htmlFor="canonical-user-search">
            <span className="tech-label text-xs text-forge-muted">Найти канонического пользователя</span>
            <input
              id="canonical-user-search"
              className="mt-2 w-full rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-sm text-forge-ink outline-none transition placeholder:text-forge-muted focus:border-forge-accent"
              placeholder="Имя, email или Telegram"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="mt-3 grid gap-2">
            {visibleCandidates.map((candidate) => {
              const selected = candidate.id === targetUserId;
              return (
                <button
                  key={candidate.id}
                  className={`rounded-sm border px-3 py-2 text-left text-sm transition ${
                    selected ? "border-forge-accent bg-forge-accent/10 text-forge-ink" : "border-forge-line bg-forge-surface text-forge-muted hover:border-forge-accent hover:text-forge-ink"
                  }`}
                  type="button"
                  onClick={() => setTargetUserId(candidate.id)}
                >
                  <span className="font-semibold text-forge-ink">{candidate.username}</span>
                  <span className="ml-2">{candidate.email ? `email: ${candidate.email}` : "почта не указана"}</span>
                  {candidate.telegram?.username ? <span className="ml-2">@{candidate.telegram.username}</span> : null}
                  {candidate.telegram?.id ? <span className="ml-2">ID {candidate.telegram.id}</span> : null}
                </button>
              );
            })}
            {visibleCandidates.length === 0 ? <p className="text-sm text-forge-muted">Кандидаты по поиску не найдены.</p> : null}
          </div>
          {selectedCandidate ? (
            <p className="mt-3 text-sm leading-6 text-forge-muted">
              Выбрана мастер-запись: <span className="font-semibold text-forge-ink">{candidateLabel(selectedCandidate)}</span>
            </p>
          ) : null}
        </div>
        <div className="flex items-end justify-end">
          <button
            className={compactPrimaryActionClassName(true, "inline-flex items-center justify-center text-xs")}
            disabled
            type="button"
          >
            Связывание ждёт модель связей
          </button>
        </div>
      </div>
      {availableCandidates.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-forge-muted">Нет доступных кандидатов для выбора канонической записи.</p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-forge-muted">
        Связь аккаунтов не выполняется старым переносом исходная -&gt; целевая. Нужна утверждённая модель нескольких связей.
      </p>
    </section>
  );
}

function IdentityLinkActions({ user }: { user: AdminUserListItem }) {
  const [email, setEmail] = useState(user.email ?? "");
  const [telegramId, setTelegramId] = useState(user.telegram?.id ? String(user.telegram.id) : "");
  const [telegramUsername, setTelegramUsername] = useState(user.telegram?.username ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const canSubmit = email.trim().length > 0 && telegramId.trim().length > 0 && status !== "saving" && status !== "saved";

  async function handleSave() {
    if (!canSubmit) {
      return;
    }

    setStatus("saving");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/identity-link`, {
        body: JSON.stringify({
          email: email.trim(),
          telegramId: telegramId.trim(),
          telegramUsername: telegramUsername.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className="panel p-4">
      <h2 className="heading-tech text-lg font-bold text-forge-ink">Email и Telegram</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="tech-label text-xs text-forge-muted">Реальная электронная почта</span>
          <input
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            disabled={status === "saving" || status === "saved"}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="tech-label text-xs text-forge-muted">Telegram ID</span>
          <input
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            disabled={status === "saving" || status === "saved"}
            value={telegramId}
            onChange={(event) => setTelegramId(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="tech-label text-xs text-forge-muted">Telegram username</span>
          <input
            className="mt-2 w-full rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
            disabled={status === "saving" || status === "saved"}
            value={telegramUsername}
            onChange={(event) => setTelegramUsername(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          className={compactPrimaryActionClassName(!canSubmit, "inline-flex items-center justify-center text-xs")}
          disabled={!canSubmit}
          type="button"
          onClick={() => void handleSave()}
        >
          {status === "saving" ? "Сохраняем" : status === "saved" ? "Связь сохранена" : "Сохранить связь"}
        </button>
      </div>
      {status === "saved" ? <p className="mt-3 text-sm leading-6 text-forge-muted">Email и Telegram сохранены для выбранной учётной записи.</p> : null}
      {status === "failed" ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-forge-amber" role="alert">
          Email и Telegram не сохранены. Проверь значения и повтори позже.
        </p>
      ) : null}
    </section>
  );
}

function LinkedServices({ links }: { links: ForgeServiceLink[] }) {
  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-1">
        <p className="tech-label text-xs text-forge-muted">Связанные сервисы</p>
        <h2 className="heading-tech text-lg font-bold text-forge-ink">Состояние связей аккаунта</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <article key={link.serviceKey} className="rounded-sm border border-forge-line bg-forge-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-forge-ink">{link.serviceName}</h3>
                <p className="mt-1 text-sm text-forge-muted">{link.accountLabel ?? link.accountEmail ?? "учётная запись не указана"}</p>
              </div>
              <StatusBadge ready={link.status === "connected"}>{serviceStatusLabels[link.status]}</StatusBadge>
            </div>
            <dl className="mt-4 grid gap-2 text-sm text-forge-muted">
              <div className="flex flex-col gap-1">
                <dt className="tech-label text-[10px]">Email сервиса</dt>
                <dd className="text-forge-ink">{link.accountEmail ?? "не указан"}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="tech-label text-[10px]">Связано</dt>
                <dd className="text-forge-ink">{formatDate(link.linkedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecentActivity({ events }: { events: UserSecurityAuditActivity[] }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-forge-line p-4">
        <p className="tech-label text-xs text-forge-muted">Активность</p>
        <h2 className="heading-tech mt-1 text-lg font-bold text-forge-ink">Последние события аккаунта</h2>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-5 text-sm text-forge-muted">Событий по этому пользователю пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-forge-surface text-xs uppercase text-forge-muted">
              <tr>
                <th className="px-4 py-3">Время</th>
                <th className="px-4 py-3">Событие</th>
                <th className="px-4 py-3">Метод</th>
                <th className="px-4 py-3">Путь</th>
                <th className="px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-forge-line">
                  <td className="px-4 py-3 text-forge-muted">{formatDate(event.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-forge-ink">{event.activityLabel}</td>
                  <td className="px-4 py-3 text-forge-muted">{event.method}</td>
                  <td className="px-4 py-3 font-mono text-xs text-forge-muted">{event.path}</td>
                  <td className="px-4 py-3 text-forge-muted">{event.statusCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AdminUserDetailPage({
  canonicalCandidates = [],
  recentActivity = [],
  serviceLinks = [],
  user,
}: {
  canonicalCandidates?: AdminUserListItem[];
  recentActivity?: UserSecurityAuditActivity[];
  serviceLinks?: ForgeServiceLink[];
  user: AdminUserListItem;
}) {
  const telegram = user.telegram?.username ? `@${user.telegram.username}` : user.telegram?.id ? `id ${user.telegram.id}` : "нет";
  const role = user.role?.displayName ?? user.role?.name ?? "без роли";

  return (
    <PortalPageShell>
      <PortalHeader
        actions={
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-4 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/admin/users">
            К списку пользователей
          </Link>
        }
        breadcrumbs={[
          { href: "/", label: "Портал" },
          { href: "/admin", label: "Администрирование" },
          { href: "/admin/users", label: "Пользователи" },
        ]}
        description="Безопасный просмотр состояния аккаунта без отображения паролей, токенов, секретов и внутренних подключений."
        title="Карточка пользователя"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Пользователь" value={user.username} />
        <Field label="Электронная почта" value={user.email ?? "почта не указана"} />
        <Field label="Роль" value={role} />
        <Field label="Telegram" value={telegram} />
        <Field label="Источник регистрации" value={user.registrationSource ?? "источник неизвестен"} />
        <Field label="Создан" value={formatDate(user.createdAt)} />
        <Field label="Последняя активность" value={formatDate(user.lastSeen)} />
        <Field label="Доступ" value={<StatusBadge ready={user.hasPassword}>{user.hasPassword ? "вход по паролю" : "пароль не задан"}</StatusBadge>} />
        <Field label="Состояние" value={<StatusBadge ready={user.accessState === "active"}>{user.accessState === "denied" ? "доступ запрещён" : "доступ разрешён"}</StatusBadge>} />
        <Field label="Восстановление" value={<StatusBadge ready={user.recoveryState === "email-reset-ready"}>{recoveryLabels[user.recoveryState]}</StatusBadge>} />
      </section>

      <section className="panel p-4">
        <p className="tech-label text-xs text-forge-muted">Признаки риска доступа</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {user.risks.length === 0 ? (
            <StatusBadge ready>ок</StatusBadge>
          ) : (
            user.risks.map((risk) => <StatusBadge key={risk}>{riskLabels[risk]}</StatusBadge>)
          )}
        </div>
      </section>

      <LinkedServices links={serviceLinks} />

      <RecentActivity events={recentActivity} />

      <AccessActions user={user} />

      <EmailLinkActions user={user} />

      <RecoveryActions user={user} />

      <PasswordRotationActions user={user} />

      <IdentityLinkActions user={user} />

      <CanonicalMergeActions candidates={canonicalCandidates} user={user} />

      <DeleteActions user={user} />
    </PortalPageShell>
  );
}
