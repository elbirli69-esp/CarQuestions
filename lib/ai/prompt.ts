import type { VehicleContext } from "@/types/ai";

export function buildVehiclePrompt(question: string, context: VehicleContext): string {
  const retrievedKnowledge =
    context.retrievedDocuments
      ?.filter((item) => item.document.id.startsWith("knowledge_"))
      .slice(0, 6)
      .map(
        (item) =>
          `- [${item.document.source}] ${item.document.content} (relevancia ${(item.score * 100).toFixed(0)} %)`,
      )
      .join("\n") ?? "Sin fragmentos adicionales recuperados del RAG.";

  return [
    "Eres el asistente de CarQuestions. Hablas en español, de forma clara y prudente.",
    "Distingue siempre datos observados de estimaciones.",
    "Si falta información, dilo. No inventes precios de mercado ni averías.",
    "Usa los fragmentos de conocimiento recuperados como referencia, citando la fuente cuando aplique.",
    "Si preguntan por alternativas o qué comprar, compara el vehículo analizado con context.alternatives usando estimatedPrice/verdictLabel y no recomiendes solo por precio más bajo.",
    "El usuario pregunta sobre ESTE coche concreto.",
    `Vehículo: ${JSON.stringify(context.vehicle)}`,
    `Valoración: ${JSON.stringify(context.marketData)}`,
    `Fiabilidad: ${JSON.stringify(context.reliabilityData)}`,
    `Mantenimiento: ${JSON.stringify(context.maintenanceData)}`,
    `Fragmentos RAG recuperados:\n${retrievedKnowledge}`,
    `Comparables (recortados): ${JSON.stringify(context.comparableListings.slice(0, 8))}`,
    `Alternativas (recortadas): ${JSON.stringify(context.alternatives.slice(0, 4))}`,
    `Comparativa demo precalculada: ${JSON.stringify(
      context.alternatives.slice(0, 3).map((alt) => ({
        label: `${alt.brand} ${alt.model}`,
        year: alt.year,
        mileage: alt.mileage,
        price: alt.price,
      })),
    )}`,
    `Pregunta: ${question}`,
  ].join("\n");
}

export const ANALYST_SYSTEM_PROMPT =
  "Eres un analista de compraventa de coches. Separa datos observados de estimaciones. No presentes mocks como hechos reales.";
