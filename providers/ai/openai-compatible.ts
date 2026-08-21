import type { AIAnswer, AIProvider, ChatMessage, VehicleContext } from "@/types/ai";
import { ANALYST_SYSTEM_PROMPT, buildVehiclePrompt } from "@/lib/ai/prompt";
import { getServerEnv } from "@/lib/config/env";

interface CompatibleConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  readonly isConfigured: boolean;
  private readonly config: CompatibleConfig;

  constructor(config: CompatibleConfig) {
    this.id = config.id;
    this.name = config.name;
    this.isConfigured = Boolean(config.apiKey);
    this.config = config;
  }

  async answerQuestion(
    question: string,
    context: VehicleContext,
    history: ChatMessage[],
  ): Promise<AIAnswer> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: ANALYST_SYSTEM_PROMPT,
          },
          ...history.map((message) => ({ role: message.role, content: message.content })),
          { role: "user", content: buildVehiclePrompt(question, context) },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`El proveedor de IA respondió ${response.status}: ${body.slice(0, 280)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("El proveedor de IA no devolvió texto.");

    return {
      text,
      provider: this.name,
      isDemo: false,
      origin: "ai_estimate",
      usedDocuments: context.retrievedDocuments?.map((item) => item.document.id) ?? [],
      disclaimer:
        "Respuesta generada por IA a partir del contexto estructurado del vehículo. Verifica fuentes y no la uses como tasación oficial.",
    };
  }
}

export function createConfiguredCompatibleProvider(): AIProvider | null {
  const env = getServerEnv();

  if (env.aiProvider === "mock") return null;

  if (
    (env.aiProvider === "openai" ||
      env.aiProvider === "deepseek" ||
      env.aiProvider === "auto") &&
    env.openaiApiKey
  ) {
    return new OpenAICompatibleProvider({
      id: env.usesDeepSeek ? "deepseek" : "openai",
      name: env.usesDeepSeek ? "DeepSeek" : "OpenAI",
      apiKey: env.openaiApiKey,
      baseUrl: env.openaiBaseUrl,
      model: env.openaiModel,
    });
  }

  return null;
}
