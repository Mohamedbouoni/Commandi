// =============================================================================
// Client-side API helper
// =============================================================================

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Codes that mean "the user needs a paid plan" — the UI opens the upgrade dialog. */
export function isUpgradeError(err: unknown): err is ApiError {
  return err instanceof ApiError && (err.code === "LIMIT_REACHED" || err.code === "PLAN_FEATURE");
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new ApiError(
      json?.error || "Something went wrong. Please try again.",
      response.status,
      json?.code
    );
  }
  return json as T;
}
