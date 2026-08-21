import { generateText } from "ai";
import type { AIAnswer, AIProvider, ChatMessage, VehicleContext } from "@/types/ai";
import { ANALYST_SYSTEM_PROMPT, buildVehiclePrompt } from "@/lib/ai/prompt";

export class VercelGatewayProvider implements AIProvider {
  readonly id = "ai-gateway";
  readonly name = "Vercel AI Gateway";
  readonly isConfigured = true;
  private readonly model: string;

  constructor(model: string) {
    this.model = model;
  }

  async answerQuestion(
    question: string,
    context: VehicleContext,
    history: ChatMessage[],
  ): Promise<AIAnswer> {
    const { text } = await generateText({
      model: this.model,
      temperature: 0.3,
      system: ANALYST_SYSTEM_PROMPT,
      messages: [
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user" as const, content: buildVehiclePrompt(question, context) },
      ],
    });

    const trimmed = text.trim();
    if (!trimmed) throw new Error("El AI Gateway no devolvió texto.");

    return {
      text: trimmed,
      provider: `${this.name} · ${this.model}`,
      isDemo: false,
      origin: "ai_estimate",
      usedDocuments: context.retrievedDocuments?.map((item) => item.document.id) ?? [],
      disclaimer:
        "Respuesta generada por DeepSeek a través de Vercel AI Gateway, con el contexto de este vehículo. Verifica fuentes y no la uses como tasación oficial.",
    };
  }
}

export function canUseVercelGateway(): boolean {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_OIDC_TOKEN) ||
    Boolean(process.env.AI_GATEWAY_API_KEY)
  );
}
