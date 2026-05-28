import type { PlatformAccessSubject, PlatformRole } from "@/lib/platform-access-contract";
import { listPlatformProjects, platformProjectRecords, projectExists } from "@/lib/platform-projects";
import type { ForgePortalSession, ForgeProject } from "@/lib/types";

const platformRoles: PlatformRole[] = ["owner", "admin", "moderator", "user", "guest"];

function normalizePlatformRole(roleName?: string): PlatformRole {
  const normalized = roleName?.trim().toLowerCase();
  if (normalized && platformRoles.includes(normalized as PlatformRole)) {
    return normalized as PlatformRole;
  }
  return "user";
}

export function subjectFromPortalSession(session: ForgePortalSession): PlatformAccessSubject {
  if (!session.authenticated || !session.user?.id) {
    return { role: "guest" };
  }

  return {
    role: normalizePlatformRole(session.user.role?.name),
    userId: session.user.id,
  };
}

export class ProductAccessRepository {
  static fromStaticRegistry(): ProductAccessRepository {
    return new ProductAccessRepository();
  }

  async listForSubject(subject: PlatformAccessSubject): Promise<ForgeProject[]> {
    return listPlatformProjects(subject);
  }

  async exists(projectKey: string): Promise<boolean> {
    return projectExists(projectKey);
  }

  async knownProjectKeys(): Promise<string[]> {
    return platformProjectRecords.map((project) => project.key);
  }
}

let repository: ProductAccessRepository | undefined;

export function getProductAccessRepository(): ProductAccessRepository {
  repository ??= ProductAccessRepository.fromStaticRegistry();
  return repository;
}