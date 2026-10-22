// =============================================================================
// Application Errors
// =============================================================================
// Expected, user-facing failures. The message is safe to return to the client;
// `code` lets the UI react (e.g. open the upgrade dialog on LIMIT_REACHED).
// =============================================================================

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "LIMIT_REACHED"
  | "PLAN_FEATURE"
  | "DUPLICATE_REQUEST"
  | "PAYMENT_PROVIDER"
  | "SETUP_REQUIRED"
  | "QUOTA_EXCEEDED";

export class AppError extends Error {
  readonly status: number;
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}
