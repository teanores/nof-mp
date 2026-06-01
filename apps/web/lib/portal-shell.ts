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
    title: "Forge Tasks",
    description: "Трекер задач, эпиков, спринтов и рабочих планов.",
    href: "/services/forge-tasks",
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
  { label: "Canonical", value: "192.168.1.51:30500", note: "gateway target" },
  { label: "Backend", value: "dragon-forge-service", note: "auth/source of truth" },
  { label: "Storage", value: "forge_tasks", note: "tracker/wiki schema" },
];

export const protectedPortalRoutes = [
  "/overview",
  "/profile",
];

export function portalModuleStatusLabel(status: PortalModuleStatus): string {
  return status;
}