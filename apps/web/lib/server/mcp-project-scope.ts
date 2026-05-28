const projectKeyPattern = /^[a-z][a-z0-9-]{1,31}$/;

export interface McpProjectScopeInput {
  allowedProjectKeys: string[];
  allowMissingProjectWithPlatformAdmin?: boolean;
  requestedProjectKey?: string;
  scopes: string[];
  tokenProjectKey: string;
}

export function normalizeMcpProjectKey(projectKey: string): string {
  const normalized = projectKey.trim().toLowerCase();
  if (!projectKeyPattern.test(normalized)) {
    throw new Error("Project key must contain 2-32 lowercase latin letters, numbers or dashes");
  }
  return normalized;
}

export function mcpTokenPrefixForProject(projectKey: string): string {
  const normalizedProjectKey = normalizeMcpProjectKey(projectKey);
  if (normalizedProjectKey === "nof-tt") {
    return "nof_tt_mcp_";
  }
  if (normalizedProjectKey.startsWith("nof-")) {
    return `${normalizedProjectKey.replaceAll("-", "_")}_mcp_`;
  }
  return `nof_${normalizedProjectKey.replaceAll("-", "_")}_mcp_`;
}

export function assertMcpProjectScope(input: McpProjectScopeInput): string {
  const tokenProjectKey = normalizeMcpProjectKey(input.tokenProjectKey);
  const requestedProjectKey = normalizeMcpProjectKey(input.requestedProjectKey ?? tokenProjectKey);
  const isPlatformAdmin = input.scopes.includes("platform:admin");
  const projectExists = input.allowedProjectKeys.includes(requestedProjectKey);

  if (!projectExists && !(input.allowMissingProjectWithPlatformAdmin && isPlatformAdmin)) {
    throw new Error(`MCP target project does not exist: ${requestedProjectKey}`);
  }

  if (!isPlatformAdmin && requestedProjectKey !== tokenProjectKey) {
    throw new Error(`MCP token is scoped to project ${tokenProjectKey} and cannot write to project ${requestedProjectKey}`);
  }

  return requestedProjectKey;
}
