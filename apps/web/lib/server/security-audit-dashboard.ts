import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

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

interface SecurityAuditRow extends QueryResultRow {
  actor_user_id: string | null;
  actor_username: string | null;
  classification: string;
  created_at: Date;
  event_type: string;
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

function activityLabelFor(eventType: string, path: string): string {
  if (eventType === "login_success") {
    return "Успешный вход";
  }
  if (eventType.startsWith("login_")) {
    return "Неудачный вход";
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
  private readonly pool: Pool;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("platform security dashboard"), max: 2 })) {
    this.pool = pool;
  }

  async dashboard(): Promise<SecurityAuditDashboard> {
    const result = await this.pool.query<SecurityAuditRow>(
      `SELECT id::text, event_type, classification, ip, login_identifier, method, path, status_code, user_agent, actor_user_id, actor_username, created_at
       FROM forge_tasks.security_audit_event
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT 1000`,
    );

    return toDashboard(result.rows);
  }
}

let repository: SecurityAuditDashboardRepository | undefined;

export function getSecurityAuditDashboardRepository(): SecurityAuditDashboardRepository {
  repository ??= new SecurityAuditDashboardRepository();
  return repository;
}
