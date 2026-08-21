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

export function getServerEnv() {
  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
  const openaiBaseUrl = process.env.OPENAI_BASE_URL ?? DEEPSEEK_BASE_URL;
  const usesDeepSeek = /deepseek/i.test(openaiBaseUrl);
  const autohubRapidApiKey =
    process.env.AUTOHUB_RAPIDAPI_KEY?.trim() ||
    process.env.RAPIDAPI_KEY?.trim() ||
    undefined;

  return {
    aiProvider: process.env.AI_PROVIDER ?? "auto",
    openaiApiKey,
    openaiBaseUrl,
    openaiModel: process.env.OPENAI_MODEL ?? (usesDeepSeek ? DEEPSEEK_MODEL : "gpt-4o-mini"),
    usesDeepSeek,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY,
    aiGatewayModel: process.env.AI_GATEWAY_MODEL ?? "deepseek/deepseek-v4-flash",
    autohubRapidApiKey,
    autohubApiBaseUrl: process.env.AUTOHUB_API_BASE_URL?.trim() || DEFAULT_AUTOHUB_BASE_URL,
    autohubRapidApiHost: process.env.AUTOHUB_RAPIDAPI_HOST?.trim() || DEFAULT_AUTOHUB_HOST,
    autohubUsdToEur: readNumberEnv("AUTOHUB_USD_TO_EUR", 0.92),
  };
}
