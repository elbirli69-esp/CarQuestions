export class CochesNetFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "CochesNetFetchError";
  }
}

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

export async function fetchCochesNetHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: "follow",
    // Cachea resultados ~30 min en el runtime de Next para no martillar el portal.
    next: { revalidate: 1800 },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new CochesNetFetchError(
      `coches.net respondió ${response.status}`,
      response.status,
      text.slice(0, 400),
    );
  }

  if (/Ups! Parece que algo no va bien/i.test(text) || text.length < 2000) {
    throw new CochesNetFetchError(
      "coches.net devolvió una página de error o vacía",
      response.status,
      text.slice(0, 400),
    );
  }

  return text;
}
