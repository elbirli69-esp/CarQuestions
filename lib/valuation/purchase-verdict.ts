import type { ConsistencyReport } from "@/types/evidence";
import type { ListingQuality, PurchaseVerdict, ValuationResult } from "@/types/valuation";

export function buildPurchaseVerdict(options: {
  consistency: ConsistencyReport;
  valuation: ValuationResult;
  listingQuality: ListingQuality;
}): PurchaseVerdict {
  const { consistency, valuation, listingQuality } = options;

  if (consistency.status === "invalid") {
    return {
      id: "datos_incoherentes",
      label: "No compraría sin investigar más",
      tone: "bad",
      summary: consistency.summary,
    };
  }

  if (valuation.marketStatus === "none" || valuation.origin === "ai_estimate") {
    return {
      id: "compraria_con_precaucion",
      label: "Compraría con precaución",
      tone: "caution",
      summary: "No hay mercado comparable suficiente. El precio no se puede contrastar con anuncios reales.",
    };
  }

  if (valuation.marketStatus === "insufficient" || (valuation.confidenceBand ?? "baja") === "muy_baja") {
    return {
      id: "compraria_con_precaucion",
      label: "Compraría con precaución",
      tone: "caution",
      summary: "Hay muy pocos comparables. Úsalo como pista, no como tasación.",
    };
  }

  if (listingQuality.score < 40 && (valuation.verdict === "muy_barato" || valuation.verdict === "barato")) {
    return {
      id: "compraria_con_precaucion",
      label: "Compraría con precaución",
      tone: "caution",
      summary: "El precio parece bajo, pero el anuncio omite datos clave. Exige papeles antes de desplazarte.",
    };
  }

  if (valuation.verdict === "muy_caro") {
    return {
      id: "no_sin_investigar",
      label: "No compraría sin investigar más",
      tone: "bad",
      summary: valuation.summary,
    };
  }
  if (valuation.verdict === "caro") {
    return {
      id: "precio_razonable",
      label: "Precio razonable",
      tone: "ok",
      summary: "Está por encima de la mediana, pero dentro de un rango negociable si el estado acompaña.",
    };
  }
  if (valuation.verdict === "muy_barato" || valuation.verdict === "barato") {
    return {
      id: "buena_oportunidad",
      label: "Buena oportunidad",
      tone: "good",
      summary: valuation.summary,
    };
  }
  if (consistency.status === "suspicious") {
    return {
      id: "compraria_con_precaucion",
      label: "Compraría con precaución",
      tone: "caution",
      summary: consistency.summary,
    };
  }
  return {
    id: "precio_razonable",
    label: "Precio razonable",
    tone: "ok",
    summary: valuation.summary,
  };
}
