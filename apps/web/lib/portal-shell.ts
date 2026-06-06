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
    description: "Трекер задач, эпиков, спринтов и рабочих планов.",
    href: "/services/task-tracker",
    status: "available",
  },
  {
    key: "habits",
    title: "Habit Tracker",
    description: "Трекер привычек, целей и регулярных практик.",
    href: "/services/habit-tracker",
    status: "preview",
  },
  {
    key: "streamer",
    title: "Портал стримера",
    description: "Раздел для стримов, контента и публичных активностей Te'An'ore.",
    href: "/services/streamer",
    status: "planned",
  },
];

export const systemHealthCards: SystemHealthCard[] = [
  { label: "Public URL", value: "forgath.ru", note: "platform entry" },
  { label: "Identity", value: "NOF Main Platform", note: "account surface" },
  { label: "Workspace", value: "Task Tracker", note: "delivery and Wiki" },
];

export const protectedPortalRoutes = [
  "/overview",
  "/profile",
  "/admin/users",
];

export function portalModuleStatusLabel(status: PortalModuleStatus): string {
  return status;
}
