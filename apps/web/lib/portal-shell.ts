export type PortalModuleStatus = "available" | "preview" | "legacy" | "planned";

export interface PortalModule {
  description: string;
  href: string;
  key: string;
  status: PortalModuleStatus;
  title: string;
}

export interface SystemHealthCard {
  label: string;
  note: string;
  value: string;
}

export const portalModules: PortalModule[] = [
  {
    key: "tracker",
    title: "Task Tracker",
    description: "Эпики, задачи, спринты и планирование работы агентов.",
    href: "/projects",
    status: "available",
  },
  {
    key: "habits",
    title: "Habit Tracker",
    description: "Трекер привычек, целей, групп, достижений и будущей миграции nof-ht в единый портал.",
    href: "/projects/nof-ht",
    status: "preview",
  },
  {
    key: "ideas",
    title: "Ideas Inbox",
    description: "Сырые идеи из Telegram `/idea`, портала и будущего MCP до превращения в требования и задачи.",
    href: "/ideas",
    status: "available",
  },
  {
    key: "wiki",
    title: "Wiki / Requirements",
    description: "Требования, сценарии, решения и runbooks проекта NOFTT.",
    href: "/projects/nof-tt",
    status: "available",
  },
  {
    key: "references",
    title: "Справочники",
    description: "Точка входа в будущие справочники Dragon Forge и лор-данные.",
    href: "/references",
    status: "preview",
  },
  {
    key: "bots",
    title: "Боты и чаты",
    description: "Telegram, Naragothal и chat tooling как управляемые разделы портала.",
    href: "/bots",
    status: "preview",
  },
  {
    key: "legacy",
    title: "Legacy Dragon Forge",
    description: "Старые Python/Jinja2 разделы до миграции в новый WEB UI.",
    href: "/legacy",
    status: "legacy",
  },
  {
    key: "profile",
    title: "Личный кабинет",
    description: "Профиль текущего пользователя из существующей базы Dragon Forge.",
    href: "/profile",
    status: "available",
  },
];

export const systemHealthCards: SystemHealthCard[] = [
  { label: "Canonical", value: "192.168.1.51:30500", note: "gateway target" },
  { label: "Preview", value: "192.168.1.51:30510", note: "active UAT" },
  { label: "Backend", value: "dragon-forge-service", note: "auth/source of truth" },
  { label: "Storage", value: "forge_tasks", note: "tracker/wiki schema" },
];

export const protectedPortalRoutes = [
  "/overview",
  "/projects/nof-tt",
  "/tasks",
  "/epics",
  "/sprints",
  "/profile",
];

export function portalModuleStatusLabel(status: PortalModuleStatus): string {
  return status;
}
