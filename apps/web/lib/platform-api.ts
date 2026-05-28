import type { ForgeMcpToken, ForgePortalSession, ForgeProject } from "@/lib/types";
import type { PortalLanguage } from "@/lib/portal-language";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchPortalSession(): Promise<ForgePortalSession> {
  return readJson<ForgePortalSession>(await fetch("/api/me", { cache: "no-store" }));
}

export async function updatePortalPreferences(input: { language: PortalLanguage }): Promise<ForgePortalSession["preferences"]> {
  const data = await readJson<{ preferences: ForgePortalSession["preferences"] }>(
    await fetch("/api/profile/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return data.preferences;
}

export async function fetchMcpTokens(): Promise<ForgeMcpToken[]> {
  const data = await readJson<{ tokens: ForgeMcpToken[] }>(await fetch("/api/mcp-tokens", { cache: "no-store" }));
  return data.tokens;
}

export async function createMcpToken(input: { name: string; projectKey?: string; scopes?: string[] }): Promise<{ token: ForgeMcpToken; fullToken: string }> {
  return readJson<{ token: ForgeMcpToken; fullToken: string }>(
    await fetch("/api/mcp-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function revokeMcpToken(tokenId: string): Promise<void> {
  const response = await fetch(`/api/mcp-tokens/${encodeURIComponent(tokenId)}`, { method: "DELETE" });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }
}

export async function fetchPlatformProjects(): Promise<ForgeProject[]> {
  const data = await readJson<{ projects: ForgeProject[] }>(await fetch("/api/platform/projects", { cache: "no-store" }));
  return data.projects;
}
