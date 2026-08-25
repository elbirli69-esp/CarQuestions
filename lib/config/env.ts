const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

function sanitizeAscii(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned || undefined;
}

export function getServerEnv() {
  const openaiApiKey = sanitizeAscii(process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY);
  const openaiBaseUrl = process.env.OPENAI_BASE_URL ?? DEEPSEEK_BASE_URL;
  const usesDeepSeek = /deepseek/i.test(openaiBaseUrl);

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
    verifikApiToken: sanitizeAscii(process.env.VERIFIK_API_TOKEN),
    openapiAutomotiveToken: sanitizeAscii(
      process.env.OPENAPI_AUTOMOTIVE_TOKEN ?? process.env.OPENAPI_COM_API_KEY,
    ),
    openapiAutomotiveBaseUrl:
      process.env.OPENAPI_AUTOMOTIVE_BASE_URL ?? "https://automotive.openapi.com",
    rapidApiKey: sanitizeAscii(process.env.RAPIDAPI_KEY),
  };
}
