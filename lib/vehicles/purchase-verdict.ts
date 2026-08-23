import type { ConsistencyStatus } from "@/lib/vehicles/consistency";
import type { PriceVerdict, ValuationResult, VehicleScorecard } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

export type PurchaseDecision =
  | "buena_oportunidad"
  | "precio_razonable"
  | "precaucion"
  | "investigar_mas"
  | "datos_incoherentes"
  | "sin_datos";

export interface PurchaseVerdict {
  decision: PurchaseDecision;
  label: string;
  tone: "green" | "amber" | "orange" | "red" | "neutral";
  summary: string;
  priceLine?: string;
  marketLine?: string;
  deltaLine?: string;
  confidenceLabel: string;
  confidencePercent: number;
}

function confidenceLabel(percent: number, origin: ValuationResult["origin"]): string {
  if (origin !== "observed") {
    if (percent < 20) return "Muy baja";
    return "Baja";
  }
  if (percent >= 70) return "Alta";
  if (percent >= 50) return "Media";
  if (percent >= 30) return "Baja";
  return "Muy baja";
}

function fromPriceVerdict(verdict: PriceVerdict): {
  decision: PurchaseDecision;
  label: string;
  tone: PurchaseVerdict["tone"];
} {
  switch (verdict) {
    case "muy_barato":
      return { decision: "buena_oportunidad", label: "Buena oportunidad", tone: "green" };
    case "barato":
      return { decision: "buena_oportunidad", label: "Buen precio", tone: "green" };
    case "precio_de_mercado":
      return { decision: "precio_razonable", label: "Precio razonable", tone: "amber" };
    case "caro":
      return { decision: "precaucion", label: "Compraría con precaución", tone: "orange" };
    case "muy_caro":
      return { decision: "investigar_mas", label: "No compraría sin investigar más", tone: "red" };
    default:
      return { decision: "sin_datos", label: "Sin veredicto de precio", tone: "neutral" };
  }
}

export function buildPurchaseVerdict(options: {
  vehicle: Vehicle;
  valuation: ValuationResult;
  scores: VehicleScorecard;
  consistencyStatus: ConsistencyStatus | "valid" | "suspicious" | "invalid";
  hasModelKnowledge: boolean;
  listingRisk?: "bajo" | "medio" | "alto" | "desconocido";
}): PurchaseVerdict {
  const { valuation, consistencyStatus, listingRisk } = options;
  const confLabel = confidenceLabel(valuation.confidence, valuation.origin);

  if (consistencyStatus === "invalid") {
    return {
      decision: "datos_incoherentes",
      label: "Datos incoherentes",
      tone: "red",
      summary:
        "La combinación marca / modelo / versión / combustible no es coherente. Corrige los datos antes de fiarte de precio, fiabilidad o preguntas técnicas.",
      confidenceLabel: "Muy baja",
      confidencePercent: Math.min(valuation.confidence, 15),
    };
  }

  if (valuation.origin !== "observed" || valuation.comparableCount < 3) {
    const base: PurchaseVerdict = {
      decision: "sin_datos",
      label: "Sin mercado comparable suficiente",
      tone: "neutral",
      summary:
        valuation.comparableCount === 0
          ? "No hay anuncios comparables reales. No inventamos un precio de mercado."
          : `Solo hay ${valuation.comparableCount} anuncio(s) comparable(s). La confianza es demasiado baja para decidir solo con el precio.`,
      priceLine: options.vehicle.advertisedPrice
        ? `Precio anunciado ${options.vehicle.advertisedPrice.toLocaleString("es-ES")} €`
        : undefined,
      marketLine: "Sin suficientes anuncios comparables",
      confidenceLabel: confLabel,
      confidencePercent: valuation.confidence,
    };
    if (listingRisk === "alto") {
      return {
        ...base,
        decision: "investigar_mas",
        label: "No compraría sin investigar más",
        tone: "red",
        summary: `${base.summary} Además, al anuncio le faltan datos críticos (historial, accidentes, ITV…).`,
      };
    }
    return base;
  }

  const mapped = fromPriceVerdict(valuation.verdict);
  let { decision, label, tone } = mapped;

  if (consistencyStatus === "suspicious" && tone === "green") {
    decision = "precaucion";
    label = "Compraría con precaución";
    tone = "orange";
  }
  if (listingRisk === "alto" && (tone === "green" || tone === "amber")) {
    decision = "precaucion";
    label = "Compraría con precaución";
    tone = "orange";
  }

  const marketLow = valuation.low;
  const marketHigh = valuation.high;
  const delta =
    valuation.percentDifference != null
      ? `${valuation.percentDifference >= 0 ? "+" : ""}${(valuation.percentDifference * 100).toFixed(1).replace(".", ",")} %`
      : undefined;

  return {
    decision,
    label,
    tone,
    summary: valuation.summary,
    priceLine: valuation.advertisedPrice
      ? `${valuation.advertisedPrice.toLocaleString("es-ES")} €`
      : undefined,
    marketLine:
      marketLow != null && marketHigh != null
        ? `${marketLow.toLocaleString("es-ES")}–${marketHigh.toLocaleString("es-ES")} €`
        : "Sin suficientes anuncios comparables",
    deltaLine: delta,
    confidenceLabel: confLabel,
    confidencePercent: valuation.confidence,
  };
}
