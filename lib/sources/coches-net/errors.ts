export type CochesNetErrorKind = "antibot" | "empty_page" | "network" | "http" | "unknown";

export class CochesNetFetchError extends Error {
  readonly kind: CochesNetErrorKind;

  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
    kind?: CochesNetErrorKind,
  ) {
    super(message);
    this.name = "CochesNetFetchError";
    this.kind = kind ?? inferKind(status, message);
  }
}

function inferKind(status?: number, message?: string): CochesNetErrorKind {
  if (status === 403 || status === 429) return "antibot";
  if (status && status >= 500) return "network";
  if (/vac[ií]a|error|ups!/i.test(message ?? "")) return "empty_page";
  if (status && status >= 400) return "http";
  return "unknown";
}
