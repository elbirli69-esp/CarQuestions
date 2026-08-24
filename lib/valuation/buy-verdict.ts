import type { BuyVerdict, BuyVerdictReason, ListingQuality } from "@/types/analysis";
import type { VehicleIdentity } from "@/types/identity";
import type { MarketValuation } from "@/types/market";
import type { TechnicalKnowledge } from "@/types/technical";

export interface BuyVerdictInput {
  identity: VehicleIdentity;
  market: MarketValuation;
  knowledge: TechnicalKnowledge;
  listingQuality: ListingQuality;
}

function severeFindings(knowledge: TechnicalKnowledge) {
  return [...knowledge.modelSpecific, ...knowledge.platformShared].filter(
    (finding) => finding.severity === "high",
  );
}

/**
 * La primera respuesta que ve el usuario (FASE 16): ¿es una buena compra?
 *
 * Solo se moja cuando hay mercado observable. Sin comparables, el veredicto
 * honesto es "no lo sabemos", no un semáforo verde con confianza baja.
 */
export function buildBuyVerdict(input: BuyVerdictInput): BuyVerdict {
  const { identity, market, knowledge, listingQuality } = input;
  const reasons: BuyVerdictReason[] = [];

  if (!identity.safeForTechnicalKnowledge) {
    return {
      level: "insufficient_data",
      tone: "neutral",
      headline: "Antes de nada, revisa los datos del coche",
      detail:
        "Los datos que has introducido se contradicen entre sí. No podemos valorar ni analizar un vehículo que, tal y como está descrito, no existe.",
      reasons: identity.issues
        .filter((issue) => issue.severity === "blocking")
        .map((issue) => ({ text: issue.message, tone: "negative" as const })),
      confidence: "none",
    };
  }

  const high = severeFindings(knowledge);
  const delta = market.percentDifference;

  if (market.status !== "observed") {
    if (listingQuality.score < 50) {
      reasons.push({
        text: "Además, faltan datos clave del anuncio para valorar el riesgo.",
        tone: "negative",
      });
    }
    if (high.length > 0) {
      reasons.push({
        text: `Hay ${high.length} patrón(es) grave(s) documentado(s) que conviene comprobar en persona.`,
        tone: "negative",
      });
    }
    return {
      level: "insufficient_data",
      tone: "neutral",
      headline: "No podemos decirte si es una buena compra",
      detail:
        market.status === "unavailable"
          ? "No hemos encontrado anuncios comparables, así que no hay precio de mercado con el que contrastar. Preferimos decírtelo a inventarnos una cifra."
          : "Hay tan pocos anuncios equivalentes que cualquier conclusión sobre el precio sería casualidad.",
      reasons: [
        {
          text: "Busca tú mismo el mismo modelo, año y motor en el portal y compara al menos cinco anuncios.",
          tone: "neutral",
        },
        ...reasons,
      ],
      confidence: "none",
    };
  }

  if (delta == null) {
    return {
      level: "insufficient_data",
      tone: "neutral",
      headline: "Falta el precio del anuncio",
      detail: `Sabemos cuánto piden por coches equivalentes (${market.range?.low.toLocaleString("es-ES")}–${market.range?.high.toLocaleString("es-ES")} €), pero sin el precio de este no podemos decirte si interesa.`,
      reasons: [{ text: "Añade el precio del anuncio para obtener el veredicto.", tone: "neutral" }],
      confidence: market.confidence.level,
    };
  }

  // --- Señales ---------------------------------------------------------------
  const percent = (delta * 100).toFixed(1).replace(".", ",");
  if (delta <= -0.04) {
    reasons.push({ text: `Está un ${percent.replace("-", "")} % por debajo de anuncios equivalentes.`, tone: "positive" });
  } else if (delta >= 0.08) {
    reasons.push({ text: `Está un ${percent} % por encima de anuncios equivalentes.`, tone: "negative" });
  } else {
    reasons.push({ text: "El precio está alineado con el mercado.", tone: "neutral" });
  }

  if (high.length > 0) {
    reasons.push({
      text: `Hay ${high.length} patrón(es) grave(s) documentado(s) para esta mecánica: compruébalos antes de pagar.`,
      tone: "negative",
    });
  } else if (knowledge.status === "specific") {
    reasons.push({
      text: "No hay patrones graves documentados para este modelo y motor en nuestra base.",
      tone: "positive",
    });
  } else if (knowledge.status === "segment_only" || knowledge.status === "none") {
    reasons.push({
      text: "No tenemos fichas técnicas de este modelo, así que el riesgo mecánico está sin evaluar.",
      tone: "neutral",
    });
  }

  if (listingQuality.score < 45) {
    reasons.push({
      text: `La información disponible del anuncio es pobre (${listingQuality.score}/100): faltan datos que definen el riesgo.`,
      tone: "negative",
    });
  } else if (listingQuality.score >= 75) {
    reasons.push({ text: `El anuncio está bien documentado (${listingQuality.score}/100).`, tone: "positive" });
  }

  if (market.confidence.level === "low" || market.confidence.level === "very_low") {
    reasons.push({
      text: `La confianza del cálculo es ${market.confidence.label.toLowerCase()}: ${market.confidence.drivers[0]?.toLowerCase()}.`,
      tone: "neutral",
    });
  }

  // --- Decisión --------------------------------------------------------------
  const weakConfidence = market.confidence.level === "very_low" || market.confidence.level === "low";
  const risky = high.length > 0 || listingQuality.score < 45;

  if (delta >= 0.12 || (risky && delta >= 0.04)) {
    return {
      level: "high_risk",
      tone: "red",
      headline: "No lo compraría sin investigar más",
      detail:
        delta >= 0.12
          ? "Pide bastante más de lo que cuestan coches equivalentes y no hay nada en los datos que lo justifique."
          : "El precio no está mal, pero se junta con riesgos sin resolver que pueden costar más que la rebaja.",
      reasons,
      confidence: market.confidence.level,
    };
  }

  if (risky || delta >= 0.05) {
    return {
      level: "caution",
      tone: "orange",
      headline: "Lo compraría con precaución",
      detail: risky
        ? "El precio es defendible, pero hay puntos que tienes que cerrar antes de dar una señal."
        : "Está algo por encima del mercado: tienes argumentos para negociar.",
      reasons,
      confidence: market.confidence.level,
    };
  }

  if (delta <= -0.06 && !weakConfidence) {
    return {
      level: "good_opportunity",
      tone: "green",
      headline: "Buena oportunidad",
      detail:
        "Está por debajo de lo que piden coches equivalentes y no hemos detectado señales de alarma en los datos. Merece la pena ir a verlo.",
      reasons,
      confidence: market.confidence.level,
    };
  }

  return {
    level: "fair_price",
    tone: "amber",
    headline: "Precio razonable",
    detail:
      "Está dentro de lo que se paga por coches equivalentes. La decisión se juega en el estado real y en el historial, no en el precio.",
    reasons,
    confidence: market.confidence.level,
  };
}
