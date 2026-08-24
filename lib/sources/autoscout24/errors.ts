export type AutoScout24ErrorKind = "antibot" | "empty_page" | "network" | "http" | "unknown";

export class AutoScout24FetchError extends Error {
  readonly kind: AutoScout24ErrorKind;

  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
    kind?: AutoScout24ErrorKind,
  ) {
    super(message);
    this.name = "AutoScout24FetchError";
    this.kind = kind ?? inferKind(status, message);
  }
}

function inferKind(status?: number, message?: string): AutoScout24ErrorKind {
  if (status === 403 || status === 429) return "antibot";
  if (status && status >= 500) return "network";
  if (/vac[ií]a|error|captcha/i.test(message ?? "")) return "empty_page";
  if (status && status >= 400) return "http";
  return "unknown";
}
