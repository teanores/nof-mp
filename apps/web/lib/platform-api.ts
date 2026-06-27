import type { ForgePortalSession, ForgeProject, ForgeServiceLink } from "@/lib/types";
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

export async function updatePortalProfile(input: { aboutMe?: string; username: string }): Promise<NonNullable<ForgePortalSession["user"]>> {
  const data = await readJson<{ profile: NonNullable<ForgePortalSession["user"]> }>(
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return data.profile;
}

export async function fetchPlatformProjects(): Promise<ForgeProject[]> {
  const data = await readJson<{ projects: ForgeProject[] }>(await fetch("/api/platform/projects", { cache: "no-store" }));
  return data.projects;
}

export async function fetchProfileServiceLinks(): Promise<ForgeServiceLink[]> {
  const data = await readJson<{ links: ForgeServiceLink[] }>(await fetch("/api/profile/service-links", { cache: "no-store" }));
  return data.links;
}

export async function unlinkProfileService(serviceKey: ForgeServiceLink["serviceKey"]): Promise<ForgeServiceLink> {
  const data = await readJson<{ link: ForgeServiceLink }>(
    await fetch(`/api/profile/service-links?serviceKey=${encodeURIComponent(serviceKey)}`, { method: "DELETE" }),
  );
  return data.link;
}

export async function changeProfilePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await readJson<{ ok: true }>(
    await fetch("/api/profile/password", {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
}

export async function uploadProfileAvatar(file: File): Promise<{ objectKey: string }> {
  const magicBytes = btoa(String.fromCharCode(...new Uint8Array(await file.slice(0, 16).arrayBuffer())));
  const data = await readJson<{ objectKey: string; uploadUrl: string }>(
    await fetch("/api/profile/avatar/upload-url", {
      body: JSON.stringify({
        contentType: file.type,
        fileName: file.name,
        magicBytesBase64: magicBytes,
        sizeBytes: file.size,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  const upload = await fetch(data.uploadUrl, {
    body: file,
    headers: { "Content-Type": file.type },
    method: "PUT",
  });
  if (!upload.ok) {
    throw new Error("avatar_upload_failed");
  }
  return { objectKey: data.objectKey };
}
