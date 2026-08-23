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
  if (m.estimatedPrice == null || m.insufficientMarketData) {
    return [
      "SIN MERCADO COMPARABLE SUFICIENTE",
      `comparables: ${m.comparableCount}`,
      `confianza ${m.confidence}% (${m.confidenceBand ?? "muy_baja"})`,
      m.segmentReference
        ? `referencia segmento (NO mercado): ${m.segmentReference.amount} EUR — ${m.segmentReference.disclaimer}`
        : "sin referencia de segmento",
      m.origin,
    ].join(" · ");
  }
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
  if (!r.available) {
    return "Sin evidencia suficiente de fiabilidad específica del modelo. NO inventes averías.";
  }
  const demoNote = r.isDemo ? " [CORPUS DEMO / PENDIENTE DE REVISIÓN]" : "";
  const issues = r.knownIssues
    .slice(0, 5)
    .map(
      (issue) =>
        `- [${issue.severity}][nivel ${issue.evidenceLevel ?? "?"}]${issue.isDemo ? "[demo]" : ""} ${issue.title}: ${issue.detail}`,
    )
    .join("\n");
  return `Score orientativo ${r.score ?? "n/d"}.${demoNote} Fuente: ${r.source}.\n${issues || "Sin issues listados."}`;
}

function compactMaintenance(context: VehicleContext): string {
  const m = context.maintenanceData;
  if (!m.available) return "Sin ficha de mantenimiento específica. NO inventes intervalos ni costes.";
  const demoNote = m.isDemo ? " [demo]" : "";
  return `${demoNote} ${[...m.notes.slice(0, 3), ...m.upcoming.slice(0, 3)].join(" | ")}`;
}

export function buildVehiclePrompt(question: string, context: VehicleContext): string {
  const intent = classifyQuestionIntent(question);
  const retrievedKnowledge =
    context.retrievedDocuments
      ?.filter((item) => {
        const id = item.document.id;
        // Prefer knowledge; also allow market/listing docs when intent needs them
        if (id.startsWith("knowledge_")) return true;
        if (intent === "price" || intent === "negotiation") {
          return id.startsWith("market_") || id.startsWith("listing_") || id.startsWith("doc_");
        }
        if (intent === "equipment") {
          return id.startsWith("listing_") || id.startsWith("doc_");
        }
        return false;
      })
      .slice(0, 8)
      .map((item) => {
        const demo = item.document.isDemo || item.document.metadata?.isDemo === true ? " [DEMO]" : "";
        const level = item.document.metadata?.evidenceLevel
          ? ` [nivel ${item.document.metadata.evidenceLevel}]`
          : "";
        return `- (${(item.score * 100).toFixed(0)}%)${demo}${level} [${item.document.source}] ${item.document.content}`;
      })
      .join("\n") ?? "Sin fragmentos RAG recuperados.";

  return [
    "Responde SOLO a la pregunta del usuario sobre ESTE coche. No rellenes con marketing genérico.",
    "REGLA ANTI-ALUCINACIÓN: Si la evidencia no permite afirmar algo específicamente sobre este vehículo/modelo, di exactamente que no hay evidencia suficiente. Es preferible «no lo sabemos» a inventar precisión.",
    "Prohibido: inventar averías, recalls, costes, intervalos, estadísticas de fiabilidad, o atribuir problemas de otra marca/modelo.",
    "Niveles de evidencia: A=modelo/motor concreto, B=plataforma compartida, C=segmento genérico, D=inferencia. Nunca presentes C o D como «problema conocido del modelo».",
    "Prioridad de evidencia: 1) fragmentos RAG nivel A/B, 2) ficha de fiabilidad del análisis, 3) mercado observado si la pregunta es de precio.",
    "Si un fragmento está marcado [DEMO], indícalo y no lo presentes como hecho oficial.",
    "Cuando cites un patrón técnico, menciona la fuente y aclara que no es diagnóstico de este bastidor.",
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
  "Tu foco es ayudar a decidir si un coche concreto es una buena compra: precio, riesgos, preguntas al vendedor e inspección.",
  "Separa siempre: (A) patrón conocido del modelo/motor con evidencia, (B) dato observado de este anuncio, (C) estimación/inferencia.",
  "Si no hay evidencia específica del modelo, dilo. No inventes.",
  "Habla en español claro. Sé concreto y honesto con la incertidumbre.",
  "No presentes datos demo o mocks como hechos de mercado reales.",
].join(" ");
