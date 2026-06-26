import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import {
  classifyEdgeRequest,
  maskLoginIdentifier,
  sanitizePath,
  summarizeUserAgent,
} from "@/lib/server/security-audit-sanitize";
import type {
  EdgeEventClassification,
  SecurityAuditEventInput,
  SecurityAuditEventType,
} from "@/lib/server/security-audit-types";

export type SecurityAuditRecommendation = "Наблюдать" | "Проверить пользователя" | "Усилить лимиты" | "Проверить инцидент";

export interface SecurityAuditEvent {
  activityLabel: string;
  actorLabel: string;
  classification: string;
  createdAt: string;
  id: string;
  investigationHint?: string;
  ip: string;
  method: string;
  path: string;
  statusCode: number;
  userAgent: string;
}

export interface SecurityAuditDashboard {
  generatedAt: string;
  recentEvents: SecurityAuditEvent[];
  recommendation: SecurityAuditRecommendation;
  summary: {
    failedLogins: number;
    forbidden: number;
    notFound: number;
    rateLimited: number;
    successfulLogins: number;
    suspiciousScans: number;
  };
  topPaths: Array<{ count: number; path: string }>;
  topSources: Array<{ failedLogins: number; ip: string; scans: number; total: number }>;
}

export interface UserSecurityAuditActivity {
  activityLabel: string;
  actorLabel?: string;
  createdAt: string;
  id: string;
  method: string;
  path: string;
  statusCode: number;
}

interface SecurityAuditRow extends QueryResultRow {
  actor_user_id: string | null;
  actor_username: string | null;
  classification: EdgeEventClassification | "auth";
  created_at: Date;
  event_type: SecurityAuditEventType;
  id: string;
  ip: string;
  login_identifier: string | null;
  method: string;
  path: string;
  status_code: number;
  user_agent: string;
}

interface NormalizedSecurityAuditEvent {
  actor_user_id: string | null;
  actor_username: string | null;
  classification: EdgeEventClassification | "auth";
  created_at: string;
  event_type: SecurityAuditEventType;
  id: string;
  ip: string;
  login_identifier: string | null;
  method: string;
  path: string;
  status_code: number;
  user_agent: string;
}

const emptySummary = {
  failedLogins: 0,
  forbidden: 0,
  notFound: 0,
  rateLimited: 0,
  successfulLogins: 0,
  suspiciousScans: 0,
};

export function securityAuditSchemaName(): string {
  return process.env.NOF_PLATFORM_SECURITY_AUDIT_DB_SCHEMA ?? process.env.NOF_PLATFORM_DB_SCHEMA ?? "forge_tasks";
}

function safeSqlIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("Invalid SQL identifier for NOF Platform security audit");
  }
  return identifier;
}

function classificationFor(input: SecurityAuditEventInput): EdgeEventClassification | "auth" {
  if (input.eventType === "app_authenticated_request") {
    return "normal";
  }
  if (input.eventType.startsWith("login_")) {
    return "auth";
  }
  if (input.eventType.startsWith("registration_")) {
    return "auth";
  }
  return classifyEdgeRequest({ path: input.path, status: input.statusCode });
}

function normalizeEvent(input: SecurityAuditEventInput, now = new Date()): NormalizedSecurityAuditEvent {
  return {
    actor_user_id: input.actorUserId ? input.actorUserId.slice(0, 80) : null,
    actor_username: input.actorUsername ? input.actorUsername.slice(0, 120) : null,
    classification: classificationFor(input),
    created_at: now.toISOString(),
    event_type: input.eventType,
    id: crypto.randomUUID(),
    ip: input.ip?.slice(0, 80) || "unknown",
    login_identifier: input.loginIdentifier ? maskLoginIdentifier(input.loginIdentifier) ?? null : null,
    method: input.method?.slice(0, 12) || "GET",
    path: sanitizePath(input.path),
    status_code: input.statusCode ?? 0,
    user_agent: summarizeUserAgent(input.userAgent),
  };
}

function activityLabelFor(eventType: string, path: string): string {
  if (eventType === "admin_email_link_requested") {
    return "Администратор подготовил привязку email";
  }
  if (eventType === "admin_password_reset_requested") {
    return "Администратор отправил восстановление";
  }
  if (eventType === "admin_password_rotation_required") {
    return "Администратор потребовал смену пароля";
  }
  if (eventType === "admin_settings_updated") {
    return "Изменение настроек платформы";
  }
  if (eventType === "admin_user_access_updated") {
    return "Изменение доступа пользователя";
  }
  if (eventType === "admin_user_detail_view") {
    return "Просмотр карточки пользователя";
  }
  if (eventType === "admin_user_deleted") {
    return "Удаление пользователя";
  }
  if (eventType === "admin_user_merged") {
    return "Слияние учётных записей";
  }
  if (eventType === "admin_user_identity_link_updated") {
    return "Изменение email и Telegram";
  }
  if (eventType === "profile_service_unlinked") {
    return "Отключение связи сервиса";
  }
  if (eventType === "logout_success") {
    return "Выход из аккаунта";
  }
  if (eventType === "session_expired") {
    return "Сессия истекла";
  }
  if (eventType === "login_success") {
    return "Успешный вход";
  }
  if (eventType.startsWith("login_")) {
    return "Неудачный вход";
  }
  if (eventType === "registration_success") {
    return "Регистрация подтверждена";
  }
  if (eventType === "registration_rate_limited") {
    return "Лимит регистрации";
  }
  if (eventType.startsWith("registration_")) {
    return "Попытка регистрации";
  }
  if (eventType === "app_authenticated_request") {
    return path.startsWith("/api/") ? "Авторизованный API-запрос" : "Авторизованный просмотр страницы";
  }
  if (path.startsWith("/api/admin/security/edge-events")) {
    return "Передача edge-логов";
  }
  if (path.startsWith("/admin/security")) {
    return "Админка безопасности";
  }
  if (path.startsWith("/_next/static")) {
    return "Статика приложения";
  }
  if (path.startsWith("/api/mcp")) {
    return "MCP-запрос";
  }
  if (path === "/robots.txt" || path === "/sitemap.xml") {
    return "Проверка служебного файла";
  }
  if (path === "/" || path.startsWith("/overview")) {
    return "Обзор портала";
  }
  return "Запрос к порталу";
}

function actorLabelFor(row: SecurityAuditRow): { actorLabel: string; investigationHint?: string } {
  if (row.actor_username || row.actor_user_id) {
    return { actorLabel: `Пользователь: ${row.actor_username ?? row.actor_user_id}` };
  }
  if (row.path.startsWith("/api/admin/security/edge-events") && row.user_agent === "curl") {
    return { actorLabel: "VPS: сборщик edge-логов" };
  }
  if (row.login_identifier) {
    return { actorLabel: `Логин: ${row.login_identifier}` };
  }
  if (row.user_agent.toLowerCase().startsWith("claude-code") || row.path.startsWith("/api/mcp")) {
    return { actorLabel: "MCP agent client" };
  }
  if (row.user_agent === "bot") {
    return { actorLabel: "Поисковый робот" };
  }
  if (["Chrome", "Firefox", "Safari", "Edge"].some((browser) => row.user_agent.includes(browser))) {
    return {
      actorLabel: "Неизвестная браузерная сессия",
      investigationHint: "Нужна привязка edge-событий к пользователю или сессии приложения.",
    };
  }
  if (row.event_type.startsWith("login_")) {
    return { actorLabel: "Анонимная попытка входа" };
  }
  return { actorLabel: "Неизвестный источник" };
}

function recommendation(summary: SecurityAuditDashboard["summary"]): SecurityAuditRecommendation {
  if (summary.suspiciousScans >= 10 || summary.failedLogins >= 20) {
    return "Проверить инцидент";
  }
  if (summary.rateLimited > 0 || summary.failedLogins >= 5) {
    return "Усилить лимиты";
  }
  if (summary.failedLogins > 0) {
    return "Проверить пользователя";
  }
  return "Наблюдать";
}

function toDashboard(rows: SecurityAuditRow[]): SecurityAuditDashboard {
  const summary = { ...emptySummary };
  const sources = new Map<string, { failedLogins: number; ip: string; scans: number; total: number }>();
  const paths = new Map<string, { count: number; path: string }>();
  const recentEvents = rows.map((row) => {
    if (row.event_type === "login_failed" || row.event_type === "login_missing_credentials") {
      summary.failedLogins += 1;
    }
    if (row.event_type === "login_success") {
      summary.successfulLogins += 1;
    }
    if (row.event_type === "login_rate_limited" || row.event_type === "edge_rate_limited" || row.status_code === 429) {
      summary.rateLimited += 1;
    }
    if (row.classification === "forbidden") {
      summary.forbidden += 1;
    }
    if (row.classification === "not_found" || row.classification === "unknown_api") {
      summary.notFound += 1;
    }
    if (row.classification === "suspicious_scan" || row.event_type === "edge_suspicious_scan") {
      summary.suspiciousScans += 1;
    }

    const source = sources.get(row.ip) ?? { failedLogins: 0, ip: row.ip, scans: 0, total: 0 };
    source.total += 1;
    if (row.event_type === "login_failed" || row.event_type === "login_missing_credentials") {
      source.failedLogins += 1;
    }
    if (row.classification === "suspicious_scan" || row.event_type === "edge_suspicious_scan") {
      source.scans += 1;
    }
    sources.set(row.ip, source);

    const path = paths.get(row.path) ?? { count: 0, path: row.path };
    path.count += 1;
    paths.set(row.path, path);

    return {
      ...actorLabelFor(row),
      activityLabel: activityLabelFor(row.event_type, row.path),
      classification: row.classification,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      ip: row.ip,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
      userAgent: row.user_agent,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    recentEvents,
    recommendation: recommendation(summary),
    summary,
    topPaths: Array.from(paths.values())
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
    topSources: Array.from(sources.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 10),
  };
}

export class SecurityAuditDashboardRepository {
  private initialized = false;
  private readonly pool: Pool;
  private readonly schema: string;

  constructor(
    pool = new Pool({ connectionString: platformDatabaseUrl("platform security dashboard"), max: 2 }),
    schema = securityAuditSchemaName(),
  ) {
    this.pool = pool;
    this.schema = safeSqlIdentifier(schema);
  }

  async dashboard(): Promise<SecurityAuditDashboard> {
    await this.initialize();
    const result = await this.pool.query<SecurityAuditRow>(
      `SELECT id::text, event_type, classification, ip, login_identifier, method, path, status_code, user_agent, actor_user_id, actor_username, created_at
       FROM ${this.schema}.security_audit_event
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT 1000`,
    );

    return toDashboard(result.rows);
  }

  async recentEventsForActor(actorUserId: string, limit = 12): Promise<UserSecurityAuditActivity[]> {
    await this.initialize();
    const safeLimit = Math.max(1, Math.min(limit, 25));
    const result = await this.pool.query<SecurityAuditRow>(
      `SELECT id::text, event_type, classification, ip, login_identifier, method, path, status_code, user_agent, actor_user_id, actor_username, created_at
       FROM ${this.schema}.security_audit_event
       WHERE actor_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [actorUserId.slice(0, 80), safeLimit],
    );

    return result.rows.map((row) => ({
      activityLabel: activityLabelFor(row.event_type, row.path),
      createdAt: row.created_at.toISOString(),
      id: row.id,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
    }));
  }

  async recentAccountEvents(limit = 100): Promise<UserSecurityAuditActivity[]> {
    await this.initialize();
    const safeLimit = Math.max(1, Math.min(limit, 250));
    const result = await this.pool.query<SecurityAuditRow>(
      `SELECT id::text, event_type, classification, ip, login_identifier, method, path, status_code, user_agent, actor_user_id, actor_username, created_at
       FROM ${this.schema}.security_audit_event
       WHERE event_type IN ('admin_email_link_requested', 'admin_password_reset_requested', 'admin_password_rotation_required', 'admin_settings_updated', 'admin_user_access_updated', 'admin_user_deleted', 'admin_user_detail_view', 'admin_user_identity_link_updated', 'admin_user_merged', 'profile_service_unlinked', 'login_success', 'logout_success', 'session_expired', 'app_authenticated_request', 'password_change_failed', 'password_change_success', 'password_reset_completed', 'password_reset_failed', 'password_reset_rate_limited', 'password_reset_requested')
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit],
    );

    return result.rows.map((row) => ({
      activityLabel: activityLabelFor(row.event_type, row.path),
      actorLabel: actorLabelFor(row).actorLabel,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
    }));
  }

  async record(input: SecurityAuditEventInput): Promise<void> {
    const event = normalizeEvent(input);
    await this.initialize();
    await this.pool.query(
      `INSERT INTO ${this.schema}.security_audit_event
       (id, event_type, classification, ip, login_identifier, method, path, status_code, user_agent, actor_user_id, actor_username, created_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz)`,
      [
        event.id,
        event.event_type,
        event.classification,
        event.ip,
        event.login_identifier,
        event.method,
        event.path,
        event.status_code,
        event.user_agent,
        event.actor_user_id,
        event.actor_username,
        event.created_at,
      ],
    );
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.security_audit_event (
        id uuid PRIMARY KEY,
        event_type text NOT NULL,
        classification text NOT NULL,
        ip text NOT NULL,
        login_identifier text,
        method text NOT NULL,
        path text NOT NULL,
        status_code integer NOT NULL,
        user_agent text NOT NULL,
        actor_user_id text,
        actor_username text,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS security_audit_event_created_at_idx ON ${this.schema}.security_audit_event (created_at DESC)`);
    this.initialized = true;
  }
}

let repository: SecurityAuditDashboardRepository | undefined;

export function getSecurityAuditDashboardRepository(): SecurityAuditDashboardRepository {
  repository ??= new SecurityAuditDashboardRepository();
  return repository;
}

export async function recordSecurityAuditEvent(input: SecurityAuditEventInput): Promise<void> {
  try {
    await getSecurityAuditDashboardRepository().record(input);
  } catch (error) {
    console.warn("Security audit write failed", error instanceof Error ? error.message : "unknown error");
  }
}
