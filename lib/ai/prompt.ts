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
  const market = context.market;
  if (market) {
    if (market.status !== "observed" || market.estimatedPrice == null) {
      return [
        `estado ${market.status}`,
        market.segmentReference
          ? `referencia orientativa ${market.segmentReference.value} EUR (no es mercado observado)`
          : "sin precio de mercado",
        `${market.comparableCount} comparables`,
      ].join(" · ");
    }
    return [
      `estimación ${market.estimatedPrice} EUR (${market.range?.low ?? "?"}-${market.range?.high ?? "?"})`,
      `veredicto ${market.verdictLabel}`,
      `confianza ${market.confidence.label}`,
      `${market.comparableCount} comparables`,
      "observed",
    ].join(" · ");
  }

  const m = context.marketData;
  const hasPrice = m.comparableCount >= 3 && m.origin === "observed" && m.estimatedPrice > 0;
  if (!hasPrice) {
    return `sin mercado comparable · ${m.comparableCount} anuncios · no inventes precio`;
  }
  return [
    `estimación ${m.estimatedPrice} EUR (${m.low}-${m.high})`,
    `veredicto ${m.verdictLabel}`,
    `confianza ${m.confidence}%`,
    `${m.comparableCount} comparables`,
    m.origin,
  ].join(" · ");
}

function compactIdentity(context: VehicleContext): string {
  const id = context.identity;
  if (!id) return "Identidad no validada en este contexto.";
  const blocking = id.issues.filter((issue) => issue.severity === "blocking");
  return [
    `estado ${id.status}`,
    `seguro para conocimiento técnico: ${id.safeForTechnicalKnowledge ? "sí" : "no"}`,
    blocking.length
      ? `inconsistencias: ${blocking.map((issue) => issue.message).join(" | ")}`
      : "sin inconsistencias bloqueantes",
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
  const identityBlocked = context.identity && !context.identity.safeForTechnicalKnowledge;
  const knowledgeBlocked = context.knowledge?.status === "blocked";
  const retrievedKnowledge =
    identityBlocked || knowledgeBlocked
      ? "Conocimiento técnico bloqueado: los datos del vehículo se contradicen. No uses RAG ni inventes averías."
      : (context.retrievedDocuments
          ?.filter((item) => item.document.id.startsWith("knowledge_"))
          .slice(0, 8)
          .map(
            (item) =>
              `- (${(item.score * 100).toFixed(0)}%) [${item.document.source}] ${item.document.content}`,
          )
          .join("\n") ?? "Sin fragmentos RAG recuperados.");

  const identityRules = identityBlocked
    ? [
        "REGLA CRÍTICA: la identidad del vehículo es inválida o contradictoria.",
        "No describas averías, mantenimiento ni precio de mercado como si fueran de este coche.",
        "Explica qué campos se contradicen y pide al usuario corregir marca, modelo, versión o combustible.",
      ]
    : [
        "Respeta el tren motriz inferido: no menciones EGR, distribución ni FAP en eléctricos; no menciones SOH, octovalve ni bomba de calor en diésel/gasolina salvo PHEV.",
      ];

  return [
    "Responde SOLO a la pregunta del usuario sobre ESTE coche. No rellenes con marketing genérico.",
    ...identityRules,
    "Prioridad de evidencia: 1) fragmentos RAG de foros/manuales/recalls, 2) ficha de fiabilidad/mantenimiento del análisis, 3) valoración de mercado si la pregunta es de precio.",
    "Si el corpus no cubre el punto, dilo explícitamente y sugiere qué comprobar en taller. No inventes averías ni precios.",
    "Si no hay mercado observado (comparables insuficientes), NO des cifras de mercado ni techo de negociación inventados.",
    "Cuando cites un patrón técnico, menciona la fuente del fragmento y aclara que no es diagnóstico de este bastidor.",
    "Si un fragmento RAG o issue tiene severidad alta (cadena, wet belt, culata, ICCU, etc.), destácalo al inicio y recomienda inspección antes de pagar.",
    `Intención detectada: ${intent}`,
    `Pregunta del usuario: ${question}`,
    `Identidad: ${compactIdentity(context)}`,
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
  "Si la identidad del vehículo es inválida, no generes conocimiento técnico ni precios: pide corregir los datos.",
  "Nunca mezcles averías de trenes motriz distintos (combustión vs eléctrico vs híbrido enchufable).",
].join(" ");
