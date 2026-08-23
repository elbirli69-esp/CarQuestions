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
    m.isSegmentReference || m.marketStatus === "none"
      ? "SIN MERCADO COMPARABLE"
      : `estimación ${m.estimatedPrice} EUR (${m.low}-${m.high})`,
    `veredicto ${m.verdictLabel}`,
    `confianza ${m.confidenceBand ?? m.confidence}`,
    `${m.comparableCount} comparables`,
    m.origin,
  ].join(" · ");
}

function compactReliability(context: VehicleContext): string {
  const r = context.reliabilityData;
  if (!r.available) {
    return r.notes[0] ?? "Sin evidencia específica. No inventes averías.";
  }
  const issues = r.knownIssues
    .slice(0, 5)
    .map((issue) => `- [nivel ${issue.evidenceLevel ?? "?"}] [${issue.severity}] ${issue.title}: ${issue.detail}`)
    .join("\n");
  return `Score orientativo ${r.score ?? "n/d"} (evidencia ${r.evidenceLevel ?? "n/d"}). Fuente: ${r.source}.\n${issues || "Sin issues de nivel A/B."}`;
}

function compactMaintenance(context: VehicleContext): string {
  const m = context.maintenanceData;
  if (!m.available) return "Sin ficha de mantenimiento específica. No inventes intervalos.";
  return [...m.notes.slice(0, 3), ...m.upcoming.slice(0, 3)].join(" | ");
}

export function buildVehiclePrompt(question: string, context: VehicleContext): string {
  const intent = classifyQuestionIntent(question);
  const retrievedKnowledge =
    context.retrievedDocuments
      ?.filter((item) => item.document.id.startsWith("knowledge_"))
      .slice(0, 8)
      .map((item) => {
        const level = String(item.document.metadata?.evidenceLevel ?? "?");
        return `- (nivel ${level}, ${(item.score * 100).toFixed(0)}%) [${item.document.source}] ${item.document.content}`;
      })
      .join("\n") ?? "Sin fragmentos RAG recuperados.";

  return [
    "Responde SOLO a la pregunta del usuario sobre ESTE coche.",
    "REGLA DE ORO: si la evidencia no permite afirmar algo específicamente sobre este vehículo, di que no hay evidencia suficiente. Es mejor no saber que inventar.",
    "Prohibido: inventar averías, recalls, costes, intervalos, estadísticas, autonomía o SOH.",
    "Prohibido: atribuir problemas de otra marca o de un segmento como si fueran de este modelo.",
    "Niveles de evidencia: A = modelo/motor concreto; B = plataforma/marca; C = segmento; D = inferencia.",
    "Nunca presentes C o D como «problema conocido del modelo».",
    "Si un fragmento es genérico (sensores ICE, octovalve, CKP) y no encaja con marca/combustible, ignóralo.",
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
  "Prioriza grounding, evidencia y honestidad. Si no hay dato, dilo.",
  "Separa siempre: (A) patrón conocido del modelo/motor, (B) plataforma compartida, (C) segmento, (D) inferencia.",
  "Habla en español claro. No presentes datos demo como mercado real.",
  "No rellenes vacíos de conocimiento específico con conocimiento genérico.",
].join(" ");
