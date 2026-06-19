"use client";

import React, { useEffect, useState } from "react";

import { BrandHomeLink } from "@/components/BrandHomeLink";
import { PortalPageShell } from "@/components/PortalLayout";
import { PortalLanguageSelect } from "@/components/PortalLanguageSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePortalLanguage } from "@/lib/use-portal-language";
import {
  changeProfilePassword,
  createMcpToken,
  fetchMcpTokens,
  fetchPlatformProjects,
  fetchPortalSession,
  fetchProfileServiceLinks,
  revokeMcpToken,
  unlinkProfileService,
} from "@/lib/platform-api";
import type { ForgeMcpToken, ForgePortalSession, ForgePortalUser, ForgeProject, ForgeServiceLink } from "@/lib/types";

function avatarInitials(user?: ForgePortalUser): string {
  const username = user?.username?.trim();
  if (!username) {
    return "?";
  }
  const parts = username.split(/[\s._-]+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : username.slice(0, 2);
  return initials.toUpperCase();
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
    identity: "Portal identity",
    language: "Portal language",
    languageNote: "The interface language is saved in your profile and applied to portal shell labels.",
    linkedServices: "Connected services",
    linkedServicesNote: "These services are linked to your NOF Platform account through platform OAuth.",
    accountSecurity: "Account security",
    accountSecurityNote: "Change the password for your NOF Platform account. Linked services keep their links.",
    currentPassword: "Current password",
    newPassword: "New password",
    repeatNewPassword: "Repeat new password",
    changePassword: "Change password",
    passwordChanged: "Password changed. Use the new password on your next sign-in.",
    passwordMismatch: "New passwords do not match.",
    passwordPolicyHint: "At least 12 characters, lowercase, uppercase, digit and symbol. Do not include your username or email.",
    passwordFieldsRequired: "Fill in the current password and the new password.",
    passwordInvalidCurrent: "The current password is incorrect.",
    passwordPolicyError: "The new password does not match the password rules.",
    passwordUnavailable: "This account does not have password login enabled yet.",
    passwordUnchanged: "The new password must be different from the current password.",
    passwordUserNotFound: "The account was not found. Sign in again and retry.",
    passwordChangeFailed: "Password was not changed. Check the fields and retry.",
    passwordRulesTitle: "Password rules",
    passwordRuleLength: "At least 12 characters",
    passwordRuleLowercase: "Lowercase letter",
    passwordRuleUppercase: "Uppercase letter",
    passwordRuleDigit: "Digit",
    passwordRuleSymbol: "Special symbol",
    passwordRuleSafeChars: "No spaces or backtick character",
    passwordRuleDifferentFromCurrent: "Different from current password",
    passwordRuleRepeatedMatch: "Repeated password matches",
    loading: "Loading profile...",
    close: "Done / close",
    copyJson: "Copy JSON",
    copyToken: "Copy token",
    deleteToken: "Delete",
    hideToken: "Hide",
    issueMcpKey: "ISSUE MCP KEY",
    labelCreated: "CREATED",
    labelEmail: "email:",
    labelLastSeen: "LAST SEEN",
    labelLevel: "LEVEL",
    labelRank: "RANK",
    labelUserId: "USER ID",
    mcpDescription: "The full token is shown only once. Keep it in agent secrets, not in Git, documentation or chat.",
    mcpEmpty: "No active MCP keys yet.",
    mcpTitle: "Agent access to projects",
    mcpEyebrow: "MCP access keys",
    personalSettings: "Personal settings",
    profile: "Profile",
    profileClosed: "Sign in required",
    project: "Project",
    rotateToken: "Rotate",
    selectProject: "Select a project",
    showToken: "Show",
    signIn: "Sign in",
    signInNote: "Sign in to open your profile, settings and available platform modules.",
    signInTitle: "Sign in to the platform",
    theme: "Theme",
    themeNote: "The color scheme is stored in the browser separately for each user.",
    title: "Profile",
    tokenName: "Key name",
    logout: "Log out",
    openService: "Open",
    serviceConnected: "Connected",
    serviceNotConnected: "Not connected",
    serviceUnavailable: "Check unavailable",
    unlinkService: "Disconnect",
  },
  ru: {
    aboutFallback: "Описание профиля пока не заполнено.",
    identity: "Идентичность портала",
    language: "Язык портала",
    languageNote: "Язык интерфейса сохраняется в профиле и применяется к системным названиям портала.",
    linkedServices: "Подключённые сервисы",
    linkedServicesNote: "Эти сервисы связаны с твоей учётной записью NOF Platform через платформенный OAuth.",
    accountSecurity: "Безопасность аккаунта",
    accountSecurityNote: "Смени пароль учётной записи NOF Platform. Связи с сервисами останутся на месте.",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    repeatNewPassword: "Повтори новый пароль",
    changePassword: "Сменить пароль",
    passwordChanged: "Пароль изменён. При следующем входе используй новый пароль.",
    passwordMismatch: "Новые пароли не совпадают.",
    passwordPolicyHint: "Минимум 12 символов, строчная и заглавная буква, цифра и символ. Не используй логин или email.",
    passwordFieldsRequired: "Заполни текущий пароль и новый пароль.",
    passwordInvalidCurrent: "Текущий пароль указан неверно.",
    passwordPolicyError: "Новый пароль не соответствует правилам безопасности.",
    passwordUnavailable: "Для этой учётной записи вход по паролю пока не включён.",
    passwordUnchanged: "Новый пароль должен отличаться от текущего.",
    passwordUserNotFound: "Учётная запись не найдена. Войди заново и повтори попытку.",
    passwordChangeFailed: "Пароль не был изменён. Проверь поля и повтори попытку.",
    passwordRulesTitle: "Правила пароля",
    passwordRuleLength: "Минимум 12 символов",
    passwordRuleLowercase: "Есть строчная буква",
    passwordRuleUppercase: "Есть заглавная буква",
    passwordRuleDigit: "Есть цифра",
    passwordRuleSymbol: "Есть спецсимвол",
    passwordRuleSafeChars: "Нет пробелов и обратной кавычки",
    passwordRuleDifferentFromCurrent: "Отличается от текущего пароля",
    passwordRuleRepeatedMatch: "Повтор пароля совпадает",
    loading: "Загружаю профиль...",
    close: "Готово / закрыть",
    copyJson: "Копировать JSON",
    copyToken: "Копировать токен",
    deleteToken: "Удалить",
    hideToken: "Скрыть",
    issueMcpKey: "ВЫПУСТИТЬ MCP-КЛЮЧ",
    labelCreated: "Создан",
    labelEmail: "email:",
    labelLastSeen: "Последний вход",
    labelLevel: "Уровень",
    labelRank: "Ранг",
    labelUserId: "ID пользователя",
    mcpDescription: "Полный токен показывается только один раз. Храни его в секретах агента, не в Git, документации или чате.",
    mcpEmpty: "Активных MCP-ключей пока нет.",
    mcpTitle: "Доступ агентов к проектам",
    mcpEyebrow: "MCP-ключи доступа",
    personalSettings: "Персональные настройки",
    profile: "Профиль",
    profileClosed: "Требуется вход",
    project: "Проект",
    rotateToken: "Перевыпустить",
    selectProject: "Выбери проект",
    showToken: "Показать",
    signIn: "Войти",
    signInNote: "Войди, чтобы открыть профиль, настройки и доступные разделы платформы.",
    signInTitle: "Вход в платформу",
    theme: "Тема",
    themeNote: "Световая схема хранится в браузере отдельно для каждого пользователя.",
    title: "Профиль",
    tokenName: "Имя ключа",
    logout: "Выйти",
    openService: "Открыть",
    serviceConnected: "Подключён",
    serviceNotConnected: "Не подключён",
    serviceUnavailable: "Проверка недоступна",
    unlinkService: "Отключить связь",
  },
} as const;

function mcpConfig(fullToken: string, projectKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        [mcpServerName(projectKey)]: {
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

const mcpServerUrl = "https://task-tracker.forgath.ru/api/mcp";

function mcpServerName(projectKey: string): string {
  return `${projectKey}-mcp`;
}

function agentJsonExample(projectKey = "nof-tt"): string {
  return JSON.stringify(
    {
      mcpServers: {
        [mcpServerName(projectKey)]: {
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
        href={loginUrl ?? "/login"}
      >
        {copy.signIn}
      </a>
    </section>
  );
}

export function UserProfilePage({ initialSession }: { initialSession?: ForgePortalSession }) {
  const copy = profileCopy[usePortalLanguage()];
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(!initialSession);
  const [isTokenBusy, setIsTokenBusy] = useState(false);
  const [isPasswordBusy, setIsPasswordBusy] = useState(false);
  const [mcpTokens, setMcpTokens] = useState<ForgeMcpToken[]>([]);
  const [projects, setProjects] = useState<ForgeProject[]>([]);
  const [serviceLinks, setServiceLinks] = useState<ForgeServiceLink[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenProjectKey, setNewTokenProjectKey] = useState("");
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState("");
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [repeatedPasswordDraft, setRepeatedPasswordDraft] = useState("");
  const [savedTokenNotice, setSavedTokenNotice] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [passwordNotice, setPasswordNotice] = useState<string | undefined>();
  const [createdToken, setCreatedToken] = useState<{ fullToken: string; token: ForgeMcpToken } | undefined>();
  const [isCreatedTokenVisible, setIsCreatedTokenVisible] = useState(false);
  const [session, setSession] = useState<ForgePortalSession | undefined>(initialSession);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setError(undefined);
      try {
        const nextSession = initialSession ?? (await fetchPortalSession());
        if (isMounted) {
          setSession(nextSession);
          if (nextSession.user) {
            const [tokens, nextProjects, links] = await Promise.all([fetchMcpTokens(), fetchPlatformProjects(), fetchProfileServiceLinks()]);
            setMcpTokens(tokens);
            setProjects(nextProjects);
            setServiceLinks(links);
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
  }, [initialSession]);

  const user = session?.user;
  const telegramLabel = user?.telegram?.username ? `@${user.telegram.username}` : user?.telegram?.id ? `id:${user.telegram.id}` : "-";
  const accessibleMcpProjects = projects.filter((project) => project.access.allowed);
  const hasMcpAccess = accessibleMcpProjects.length > 0 || mcpTokens.length > 0;

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
      setError(createError instanceof Error ? createError.message : "MCP-ключ не был создан");
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
      setError(rotateError instanceof Error ? rotateError.message : "MCP-ключ не был перевыпущен");
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
      setError(deleteError instanceof Error ? deleteError.message : "MCP-ключ не был удалён");
    } finally {
      setIsTokenBusy(false);
    }
  }

  async function handleUnlinkService(serviceKey: ForgeServiceLink["serviceKey"]) {
    setError(undefined);
    try {
      const nextLink = await unlinkProfileService(serviceKey);
      setServiceLinks((current) => current.map((link) => (link.serviceKey === serviceKey ? nextLink : link)));
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : "Связь сервиса не была отключена");
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(undefined);
    setPasswordError(undefined);
    setPasswordNotice(undefined);

    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const repeatedPassword = String(formData.get("repeatedPassword") ?? "");
    if (newPassword !== repeatedPassword) {
      setPasswordError(copy.passwordMismatch);
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError(copy.passwordUnchanged);
      return;
    }

    setIsPasswordBusy(true);
    try {
      await changeProfilePassword({ currentPassword, newPassword });
      form.reset();
      setCurrentPasswordDraft("");
      setNewPasswordDraft("");
      setRepeatedPasswordDraft("");
      setPasswordNotice(copy.passwordChanged);
    } catch (changeError) {
      const reason = changeError instanceof Error ? changeError.message : "";
      const messageByReason: Record<string, string> = {
        invalid_current_password: copy.passwordInvalidCurrent,
        password_fields_required: copy.passwordFieldsRequired,
        password_policy: copy.passwordPolicyError,
        password_unavailable: copy.passwordUnavailable,
        password_unchanged: copy.passwordUnchanged,
        user_not_found: copy.passwordUserNotFound,
      };
      setPasswordError(messageByReason[reason] ?? copy.passwordChangeFailed);
    } finally {
      setIsPasswordBusy(false);
    }
  }

  function serviceStatusLabel(status: ForgeServiceLink["status"]): string {
    if (status === "connected") return copy.serviceConnected;
    if (status === "not_connected") return copy.serviceNotConnected;
    return copy.serviceUnavailable;
  }

  const passwordRules = [
    { isMet: newPasswordDraft.length >= 12, label: copy.passwordRuleLength },
    { isMet: /[a-z]/.test(newPasswordDraft), label: copy.passwordRuleLowercase },
    { isMet: /[A-Z]/.test(newPasswordDraft), label: copy.passwordRuleUppercase },
    { isMet: /\d/.test(newPasswordDraft), label: copy.passwordRuleDigit },
    { isMet: /[^A-Za-z0-9]/.test(newPasswordDraft), label: copy.passwordRuleSymbol },
    { isMet: !/[\s`]/.test(newPasswordDraft), label: copy.passwordRuleSafeChars },
    {
      isMet: currentPasswordDraft.length === 0 || newPasswordDraft.length === 0 || currentPasswordDraft !== newPasswordDraft,
      label: copy.passwordRuleDifferentFromCurrent,
    },
    {
      isMet: repeatedPasswordDraft.length > 0 && newPasswordDraft === repeatedPasswordDraft,
      label: copy.passwordRuleRepeatedMatch,
    },
  ];

  return (
    <PortalPageShell maxWidthClassName="max-w-[1180px]">
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
                <div
                  aria-label={`Avatar for ${user.username}`}
                  className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full border border-forge-accent bg-forge-surface"
                  title={user.username}
                >
                  <span className="heading-tech text-2xl font-bold text-forge-accent">{avatarInitials(user)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold tracking-wide text-forge-ink">{user.username}</h2>
                    <span className="tech-label rounded-sm border border-forge-line bg-forge-surface px-2 py-1 text-[9px] text-forge-accent">
                      {user.role?.displayName ?? user.role?.name ?? "USER"}
                    </span>
                  </div>
                  <p className="tech-label mt-1 truncate text-[10px] text-forge-muted">{user.username}</p>
                  <p className="mt-1 text-xs leading-5 text-forge-muted">{user.aboutMe || copy.aboutFallback}</p>

                  <div className="mt-3 space-y-2">
                    <DataRow label={copy.labelEmail} value={user.email ?? "-"} />
                    <DataRow label="telegram:" value={telegramLabel} />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <StatPill label="XP" value={user.experience} />
              <StatPill label={copy.labelLevel} value={user.level?.name ?? "-"} />
              <StatPill label={copy.labelRank} value={user.rank?.name ?? "-"} />
            </section>

            <section className="panel p-5">
              <p className="tech-label text-xs text-forge-muted">{copy.identity}</p>
              <div className="mt-4 space-y-2">
                <DataRow label={copy.labelUserId} value={user.id} />
                <DataRow label={copy.labelCreated} value={formatDate(user.createdAt)} />
                <DataRow label={copy.labelLastSeen} value={formatDate(user.lastSeen)} />
              </div>
            </section>

            <section className="panel p-5">
              <p className="tech-label text-xs text-forge-accent">{copy.linkedServices}</p>
              <h2 className="heading-tech mt-2 text-lg font-bold text-forge-ink">{copy.linkedServices}</h2>
              <p className="mt-2 text-sm leading-6 text-forge-muted">{copy.linkedServicesNote}</p>
              <div className="mt-4 grid gap-3">
                {serviceLinks.map((link) => (
                  <article key={link.serviceKey} className="rounded-sm border border-forge-line bg-forge-surface p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-forge-ink">{link.serviceName}</h3>
                          <span className="tech-label rounded-sm border border-forge-line bg-forge-panel px-2 py-1 text-[9px] text-forge-accent">
                            {serviceStatusLabel(link.status)}
                          </span>
                        </div>
                        {link.status === "connected" ? (
                          <div className="mt-2 text-xs leading-5 text-forge-muted">
                            <p>{link.accountEmail ?? link.accountLabel ?? "-"}</p>
                            {link.linkedAt ? <p>Связано: {formatDate(link.linkedAt)}</p> : null}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-forge-muted">
                            {link.status === "not_connected"
                              ? "Связь с этим сервисом пока не создана."
                              : "Не удалось проверить связь с сервисом."}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <a
                          className="tech-label min-h-10 min-w-[132px] rounded-sm border border-forge-accent bg-forge-accent px-3 py-2 text-center text-[10px] font-bold text-black transition"
                          href={link.openHref}
                        >
                          {copy.openService} {link.serviceName}
                        </a>
                        {link.canUnlink ? (
                          <button
                            aria-label={`Отключить ${link.serviceName}`}
                            className="tech-label min-h-10 min-w-[132px] rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-center text-[10px] text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
                            type="button"
                            onClick={() => void handleUnlinkService(link.serviceKey)}
                          >
                            {copy.unlinkService} {link.serviceName}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
                {serviceLinks.length === 0 ? <p className="text-sm text-forge-muted">{copy.serviceNotConnected}</p> : null}
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
              <form className="mt-4 grid gap-3 rounded-sm border border-forge-line bg-forge-surface p-3" onSubmit={(event) => void handlePasswordSubmit(event)}>
                <div>
                  <p className="tech-label text-[10px] text-forge-muted">{copy.accountSecurity}</p>
                  <p className="mt-1 text-sm leading-5 text-forge-muted">{copy.accountSecurityNote}</p>
                  <p className="mt-1 text-xs leading-5 text-forge-muted">{copy.passwordPolicyHint}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="tech-label text-[10px] text-forge-muted">{copy.currentPassword}</span>
                    <input
                      autoComplete="current-password"
                      className="rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
                      name="currentPassword"
                      required
                      type="password"
                      value={currentPasswordDraft}
                      onChange={(event) => setCurrentPasswordDraft(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="tech-label text-[10px] text-forge-muted">{copy.newPassword}</span>
                    <input
                      autoComplete="new-password"
                      className="rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
                      name="newPassword"
                      required
                      type="password"
                      value={newPasswordDraft}
                      onChange={(event) => setNewPasswordDraft(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="tech-label text-[10px] text-forge-muted">{copy.repeatNewPassword}</span>
                    <input
                      autoComplete="new-password"
                      className="rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
                      name="repeatedPassword"
                      required
                      type="password"
                      value={repeatedPasswordDraft}
                      onChange={(event) => setRepeatedPasswordDraft(event.target.value)}
                    />
                  </label>
                </div>
                <div className="rounded-sm border border-forge-line bg-forge-panel p-3" aria-live="polite">
                  <p className="tech-label text-[10px] text-forge-muted">{copy.passwordRulesTitle}</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {passwordRules.map((rule) => (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-2 text-xs leading-5 ${rule.isMet ? "text-forge-accent" : "text-forge-muted"}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border text-[10px] ${
                            rule.isMet ? "border-forge-accent bg-forge-accent text-black" : "border-forge-line bg-forge-surface text-forge-muted"
                          }`}
                        >
                          {rule.isMet ? "+" : "-"}
                        </span>
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="tech-label min-h-10 min-w-[160px] rounded-sm border border-forge-accent bg-forge-accent px-4 py-2 text-center text-[10px] font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPasswordBusy}
                    type="submit"
                  >
                    {copy.changePassword}
                  </button>
                  {passwordError ? (
                    <p className="text-xs font-semibold leading-5 text-forge-amber" role="alert">
                      {passwordError}
                    </p>
                  ) : null}
                  {passwordNotice ? <p className="text-xs leading-5 text-forge-muted">{passwordNotice}</p> : null}
                </div>
              </form>
            </section>

            {hasMcpAccess ? (
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
                    {accessibleMcpProjects.map((project) => (
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
                  disabled={isTokenBusy || !newTokenName.trim() || !newTokenProjectKey.trim() || accessibleMcpProjects.length === 0}
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
                {mcpTokens.length === 0 ? <p className="text-sm text-forge-muted">{copy.mcpEmpty}</p> : null}
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
                  Токен показывается только один раз после выпуска. Храни его в хранилище секретов агента и передавай как
                  <code> x-api-key</code>. Не сохраняй токен в Git, Wiki или чате.
                </p>
                <div className="mt-4 grid gap-3">
                  <article className="rounded-sm border border-forge-line bg-forge-surface p-3">
                    <p className="tech-label text-[10px] text-forge-accent">Claude Code / Codex / OpenCode</p>
                    <p className="mt-2 text-sm leading-6 text-forge-muted">
                      Используй HTTP MCP-сервер. Вставь JSON в конфиг клиента и замени
                      <code> {"${MCP_TOKEN}"}</code> значением из переменной окружения или хранилища секретов.
                    </p>
                    <pre className="mt-3 overflow-x-auto rounded-sm border border-forge-line bg-forge-panel p-3 text-xs text-forge-ink">
                      {agentJsonExample(newTokenProjectKey || "nof-tt")}
                    </pre>
                  </article>
                  <article className="rounded-sm border border-forge-line bg-forge-surface p-3">
                    <p className="tech-label text-[10px] text-forge-accent">AutoClaw / Nimbalyst</p>
                    <p className="mt-2 text-sm leading-6 text-forge-muted">
                      Если клиент поддерживает HTTP MCP, укажи URL <code>{mcpServerUrl}</code> и заголовок
                      <code> x-api-key</code>. Одна точка доступа Task Tracker принимает проектные ключи разных проектов.
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
            ) : null}
          </>
        ) : null}
    </PortalPageShell>
  );
}
