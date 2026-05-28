export type PlatformRole = "owner" | "admin" | "moderator" | "user" | "guest";

export type ProductVisibility = "public" | "registered" | "invited" | "owners";

export type ProductKey = "nof-tt" | "nof-ht" | "nof-cb" | "nof-onw" | (string & {});

export interface PlatformProductAccessPolicy {
  productKey: ProductKey;
  visibility: ProductVisibility;
  invitedUserIds?: string[];
  ownerUserIds?: string[];
}

export interface PlatformAccessSubject {
  role: PlatformRole;
  userId?: string;
}

export interface PlatformAccessDecision {
  allowed: boolean;
  reason:
    | "public-product"
    | "registered-user"
    | "invited-user"
    | "owner-user"
    | "platform-staff"
    | "authentication-required"
    | "invitation-required"
    | "owner-required";
}

export const platformStaffRoles: PlatformRole[] = ["owner", "admin", "moderator"];

export function canAccessProduct(subject: PlatformAccessSubject, policy: PlatformProductAccessPolicy): PlatformAccessDecision {
  if (platformStaffRoles.includes(subject.role)) {
    return { allowed: true, reason: "platform-staff" };
  }

  if (policy.visibility === "public") {
    return { allowed: true, reason: "public-product" };
  }

  if (!subject.userId || subject.role === "guest") {
    return { allowed: false, reason: "authentication-required" };
  }

  if (policy.visibility === "registered") {
    return { allowed: true, reason: "registered-user" };
  }

  if (policy.visibility === "invited") {
    return policy.invitedUserIds?.includes(subject.userId)
      ? { allowed: true, reason: "invited-user" }
      : { allowed: false, reason: "invitation-required" };
  }

  return policy.ownerUserIds?.includes(subject.userId)
    ? { allowed: true, reason: "owner-user" }
    : { allowed: false, reason: "owner-required" };
}

export interface PlatformTableSpec {
  name: string;
  purpose: string;
  owner: "nof-platform";
  storesSecrets: boolean;
}

export const platformTableSpecs: PlatformTableSpec[] = [
  {
    name: "nof_platform.users",
    purpose: "Canonical platform account identity and profile linkage to existing Dragon Forge users during migration.",
    owner: "nof-platform",
    storesSecrets: false,
  },
  {
    name: "nof_platform.sessions",
    purpose: "Server-side session records or signed session metadata for platform login and product handoff.",
    owner: "nof-platform",
    storesSecrets: true,
  },
  {
    name: "nof_platform.user_preferences",
    purpose: "Per-user language, theme and future personal portal settings.",
    owner: "nof-platform",
    storesSecrets: false,
  },
  {
    name: "nof_platform.products",
    purpose: "Product registry: task tracker, habit tracker, coffee portal, learning portal and future tools.",
    owner: "nof-platform",
    storesSecrets: false,
  },
  {
    name: "nof_platform.product_access",
    purpose: "Product visibility and per-user access rules: public, registered, invited or owners only.",
    owner: "nof-platform",
    storesSecrets: false,
  },
  {
    name: "nof_platform.mcp_tokens",
    purpose: "Hashed MCP tokens issued from the platform profile and scoped to products/projects.",
    owner: "nof-platform",
    storesSecrets: true,
  },
];
