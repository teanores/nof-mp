"use client";

import { useEffect, useState } from "react";

import { BrandHomeLink } from "@/components/BrandHomeLink";
import { PortalLanguageSelect } from "@/components/PortalLanguageSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePortalLanguage } from "@/lib/use-portal-language";
import { createMcpToken, fetchMcpTokens, fetchPlatformProjects, fetchPortalSession, revokeMcpToken } from "@/lib/platform-api";
import type { ForgeMcpToken, ForgePortalSession, ForgePortalUser, ForgeProject } from "@/lib/types";

function avatarChar(user?: ForgePortalUser): string {
  return (user?.username ?? "?").slice(0, 1).toUpperCase();
}

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="tech-label w-20 shrink-0 text-[10px] text-forge-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-forge-ink">{value}</span>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-forge-line bg-forge-surface px-3 py-2">
      <p className="tech-label text-[10px] text-forge-ghost">{label}</p>
      <p className="mt-1 text-xl font-bold text-forge-ink">{value}</p>
    </div>
  );
}

const profileCopy = {
  en: {
    aboutFallback: "Profile description is not filled yet.",
    identity: "Dragon Forge identity",
    language: "Portal language",
    languageNote: "The interface language is saved in your profile and applied to portal shell labels.",
    loading: "Loading profile...",
    close: "Done / close",
    copyJson: "Copy JSON",
    copyToken: "Copy token",
    deleteToken: "Delete",
    hideToken: "Hide",
    issueMcpKey: "ISSUE MCP KEY",
    mcpDescription: "The full token is shown only once. Keep it in agent secrets, not in Git, documentation or chat.",
    mcpTitle: "Agent access to projects",
    mcpEyebrow: "MCP access keys",
    personalSettings: "Personal settings",
    profile: "Profile",
    profileClosed: "Profile locked",
    project: "Project",
    rotateToken: "Rotate",
    selectProject: "Select a project",
    showToken: "Show",
    signIn: "Sign in through Dragon Forge",
    signInNote: "The new portal uses the same users as the old Python portal. No separate account is created here.",
    signInTitle: "Sign in through Dragon Forge",
    theme: "Theme",
    themeNote: "The color scheme is stored in the browser separately for each user.",
    title: "Profile",
    tokenName: "Key name",
    logout: "Log out",
  },
  ru: {
    aboutFallback: "Описание профиля пока не заполнено.",
    identity: "Dragon Forge identity",
    language: "Язык портала",
    languageNote: "Язык интерфейса сохраняется в профиле и применяется к системным названиям портала.",
    loading: "Загружаю профиль...",
    close: "Готово / закрыть",
    copyJson: "Копировать JSON",
    copyToken: "Копировать токен",
    deleteToken: "Удалить",
    hideToken: "Скрыть",
    issueMcpKey: "ВЫПУСТИТЬ MCP-КЛЮЧ",
    mcpDescription: "Полный токен показывается только один раз. Храни его в секретах агента, не в Git, документации или чате.",
    mcpTitle: "Доступ агентов к проектам",
    mcpEyebrow: "MCP-ключи доступа",
    personalSettings: "Персональные настройки",
    profile: "Профиль",
    profileClosed: "Профиль закрыт",
    project: "Проект",
    rotateToken: "Перевыпустить",
    selectProject: "Выбери проект",
    showToken: "Показать",
    signIn: "Войти через Dragon Forge",
    signInNote: "Новый портал использует тех же пользователей, что и старый Python-портал. Отдельный аккаунт здесь не создаётся.",
    signInTitle: "Нужно войти через Dragon Forge",
    theme: "Тема",
    themeNote: "Световая схема хранится в браузере отдельно для каждого пользователя.",
    title: "Профиль",
    tokenName: "Имя ключа",
    logout: "Выйти",
  },
} as const;

function mcpConfig(fullToken: string, projectKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        [`nof-platform-${projectKey}`]: {
          type: "http",
          url: mcpServerUrl,
          headers: { "x-api-key": fullToken },
        },
      },
    },
    null,
    2,
  );
}

const mcpServerUrl = "http://192.168.1.51:30510/api/mcp";
const mcpSseUrl = "http://192.168.1.51:30510/api/mcp/sse";

function agentJsonExample(projectKey = "noftt"): string {
  return JSON.stringify(
    {
      mcpServers: {
        [`nof-platform-${projectKey}`]: {
          type: "http",
          url: mcpServerUrl,
          headers: { "x-api-key": "${MCP_TOKEN}" },
        },
      },
    },
    null,
    2,
  );
}

function LoginRequired({ loginUrl }: { loginUrl?: string }) {
  const copy = profileCopy[usePortalLanguage()];

  return (
    <section className="panel p-5">
      <p className="tech-label text-xs text-forge-accent">{copy.profileClosed}</p>
      <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">{copy.signInTitle}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-forge-muted">
        {copy.signInNote}
      </p>
      <a
        className="tech-label mt-5 inline-flex rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs font-bold text-black transition"
        href={loginUrl ?? "http://192.168.1.51:30500/login"}
      >
        {copy.signIn}
      </a>
    </section>
  );
}

export function UserProfilePage() {
  const copy = profileCopy[usePortalLanguage()];
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isTokenBusy, setIsTokenBusy] = useState(false);
  const [mcpTokens, setMcpTokens] = useState<ForgeMcpToken[]>([]);
  const [projects, setProjects] = useState<ForgeProject[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenProjectKey, setNewTokenProjectKey] = useState("");
  const [savedTokenNotice, setSavedTokenNotice] = useState<string | undefined>();
  const [createdToken, setCreatedToken] = useState<{ fullToken: string; token: ForgeMcpToken } | undefined>();
  const [isCreatedTokenVisible, setIsCreatedTokenVisible] = useState(false);
  const [session, setSession] = useState<ForgePortalSession | undefined>();

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setError(undefined);
      try {
        const nextSession = await fetchPortalSession();
        if (isMounted) {
          setSession(nextSession);
          if (nextSession.user) {
            const [tokens, nextProjects] = await Promise.all([fetchMcpTokens(), fetchPlatformProjects()]);
            setMcpTokens(tokens);
            setProjects(nextProjects);
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить профиль");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const user = session?.user;
  const telegramLabel = user?.telegram?.username ? `@${user.telegram.username}` : user?.telegram?.id ? `id:${user.telegram.id}` : "-";

  function defaultTokenName(projectKey: string): string {
    return `${projectKey.toUpperCase().replaceAll("-", "_")}_MCP_TOKEN`;
  }

  function handleProjectChange(projectKey: string) {
    setNewTokenProjectKey(projectKey);
    setNewTokenName((current) => current.trim() || (projectKey ? defaultTokenName(projectKey) : ""));
  }

  async function handleCreateMcpToken() {
    setError(undefined);
    setIsTokenBusy(true);
    try {
      const nextToken = await createMcpToken({ name: newTokenName, projectKey: newTokenProjectKey });
      setCreatedToken(nextToken);
      setIsCreatedTokenVisible(false);
      setSavedTokenNotice(undefined);
      setMcpTokens((current) => [nextToken.token, ...current]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "MCP token was not created");
    } finally {
      setIsTokenBusy(false);
    }
  }

  async function copyText(payload: string, successMessage: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = payload;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error("execCommand copy failed");
        }
      }
      setSavedTokenNotice(successMessage);
    } catch {
      setSavedTokenNotice("Буфер обмена недоступен. Открой токен и скопируй его вручную.");
    }
  }

  async function handleCopyCreatedToken() {
    if (!createdToken) {
      return;
    }

    await copyText(createdToken.fullToken, "Токен скопирован в буфер обмена.");
  }

  async function handleCopyCreatedConfig() {
    if (!createdToken) {
      return;
    }

    await copyText(mcpConfig(createdToken.fullToken, createdToken.token.projectKey), "JSON-конфиг агента скопирован в буфер обмена.");
  }

  function handleCloseCreatedToken() {
    setCreatedToken(undefined);
    setIsCreatedTokenVisible(false);
    setSavedTokenNotice("MCP-ключ сохранён. Одноразовая панель с секретом закрыта.");
  }

  async function handleRotateMcpToken(token: ForgeMcpToken) {
    setError(undefined);
    setIsTokenBusy(true);
    try {
      const nextToken = await createMcpToken({ name: token.name, projectKey: token.projectKey, scopes: token.scopes });
      await revokeMcpToken(token.id);
      setCreatedToken(nextToken);
      setIsCreatedTokenVisible(false);
      setSavedTokenNotice(undefined);
      setMcpTokens((current) => [nextToken.token, ...current.filter((item) => item.id !== token.id)]);
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : "MCP token was not rotated");
    } finally {
      setIsTokenBusy(false);
    }
  }

  async function handleDeleteMcpToken(tokenId: string) {
    setError(undefined);
    setIsTokenBusy(true);
    try {
      await revokeMcpToken(tokenId);
      setMcpTokens((current) => current.filter((token) => token.id !== tokenId));
      if (createdToken?.token.id === tokenId) {
        setCreatedToken(undefined);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "MCP token was not deleted");
    } finally {
      setIsTokenBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
        <header className="panel flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0">
              <BrandHomeLink />
              <h1 className="heading-tech mt-1 text-xl font-bold text-forge-ink">{copy.title}</h1>
            </div>
          </div>
          {user ? (
            <form action="/api/logout" method="post">
              <button
                className="tech-label rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
                type="submit"
              >
                {copy.logout}
              </button>
            </form>
          ) : null}
        </header>

        {error ? <p className="panel px-4 py-3 font-semibold text-forge-amber">{error}</p> : null}
        {isLoading ? <p className="panel px-4 py-3 text-sm text-forge-muted">{copy.loading}</p> : null}
        {!isLoading && !user ? <LoginRequired loginUrl={session?.loginUrl} /> : null}

        {user ? (
          <>
            <section className="panel relative p-5">
              <p className="tech-label text-xs text-forge-muted">{copy.profile}</p>
              <div className="mt-4 flex items-start gap-4">
                <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full border border-forge-accent bg-forge-surface">
                  <span className="heading-tech text-3xl font-bold text-forge-accent">{avatarChar(user)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold tracking-wide text-forge-ink">{user.username}</h2>
                    <span className="tech-label rounded-sm border border-forge-line bg-forge-surface px-2 py-1 text-[9px] text-forge-accent">
                      {user.role?.displayName ?? user.role?.name ?? "USER"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-forge-muted">{user.aboutMe || copy.aboutFallback}</p>

                  <div className="mt-3 space-y-2">
                    <DataRow label="EMAIL" value={user.email ?? "-"} />
                    <DataRow label="TG" value={telegramLabel} />
                    <DataRow label="SOURCE" value={user.registrationSource ?? "-"} />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <StatPill label="XP" value={user.experience} />
              <StatPill label="LEVEL" value={user.level?.name ?? "-"} />
              <StatPill label="RANK" value={user.rank?.name ?? "-"} />
            </section>

            <section className="panel p-5">
              <p className="tech-label text-xs text-forge-muted">{copy.identity}</p>
              <div className="mt-4 space-y-2">
                <DataRow label="USER ID" value={user.id} />
                <DataRow label="CREATED" value={formatDate(user.createdAt)} />
                <DataRow label="LAST SEEN" value={formatDate(user.lastSeen)} />
              </div>
            </section>

            <section className="panel p-5">
              <p className="tech-label text-xs text-forge-accent">{copy.personalSettings}</p>
              <h2 className="heading-tech mt-2 text-lg font-bold text-forge-ink">{copy.personalSettings}</h2>
              <div className="mt-4 flex flex-col gap-3 rounded-sm border border-forge-line bg-forge-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="tech-label text-[10px] text-forge-muted">{copy.language}</p>
                  <p className="mt-1 text-sm leading-5 text-forge-muted">{copy.languageNote}</p>
                </div>
                <PortalLanguageSelect initialLanguage={session.preferences?.language} persistToProfile />
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-sm border border-forge-line bg-forge-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="tech-label text-[10px] text-forge-muted">{copy.theme}</p>
                  <p className="mt-1 text-sm leading-5 text-forge-muted">{copy.themeNote}</p>
                </div>
                <ThemeToggle />
              </div>
            </section>

            <section className="panel p-5">
              <p className="tech-label text-xs text-forge-accent">{copy.mcpEyebrow}</p>
              <h2 className="heading-tech mt-2 text-lg font-bold text-forge-ink">{copy.mcpTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-forge-muted">{copy.mcpDescription}</p>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <span className="tech-label text-[10px] text-forge-muted">{copy.project}</span>
                  <select
                    className="rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
                    value={newTokenProjectKey}
                    onChange={(event) => handleProjectChange(event.target.value)}
                  >
                    <option value="">{copy.selectProject}</option>
                    {projects.map((project) => (
                      <option key={project.key} value={project.key}>
                        {project.key} - {project.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs leading-5 text-forge-muted">Ключ проекта выбирается из существующих проектов портала.</span>
                </label>
                <label className="grid gap-2">
                  <span className="tech-label text-[10px] text-forge-muted">{copy.tokenName}</span>
                  <input
                    className="rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
                    placeholder={newTokenProjectKey ? defaultTokenName(newTokenProjectKey) : "Сначала выбери проект"}
                    value={newTokenName}
                    onChange={(event) => setNewTokenName(event.target.value)}
                  />
                </label>
                <button
                  className="tech-label min-h-11 rounded-sm border border-forge-accent bg-forge-accent px-4 py-3 text-center text-xs font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isTokenBusy || !newTokenName.trim() || !newTokenProjectKey.trim() || projects.length === 0}
                  type="button"
                  onClick={() => void handleCreateMcpToken()}
                >
                  {copy.issueMcpKey}
                </button>
              </div>

              {createdToken ? (
                <article className="mt-4 rounded-sm border border-forge-accent bg-forge-surface p-4">
                  <p className="tech-label text-xs text-forge-accent">ОДНОРАЗОВЫЙ СЕКРЕТ</p>
                  <code className="mt-3 block break-all rounded-sm border border-forge-line bg-forge-panel p-3 text-xs text-forge-ink">
                    {isCreatedTokenVisible ? createdToken.fullToken : `${createdToken.token.tokenPrefix}...${"*".repeat(16)}`}
                  </code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="tech-label min-h-10 min-w-[132px] rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-center text-[10px] text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
                      type="button"
                      onClick={() => setIsCreatedTokenVisible((current) => !current)}
                    >
                      {isCreatedTokenVisible ? copy.hideToken : copy.showToken}
                    </button>
                    <button
                      className="tech-label min-h-10 min-w-[132px] rounded-sm border border-forge-accent bg-forge-accent px-3 py-2 text-center text-[10px] font-bold text-black transition"
                      type="button"
                      onClick={() => void handleCopyCreatedToken()}
                    >
                      {copy.copyToken}
                    </button>
                    <button
                      className="tech-label min-h-10 min-w-[132px] rounded-sm border border-forge-accent bg-forge-accent px-3 py-2 text-center text-[10px] font-bold text-black transition"
                      type="button"
                      onClick={() => void handleCopyCreatedConfig()}
                    >
                      {copy.copyJson}
                    </button>
                    <button
                      className="tech-label min-h-10 min-w-[132px] rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-center text-[10px] text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
                      type="button"
                      onClick={handleCloseCreatedToken}
                    >
                      {copy.close}
                    </button>
                  </div>
                  <p className="mt-3 rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-xs leading-5 text-forge-muted">
                    Ключ уже сохранён в портале. Скопируй секрет сейчас: после закрытия этой панели полный токен больше
                    не будет показан.
                  </p>
                  {savedTokenNotice ? <p className="mt-2 text-xs leading-5 text-forge-muted">{savedTokenNotice}</p> : null}
                </article>
              ) : null}
              {!createdToken && savedTokenNotice ? <p className="mt-3 text-xs leading-5 text-forge-muted">{savedTokenNotice}</p> : null}

              <div className="mt-4 grid gap-2">
                {mcpTokens.length === 0 ? <p className="text-sm text-forge-muted">Активных MCP-ключей пока нет.</p> : null}
                {mcpTokens.map((token) => (
                  <article key={token.id} className="rounded-sm border border-forge-line bg-forge-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-forge-ink">{token.name}</p>
                        <p className="tech-label mt-1 text-[10px] text-forge-muted">
                          {token.projectKey} / {token.tokenPrefix}...
                        </p>
                        <p className="mt-1 text-xs text-forge-muted">Создан: {formatDate(token.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <button
                          className="tech-label min-h-10 min-w-[120px] rounded-sm border border-forge-accent bg-forge-accent px-3 py-2 text-center text-[10px] font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isTokenBusy}
                          type="button"
                          onClick={() => void handleRotateMcpToken(token)}
                        >
                          {copy.rotateToken}
                        </button>
                        <button
                          className="tech-label min-h-10 min-w-[120px] rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-center text-[10px] text-forge-muted transition hover:border-forge-accent hover:text-forge-accent disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isTokenBusy}
                          type="button"
                          onClick={() => void handleDeleteMcpToken(token.id)}
                        >
                          {copy.deleteToken}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <section className="mt-5 border-t border-forge-line pt-4">
                <p className="tech-label text-xs text-forge-accent">НАСТРОЙКА MCP-КЛИЕНТОВ</p>
                <h3 className="heading-tech mt-2 text-base font-bold text-forge-ink">Конфигурация агентов</h3>
                <p className="mt-2 text-sm leading-6 text-forge-muted">
                  Токен показывается только один раз после выпуска. Храни его в secret storage агента и передавай как
                  <code> x-api-key</code>. Не сохраняй токен в Git, Wiki или чате.
                </p>
                <div className="mt-4 grid gap-3">
                  <article className="rounded-sm border border-forge-line bg-forge-surface p-3">
                    <p className="tech-label text-[10px] text-forge-accent">Claude Code / Codex / OpenCode</p>
                    <p className="mt-2 text-sm leading-6 text-forge-muted">
                      Используй HTTP MCP server. Вставь JSON в конфиг клиента и замени
                      <code> {"${MCP_TOKEN}"}</code> значением из переменной окружения или secret storage.
                    </p>
                    <pre className="mt-3 overflow-x-auto rounded-sm border border-forge-line bg-forge-panel p-3 text-xs text-forge-ink">
                      {agentJsonExample(newTokenProjectKey || "noftt")}
                    </pre>
                  </article>
                  <article className="rounded-sm border border-forge-line bg-forge-surface p-3">
                    <p className="tech-label text-[10px] text-forge-accent">AutoClaw / Nimbalyst</p>
                    <p className="mt-2 text-sm leading-6 text-forge-muted">
                      Если клиент поддерживает HTTP MCP, укажи URL <code>{mcpServerUrl}</code> и header
                      <code> x-api-key</code>. Если клиенту нужен SSE transport, используй <code>{mcpSseUrl}</code>.
                    </p>
                  </article>
                  <article className="rounded-sm border border-forge-line bg-forge-surface p-3">
                    <p className="tech-label text-[10px] text-forge-accent">ПРОВЕРКА ДОСТУПА</p>
                    <p className="mt-2 text-sm leading-6 text-forge-muted">
                      После подключения агент должен читать идеи, комментировать открытые идеи и работать только в
                      рамках проекта, для которого выпущен ключ.
                    </p>
                  </article>
                </div>
              </section>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
