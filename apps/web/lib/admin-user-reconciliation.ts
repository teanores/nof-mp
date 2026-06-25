import type { AdminUserListItem } from "@/lib/server/admin-users-repository";

export interface AdminUserReconciliationSummary {
  deniedUsers: number;
  duplicateOrDevCandidates: number;
  manualReviewUsers: number;
  nofHtMatchReadyUsers: number;
  realEmailUsers: number;
  serviceEmailUsers: number;
  telegramOnlyUsers: number;
  totalUsers: number;
}

function isDuplicateOrDevCandidate(user: AdminUserListItem): boolean {
  const registrationSource = user.registrationSource?.toLowerCase() ?? "";
  const username = user.username.toLowerCase();
  const role = user.role?.name.toLowerCase() ?? "";
  return user.accessState === "denied" && (registrationSource.includes("dev") || username.includes("dev") || role === "admin");
}

function isNofHtMatchReady(user: AdminUserListItem): boolean {
  return Boolean(user.telegram?.id) && (user.recoveryState === "email-reset-ready" || user.recoveryState === "service-email");
}

export function summarizeUserReconciliation(users: AdminUserListItem[]): AdminUserReconciliationSummary {
  return {
    deniedUsers: users.filter((user) => user.accessState === "denied").length,
    duplicateOrDevCandidates: users.filter(isDuplicateOrDevCandidate).length,
    manualReviewUsers: users.filter((user) => user.risks.length > 0).length,
    nofHtMatchReadyUsers: users.filter(isNofHtMatchReady).length,
    realEmailUsers: users.filter((user) => user.recoveryState === "email-reset-ready").length,
    serviceEmailUsers: users.filter((user) => user.recoveryState === "service-email").length,
    telegramOnlyUsers: users.filter((user) => user.accountState === "telegram-only").length,
    totalUsers: users.length,
  };
}
