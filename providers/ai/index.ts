import type { AIProvider } from "@/types/ai";
import { MockAIProvider } from "@/providers/ai/mock-provider";
import { createConfiguredCompatibleProvider } from "@/providers/ai/openai-compatible";

export function getAIProvider(): AIProvider {
  return createConfiguredCompatibleProvider() ?? new MockAIProvider();
}

export { MockAIProvider } from "@/providers/ai/mock-provider";
export { OpenAICompatibleProvider } from "@/providers/ai/openai-compatible";
