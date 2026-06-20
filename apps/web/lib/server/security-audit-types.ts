export type SecurityAuditEventType =
  | "edge_forbidden"
  | "edge_not_found"
  | "edge_rate_limited"
  | "edge_request"
  | "edge_suspicious_scan"
  | "app_authenticated_request"
  | "admin_password_reset_requested"
  | "admin_user_detail_view"
  | "profile_service_unlinked"
  | "registration_attempt"
  | "registration_invalid_email"
  | "registration_rate_limited"
  | "registration_success"
  | "login_failed"
  | "login_missing_credentials"
  | "login_rate_limited"
  | "login_success"
  | "login_upstream_error"
  | "logout_success"
  | "session_expired";

export type EdgeEventClassification =
  | "forbidden"
  | "not_found"
  | "normal"
  | "protected_redirect"
  | "rate_limited"
  | "suspicious_scan"
  | "unknown_api";

export interface SecurityAuditEventInput {
  actorUserId?: string;
  actorUsername?: string;
  eventType: SecurityAuditEventType;
  ip?: string;
  loginIdentifier?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  userAgent?: string;
}
