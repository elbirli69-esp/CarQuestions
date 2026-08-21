import type { AIProvider } from "@/types/ai";
import { getServerEnv } from "@/lib/config/env";
import { canUseVercelGateway, VercelGatewayProvider } from "@/providers/ai/gateway-provider";
import { MockAIProvider } from "@/providers/ai/mock-provider";
import { createConfiguredCompatibleProvider } from "@/providers/ai/openai-compatible";

export function getAIProvider(): AIProvider {
  const env = getServerEnv();
  if (env.aiProvider === "mock") return new MockAIProvider();

  if (
    (env.aiProvider === "auto" || env.aiProvider === "gateway") &&
    canUseVercelGateway()
  ) {
    return new VercelGatewayProvider(env.aiGatewayModel);
  }

  return createConfiguredCompatibleProvider() ?? new MockAIProvider();
}

export { MockAIProvider } from "@/providers/ai/mock-provider";
export { OpenAICompatibleProvider } from "@/providers/ai/openai-compatible";
export { VercelGatewayProvider } from "@/providers/ai/gateway-provider";
