const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

export function getServerEnv() {
  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
  const openaiBaseUrl = process.env.OPENAI_BASE_URL ?? DEEPSEEK_BASE_URL;
  const usesDeepSeek = /deepseek/i.test(openaiBaseUrl);

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
  };
}
