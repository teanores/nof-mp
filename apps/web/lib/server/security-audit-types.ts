export type SecurityAuditEventType =
  | "edge_forbidden"
  | "edge_not_found"
  | "edge_rate_limited"
  | "edge_request"
  | "edge_suspicious_scan"
  | "app_authenticated_request"
  | "admin_email_link_requested"
  | "admin_password_reset_requested"
  | "admin_settings_updated"
  | "admin_user_access_updated"
  | "admin_user_deleted"
  | "admin_user_detail_view"
  | "admin_user_merged"
  | "profile_service_unlinked"
  | "registration_attempt"
  | "registration_invalid_email"
  | "registration_rate_limited"
  | "registration_success"
  | "login_access_denied"
  | "login_failed"
  | "login_missing_credentials"
  | "login_rate_limited"
  | "login_success"
  | "login_upstream_error"
  | "logout_success"
  | "password_change_failed"
  | "password_change_success"
  | "password_reset_completed"
  | "password_reset_failed"
  | "password_reset_rate_limited"
  | "password_reset_requested"
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
