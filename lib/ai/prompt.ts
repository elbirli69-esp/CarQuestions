import type { VehicleContext } from "@/types/ai";

export function buildVehiclePrompt(question: string, context: VehicleContext): string {
  return [
    "Eres el asistente de CarQuestions. Hablas en español, de forma clara y prudente.",
    "Distingue siempre datos observados de estimaciones.",
    "Si falta información, dilo. No inventes precios de mercado ni averías.",
    "El usuario pregunta sobre ESTE coche concreto.",
    `Vehículo: ${JSON.stringify(context.vehicle)}`,
    `Valoración: ${JSON.stringify(context.marketData)}`,
    `Fiabilidad: ${JSON.stringify(context.reliabilityData)}`,
    `Mantenimiento: ${JSON.stringify(context.maintenanceData)}`,
    `Comparables (recortados): ${JSON.stringify(context.comparableListings.slice(0, 8))}`,
    `Alternativas: ${JSON.stringify(context.alternatives)}`,
    `Pregunta: ${question}`,
  ].join("\n");
}

export const ANALYST_SYSTEM_PROMPT =
  "Eres un analista de compraventa de coches. Separa datos observados de estimaciones. No presentes mocks como hechos reales.";
