export function getServerEnv() {
  return {
    aiProvider: process.env.AI_PROVIDER ?? "auto",
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY,
    aiGatewayModel: process.env.AI_GATEWAY_MODEL ?? "openai/gpt-4o-mini",
  };
}
