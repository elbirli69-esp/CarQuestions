const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_AUTOHUB_BASE_URL = "https://autohub1.p.rapidapi.com/api";
const DEFAULT_AUTOHUB_HOST = "autohub1.p.rapidapi.com";

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeAscii(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned || undefined;
}

export function getServerEnv() {
  const openaiApiKey = sanitizeAscii(process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY);
  const openaiBaseUrl = process.env.OPENAI_BASE_URL ?? DEEPSEEK_BASE_URL;
  const usesDeepSeek = /deepseek/i.test(openaiBaseUrl);
  const autohubRapidApiKey =
    sanitizeAscii(process.env.AUTOHUB_RAPIDAPI_KEY) ||
    sanitizeAscii(process.env.RAPIDAPI_KEY);

  return {
    aiProvider: process.env.AI_PROVIDER ?? "auto",
    openaiApiKey,
    openaiBaseUrl,
    openaiModel: process.env.OPENAI_MODEL ?? (usesDeepSeek ? DEEPSEEK_MODEL : "gpt-4o-mini"),
    usesDeepSeek,
    anthropicApiKey: sanitizeAscii(process.env.ANTHROPIC_API_KEY),
    geminiApiKey: sanitizeAscii(process.env.GEMINI_API_KEY),
    deepseekApiKey: sanitizeAscii(process.env.DEEPSEEK_API_KEY),
    aiGatewayApiKey: sanitizeAscii(process.env.AI_GATEWAY_API_KEY),
    aiGatewayModel: process.env.AI_GATEWAY_MODEL ?? "deepseek/deepseek-v4-flash",
    autohubRapidApiKey,
    autohubApiBaseUrl: process.env.AUTOHUB_API_BASE_URL?.trim() || DEFAULT_AUTOHUB_BASE_URL,
    autohubRapidApiHost: process.env.AUTOHUB_RAPIDAPI_HOST?.trim() || DEFAULT_AUTOHUB_HOST,
    autohubUsdToEur: readNumberEnv("AUTOHUB_USD_TO_EUR", 0.92),
    autohubZipcode: process.env.AUTOHUB_ZIPCODE?.trim() || "10001",
    autohubSearchRadius: readNumberEnv("AUTOHUB_SEARCH_RADIUS", 100),
  };
}
