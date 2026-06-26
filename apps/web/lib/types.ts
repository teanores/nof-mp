import type { ProductVisibility } from "@/lib/platform-access-contract";

export interface ForgeProject {
  key: string;
  name: string;
  description: string;
  status: "active" | "archived";
  visibility: ProductVisibility;
  access: {
    allowed: boolean;
    reason: string;
  };
  createdAt: string;
}

export interface ForgePortalUser {
  id: string;
  username: string;
  email?: string;
  emailVerified?: boolean;
  aboutMe?: string;
  experience: number;
  level?: {
    id?: number;
    name: string;
    number?: number;
  };
  rank?: {
    id?: number;
    name: string;
    number?: number;
  };
  role?: {
    id: number;
    name: string;
    displayName?: string;
  };
  telegram?: {
    id?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  };
  registrationSource?: string;
  createdAt?: string;
  lastSeen?: string;
}

export interface ForgePortalSession {
  authenticated: boolean;
  loginUrl: string;
  preferences?: {
    language: "ru" | "en";
  };
  user?: ForgePortalUser;
}

export interface ForgeServiceLink {
  serviceKey: "nof-ht" | "nof-tt";
  serviceName: string;
  status: "connected" | "not_connected" | "unavailable";
  accountEmail?: string;
  accountLabel?: string;
  linkedAt?: string;
  canUnlink: boolean;
  openHref: string;
}
