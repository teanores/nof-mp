export interface ForgeProject {
  key: string;
  name: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
}

export interface ForgePortalUser {
  id: string;
  username: string;
  email?: string;
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

export interface ForgeMcpToken {
  id: string;
  name: string;
  projectKey: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface CreateMcpTokenInput {
  name: string;
  projectKey?: string;
  scopes?: string[];
}
