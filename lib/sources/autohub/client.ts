export interface AutoHubClientConfig {
  apiKey: string;
  baseUrl: string;
  host: string;
}

export class AutoHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "AutoHubApiError";
  }
}

export async function autohubGet<T>(
  config: AutoHubClientConfig,
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${config.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-rapidapi-key": config.apiKey,
      "x-rapidapi-host": config.host,
    },
    next: { revalidate: 1800 },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new AutoHubApiError(
      `AutoHub respondió ${response.status}`,
      response.status,
      text.slice(0, 500),
    );
  }

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AutoHubApiError("AutoHub devolvió una respuesta no JSON", response.status, text.slice(0, 500));
  }
}

export function extractAutoHubItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item != null);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.results, record.listings, record.items, record.body, record.vehicles];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => typeof item === "object" && item != null);
    }
  }

  return [];
}
