export type PortalModuleStatus = "available" | "preview" | "legacy" | "planned";

export interface PortalModule {
  description: string;
  eyebrowLabel: string;
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
    eyebrowLabel: "Задачи",
    title: "Task Tracker",
    description: "Трекер задач, эпиков, спринтов и рабочих планов.",
    href: "/services/task-tracker",
    status: "available",
  },
  {
    key: "habits",
    eyebrowLabel: "Привычки",
    title: "Habit Tracker",
    description: "Трекер привычек, целей и регулярных практик.",
    href: "/services/habit-tracker",
    status: "preview",
  },
  {
    key: "streamer",
    eyebrowLabel: "Стримы",
    title: "Портал стримера",
    description: "Раздел для стримов, контента и публичных активностей Te'An'ore.",
    href: "/services/streamer",
    status: "planned",
  },
];

export const systemHealthCards: SystemHealthCard[] = [
  { label: "Публичный адрес", value: "forgath.ru", note: "точка входа" },
  { label: "Учётная запись", value: "NOF Main Platform", note: "единый профиль" },
  { label: "Рабочее пространство", value: "Task Tracker", note: "задачи и Wiki" },
];

export const protectedPortalRoutes = [
  "/overview",
  "/profile",
  "/admin/users",
];

export function portalModuleStatusLabel(status: PortalModuleStatus): string {
  const labels: Record<PortalModuleStatus, string> = {
    available: "Доступен",
    legacy: "Архив",
    planned: "Запланирован",
    preview: "Предпросмотр",
  };
  return labels[status];
}
