import type { ForgeProject } from "@/lib/types";

export const platformProjects: ForgeProject[] = [
  {
    key: "noftt",
    name: "Narag'Othal Forgath Task Tracker",
    description: "Task tracker, Wiki, ideas, sprints and MCP automation for platform/product delivery.",
    status: "active",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    key: "nof-ht",
    name: "NOF Habit Tracker",
    description: "Habit tracker product integrated with the platform account and access model.",
    status: "active",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    key: "nof-cb",
    name: "NOF Coffee Bot",
    description: "Standalone coffee ordering product with optional platform integration.",
    status: "active",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    key: "nof-onw",
    name: "????? ?????????? ????",
    description: "School of AI-agent projects and system thinking.",
    status: "active",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
];

export function projectExists(projectKey: string): boolean {
  return platformProjects.some((project) => project.key === projectKey);
}
