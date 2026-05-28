export type TaskFilter = "all" | "active" | "done";

export type TaskPriority = "P0" | "P1" | "P2" | "P3";

export type TaskSource = "backlog" | "technical-debt" | "idea" | "manual";

export type EpicStatus = "backlog" | "todo" | "in_progress" | "uat" | "done";

export type WikiPageType = "requirements" | "scenario" | "decision" | "runbook" | "note";

export interface ForgeProject {
  key: string;
  name: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
}

export interface CreateProjectInput {
  key: string;
  name: string;
  description?: string;
}

export interface ForgeWikiPage {
  projectKey: string;
  slug: string;
  title: string;
  content: string;
  type: WikiPageType;
  createdAt: string;
  updatedAt: string;
}

export type ForgeIdeaStatus = "new" | "triaged" | "linked" | "rejected";

export interface ForgeIdea {
  id: string;
  key: string;
  projectKey: string;
  title: string;
  text: string;
  source: "telegram_bot" | "portal" | "mcp";
  status: ForgeIdeaStatus;
  linkedEpicKey?: string;
  linkedTaskId?: string;
  linkedWikiSlug?: string;
  triageNotes?: string;
  telegramId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramChatId?: number;
  telegramChatType?: string;
  telegramChatTitle?: string;
  telegramMessageId?: number;
  comments?: ForgeIdeaComment[];
  createdAt: string;
}

export interface ForgeIdeaComment {
  id: string;
  ideaKey: string;
  authorProjectKey: string;
  body: string;
  createdAt: string;
}

export interface CreateIdeaInput {
  text: string;
  projectKey?: string;
  source?: ForgeIdea["source"];
  telegramId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramChatId?: number;
  telegramChatType?: string;
  telegramChatTitle?: string;
  telegramMessageId?: number;
}

export interface UpdateIdeaInput {
  linkedEpicKey?: string;
  linkedTaskId?: string;
  linkedWikiSlug?: string;
  status?: ForgeIdeaStatus;
  triageNotes?: string;
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

export interface CreateWikiPageInput {
  slug?: string;
  title: string;
  content?: string;
  type?: WikiPageType;
}

export interface UpdateWikiPageInput {
  title?: string;
  content?: string;
  type?: WikiPageType;
}

export interface ForgeEpic {
  key: string;
  projectKey: string;
  title: string;
  valueStatement: string;
  status: EpicStatus;
  createdAt: string;
}

export interface ForgeSprint {
  key: string;
  projectKey: string;
  title: string;
  goal: string;
  status: "planned" | "active" | "done";
  taskIds: string[];
  createdAt: string;
}

export interface CreateSprintInput {
  projectKey?: string;
  title: string;
  goal?: string;
  status?: ForgeSprint["status"];
  taskIds?: string[];
}

export interface ForgeTask {
  id: string;
  issueKey?: string;
  projectKey?: string;
  epicKey?: string;
  title: string;
  description?: string;
  area: string;
  priority: TaskPriority;
  status: "active" | "done" | "archived";
  source: TaskSource;
  readiness?: number;
  estimate?: number;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTaskInput {
  projectKey?: string;
  title: string;
  description?: string;
  area?: string;
  epicKey?: string;
  priority?: TaskPriority;
  readiness?: number;
  estimate?: number;
  source?: TaskSource;
}

export interface CreateEpicInput {
  key?: string;
  projectKey?: string;
  title: string;
  valueStatement?: string;
  status?: EpicStatus;
}

export interface UpdateEpicInput {
  status?: EpicStatus;
  title?: string;
  valueStatement?: string;
}

export interface UpdateTaskInput {
  status?: ForgeTask["status"];
  title?: string;
  description?: string;
  area?: string;
  epicKey?: string;
  priority?: TaskPriority;
  readiness?: number;
  estimate?: number;
  source?: TaskSource;
}

export interface TaskProgress {
  completed: number;
  total: number;
}

export interface ForgeTrackerSnapshot {
  epics: ForgeEpic[];
  ideas?: ForgeIdea[];
  projects: ForgeProject[];
  sprints: ForgeSprint[];
  tasks: ForgeTask[];
  wikiPages: ForgeWikiPage[];
}
