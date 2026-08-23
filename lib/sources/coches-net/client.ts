import { CochesNetFetchError } from "@/lib/sources/coches-net/errors";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAYS_MS = [0, 2000, 4000, 8000];
const MAX_ATTEMPTS = 4;

const htmlCache = new Map<string, { html: string; expiresAt: number }>();

function cacheSeconds(): number {
  const raw = process.env.COCHES_NET_CACHE_SECONDS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 1800;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
      next: { revalidate: cacheSeconds() },
    });
  } finally {
    clearTimeout(timer);
  }
}

function validateHtml(text: string, status: number): void {
  if (/Ups! Parece que algo no va bien/i.test(text) || text.length < 2000) {
    throw new CochesNetFetchError(
      "coches.net devolvió una página de error o vacía",
      status,
      text.slice(0, 400),
      "empty_page",
    );
  }
}

export async function fetchCochesNetHtml(url: string, attempt = 0): Promise<string> {
  const cached = htmlCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.html;
  }

  const ua = USER_AGENTS[attempt % USER_AGENTS.length]!;
  const headers = { ...DEFAULT_HEADERS, "User-Agent": ua };

  try {
    const response = await fetchWithTimeout(url, headers);
    const text = await response.text();

    if (!response.ok) {
      const retryable = response.status === 403 || response.status === 429 || response.status >= 500;
      if (retryable && attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS_MS[attempt + 1] ?? 8000);
        return fetchCochesNetHtml(url, attempt + 1);
      }
      throw new CochesNetFetchError(
        `coches.net respondió ${response.status}`,
        response.status,
        text.slice(0, 400),
        response.status === 403 || response.status === 429 || response.status === 405 ? "antibot" : "http",
      );
    }

    try {
      validateHtml(text, response.status);
    } catch (error) {
      if (error instanceof CochesNetFetchError && attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS_MS[attempt + 1] ?? 8000);
        return fetchCochesNetHtml(url, attempt + 1);
      }
      throw error;
    }

    htmlCache.set(url, { html: text, expiresAt: Date.now() + cacheSeconds() * 1000 });
    return text;
  } catch (error) {
    if (error instanceof CochesNetFetchError) throw error;
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(RETRY_DELAYS_MS[attempt + 1] ?? 8000);
      return fetchCochesNetHtml(url, attempt + 1);
    }
    const message = error instanceof Error ? error.message : "Error de red";
    throw new CochesNetFetchError(`coches.net: ${message}`, undefined, undefined, "network");
  }
}
