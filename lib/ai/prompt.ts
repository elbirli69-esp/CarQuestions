import type { VehicleContext } from "@/types/ai";
import { classifyQuestionIntent } from "@/lib/rag/query/expand";

function compactVehicle(context: VehicleContext): string {
  const v = context.vehicle;
  return [
    `${v.brand} ${v.model}${v.version ? ` ${v.version}` : ""} ${v.year}`,
    `${v.mileage} km`,
    v.fuel,
    v.transmission,
    v.advertisedPrice != null ? `precio anunciado ${v.advertisedPrice} EUR` : "sin precio anunciado",
  ].join(" · ");
}

function compactMarket(context: VehicleContext): string {
  const m = context.marketData;
  return [
    `estimación ${m.estimatedPrice} EUR (${m.low}-${m.high})`,
    `veredicto ${m.verdictLabel}`,
    `confianza ${m.confidence}%`,
    `${m.comparableCount} comparables`,
    m.origin,
  ].join(" · ");
}

function compactReliability(context: VehicleContext): string {
  const r = context.reliabilityData;
  if (!r.available) return "Sin ficha de fiabilidad específica en el corpus.";
  const issues = r.knownIssues
    .slice(0, 5)
    .map((issue) => `- [${issue.severity}] ${issue.title}: ${issue.detail}`)
    .join("\n");
  return `Score orientativo ${r.score ?? "n/d"}. Fuente: ${r.source}.\n${issues || "Sin issues listados."}`;
}

function compactMaintenance(context: VehicleContext): string {
  const m = context.maintenanceData;
  if (!m.available) return "Sin ficha de mantenimiento específica.";
  return [...m.notes.slice(0, 3), ...m.upcoming.slice(0, 3)].join(" | ");
}

export function buildVehiclePrompt(question: string, context: VehicleContext): string {
  const intent = classifyQuestionIntent(question);
  const retrievedKnowledge =
    context.retrievedDocuments
      ?.filter((item) => item.document.id.startsWith("knowledge_"))
      .slice(0, 8)
      .map(
        (item) =>
          `- (${(item.score * 100).toFixed(0)}%) [${item.document.source}] ${item.document.content}`,
      )
      .join("\n") ?? "Sin fragmentos RAG recuperados.";

  return [
    "Responde SOLO a la pregunta del usuario sobre ESTE coche. No rellenes con marketing genérico.",
    "Prioridad de evidencia: 1) fragmentos RAG de foros/manuales/recalls, 2) ficha de fiabilidad/mantenimiento del análisis, 3) valoración de mercado si la pregunta es de precio.",
    "Si el corpus no cubre el punto, dilo explícitamente y sugiere qué comprobar en taller. No inventes averías ni precios.",
    "Cuando cites un patrón técnico, menciona la fuente del fragmento y aclara que no es diagnóstico de este bastidor.",
    `Intención detectada: ${intent}`,
    `Pregunta del usuario: ${question}`,
    `Vehículo: ${compactVehicle(context)}`,
    `Mercado: ${compactMarket(context)}`,
    `Fiabilidad:\n${compactReliability(context)}`,
    `Mantenimiento: ${compactMaintenance(context)}`,
    `Conocimiento técnico recuperado (RAG):\n${retrievedKnowledge}`,
  ].join("\n\n");
}

export const ANALYST_SYSTEM_PROMPT = [
  "Eres el analista técnico de CarQuestions, especializado en compraventa de coches de segunda mano en España.",
  "Tu foco es conocimiento de motores, averías habituales, síntomas, causas, soluciones y costes orientativos.",
  "Separa siempre: (A) patrón conocido del modelo/motor, (B) dato observado de este anuncio, (C) estimación.",
  "Habla en español claro. Sé concreto: síntoma → causa probable → qué preguntar/revisar → coste orientativo si hay dato.",
  "No presentes datos demo o mocks como hechos de mercado reales.",
].join(" ");
