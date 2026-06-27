"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { PortalActionBar, PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import { portalModules, systemHealthCards, type PortalModule } from "@/lib/portal-shell";
import { fetchPortalSession } from "@/lib/platform-api";
import type { ForgePortalSession, ForgePortalUser } from "@/lib/types";
import { usePortalLanguage } from "@/lib/use-portal-language";

const overviewCopy = {
  en: {
    adminRequests: "Requests",
    adminRequestsNote: "Login attempts, rate limits and public scans.",
    adminHome: "Administration",
    adminHomeNote: "Users, security and platform management sections.",
    adminUsers: "Users",
    adminUsersNote: "Accounts, roles and access risks.",
    description: "Portal experiments: habit tracker, task tracker and streamer portal.",
    open: "Open",
    portalState: "Portal state",
    portalStateNote: "The platform is the entry point for account, profile, product discovery and access.",
    portalTitle: "NOF Platform",
    profile: "Profile",
    signIn: "Sign in",
    modules: "Platform Sections",
    modulesEyebrow: "Platform Services",
    systemStatus: "Service Status",
  },
  ru: {
    adminRequests: "Запросы",
    adminRequestsNote: "Входы, ограничения частоты и публичные сканы.",
    adminHome: "Администрирование",
    adminHomeNote: "Пользователи, безопасность и разделы управления платформой.",
    adminUsers: "Пользователи",
    adminUsersNote: "Аккаунты, роли и риски доступа.",
    description: "Портал экспериментов Te'An'ore. Трекер привычек, Трекер задач, Портал стримера.",
    open: "Открыть",
    portalState: "Состояние портала",
    portalStateNote: "Платформа является точкой входа для аккаунта, профиля, обзора сервисов и доступа.",
    portalTitle: "Платформа NOF",
    profile: "Профиль",
    signIn: "Войти",
    modules: "Разделы кузницы",
    modulesEyebrow: "Сервисы платформы",
    systemStatus: "Статус сервисов",
  },
} as const;

const moduleCopy = {
  en: {
    tracker: {
      description: "Task, epic, sprint and working plan tracker.",
      eyebrowLabel: "Tasks",
      title: "Task Tracker",
    },
    habits: {
      description: "Habit, goal and regular practice tracker.",
      eyebrowLabel: "Habits",
      title: "Habit Tracker",
    },
    streamer: {
      description: "Incubation service for stream planning, publishing preparation and future public workflow automation.",
      eyebrowLabel: "Streams",
      title: "Streamer Portal",
    },
  },
  ru: {
    tracker: {
      description: "Трекер задач, эпиков, спринтов и рабочих планов.",
      eyebrowLabel: "Задачи",
      title: "Task Tracker",
    },
    habits: {
      description: "Трекер привычек, целей и регулярных практик.",
      eyebrowLabel: "Привычки",
      title: "Habit Tracker",
    },
    streamer: {
      description: "Инкубационный сервис для планирования стримов, подготовки публикаций и будущей автоматизации публичных активностей.",
      eyebrowLabel: "Стримы",
      title: "Портал стримера",
    },
  },
} as const;

const statusCopy = {
  en: {
    available: "Available",
    legacy: "Archive",
    planned: "Planned",
    preview: "Preview",
  },
  ru: {
    available: "Доступен",
    legacy: "Архив",
    planned: "Запланирован",
    preview: "Предпросмотр",
  },
} as const;

const healthCardsCopy = {
  en: [
    { label: "Public address", value: "forgath.ru", note: "entry point" },
    { label: "Account", value: "NOF Main Platform", note: "unified profile" },
    { label: "Workspace", value: "Task Tracker", note: "tasks and Wiki" },
  ],
  ru: systemHealthCards,
} as const;

function canSeeAdminLinks(session?: ForgePortalSession): boolean {
  const roleName = session?.user?.role?.name;
  return roleName === "owner" || roleName === "admin";
}

function ModuleCard({ module }: { module: PortalModule }) {
  const language = usePortalLanguage();
  const copy = overviewCopy[language];
  const localizedModule = moduleCopy[language][module.key as keyof typeof moduleCopy.ru];

  return (
    <Link className="panel block min-h-[190px] p-4 transition hover:border-forge-accent" href={module.href}>
      <div className="flex items-start justify-between gap-3">
        <p className="tech-label text-xs text-forge-accent">{localizedModule.eyebrowLabel}</p>
        <span className="tech-label rounded-sm border border-forge-line bg-forge-surface px-2 py-1 text-[10px] text-forge-muted">
          {statusCopy[language][module.status]}
        </span>
      </div>
      <h3 className="heading-tech mt-3 text-xl font-bold text-forge-ink">{localizedModule.title}</h3>
      <p className="mt-3 text-sm leading-6 text-forge-muted">{localizedModule.description}</p>
      <span className="tech-label mt-5 inline-flex text-xs text-forge-accent">{copy.open} {">"}</span>
    </Link>
  );
}

function avatarInitials(user?: ForgePortalUser): string {
  const username = user?.username?.trim();
  if (!username) {
    return "?";
  }
  const parts = username.split(/[\s._-]+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : username.slice(0, 2);
  return initials.toUpperCase();
}

function ProfileAction({ initialSession }: { initialSession?: ForgePortalSession }) {
  const copy = overviewCopy[usePortalLanguage()];
  const [user, setUser] = useState<ForgePortalUser | undefined>(initialSession?.user);
  const [loginUrl, setLoginUrl] = useState(initialSession?.loginUrl ?? "/login?next=%2Foverview");

  useEffect(() => {
    if (initialSession) {
      setUser(initialSession.user);
      setLoginUrl(initialSession.loginUrl || "/login?next=%2Foverview");
      return;
    }

    let isMounted = true;

    async function loadUser() {
      try {
        const session = await fetchPortalSession();
        if (isMounted) {
          setUser(session.user);
          setLoginUrl(session.loginUrl || "/login?next=%2Foverview");
        }
      } catch {
        if (isMounted) {
          setUser(undefined);
          setLoginUrl("/login?next=%2Foverview");
        }
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [initialSession]);

  if (!user) {
    return (
      <Link
        className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-4 py-3 text-xs font-bold text-black transition"
        href={loginUrl}
      >
        {copy.signIn}
      </Link>
    );
  }

  return (
    <Link
      aria-label={`Профиль ${user.username}`}
      className="grid h-12 w-12 place-items-center rounded-full border border-forge-accent bg-forge-surface text-sm font-bold text-forge-accent transition hover:bg-forge-accent hover:text-black"
      href="/profile"
      title={user.username}
    >
      {avatarInitials(user)}
    </Link>
  );
}

export function PortalOverviewPage({ initialSession }: { initialSession?: ForgePortalSession }) {
  const language = usePortalLanguage();
  const copy = overviewCopy[language];
  const healthCards = healthCardsCopy[language];
  const showAdminLinks = canSeeAdminLinks(initialSession);

  return (
    <PortalPageShell>
      <PortalHeader
        actions={<ProfileAction initialSession={initialSession} />}
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
          <p className="tech-label text-xs text-forge-accent">{copy.systemStatus}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {healthCards.map(({ label, note, value }) => (
              <div key={label} className="rounded-sm border border-forge-line bg-forge-surface p-3">
                <p className="tech-label text-[10px] text-forge-muted">{label}</p>
                <p className="mt-1 text-sm font-bold text-forge-ink">{value}</p>
                <p className="mt-1 text-xs text-forge-muted">{note}</p>
              </div>
            ))}
          </div>
          {showAdminLinks ? (
            <div className="mt-4">
              <Link className="block rounded-sm border border-forge-line bg-forge-surface p-3 transition hover:border-forge-accent" href="/admin">
                <p className="tech-label text-[10px] text-forge-accent">{copy.adminHome}</p>
                <p className="mt-1 text-sm font-bold text-forge-ink">{copy.adminHome}</p>
                <p className="mt-1 text-xs text-forge-muted">{copy.adminHomeNote}</p>
              </Link>
            </div>
          ) : null}
        </article>
      </section>

      <PortalActionBar eyebrow={copy.modulesEyebrow} title={copy.modules} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {portalModules.map((module) => (
          <ModuleCard key={module.key} module={module} />
        ))}
      </section>
    </PortalPageShell>
  );
}
