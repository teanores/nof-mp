import {
  canAccessProduct,
  type PlatformAccessSubject,
  type PlatformProductAccessPolicy,
  type ProductVisibility,
} from "@/lib/platform-access-contract";
import type { ForgeProject } from "@/lib/types";

interface PlatformProjectRecord {
  key: string;
  name: string;
  description: string;
  status: "active" | "archived";
  visibility: ProductVisibility;
  invitedUserIds?: string[];
  ownerUserIds?: string[];
  createdAt: string;
}

const defaultSubject: PlatformAccessSubject = { role: "guest" };

export const platformProjectRecords: PlatformProjectRecord[] = [
  {
    key: "nof-tt",
    name: "Narag'Othal Forgath Task Tracker",
    description: "Task tracker, Wiki, ideas, sprints and MCP automation for platform/product delivery.",
    status: "active",
    visibility: "registered",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    key: "nof-ht",
    name: "NOF Habit Tracker",
    description: "Habit tracker product integrated with the platform account and access model.",
    status: "active",
    visibility: "registered",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    key: "nof-cb",
    name: "NOF Coffee Bot",
    description: "Standalone coffee ordering product with optional platform integration.",
    status: "active",
    visibility: "public",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    key: "nof-onw",
    name: "Орден Нейронного Пути",
    description: "Школа проектов на основе ИИ и системного мышления.",
    status: "active",
    visibility: "invited",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
];

function toAccessPolicy(project: PlatformProjectRecord): PlatformProductAccessPolicy {
  return {
    productKey: project.key,
    visibility: project.visibility,
    invitedUserIds: project.invitedUserIds,
    ownerUserIds: project.ownerUserIds,
  };
}

export function listPlatformProjects(subject: PlatformAccessSubject = defaultSubject): ForgeProject[] {
  return platformProjectRecords.map((project) => {
    const access = canAccessProduct(subject, toAccessPolicy(project));

    return {
      key: project.key,
      name: project.name,
      description: project.description,
      status: project.status,
      visibility: project.visibility,
      access,
      createdAt: project.createdAt,
    };
  });
}

export const platformProjects: ForgeProject[] = listPlatformProjects();

export function projectExists(projectKey: string): boolean {
  return platformProjectRecords.some((project) => project.key === projectKey);
}
