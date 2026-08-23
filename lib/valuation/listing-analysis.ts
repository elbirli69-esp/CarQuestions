import type { ListingAnalysis, PriceVerdict } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { indicatesAccident } from "@/lib/valuation/engine";

function priceLabel(verdict: PriceVerdict, originObserved: boolean, insufficient: boolean): string {
  if (!originObserved || insufficient) return "Sin mercado";
  if (verdict === "muy_barato" || verdict === "barato") return "Bueno";
  if (verdict === "precio_de_mercado" || verdict === "sin_precio") return "Normal";
  return "Alto";
}

const QUALITY_CHECKS: Array<{
  id: string;
  label: string;
  weight: number;
  ok: (v: Vehicle) => boolean;
}> = [
  { id: "price", label: "Precio", weight: 12, ok: (v) => v.advertisedPrice != null && v.advertisedPrice > 0 },
  { id: "mileage", label: "Kilometraje", weight: 10, ok: (v) => v.mileage >= 0 },
  { id: "history", label: "Historial de mantenimiento", weight: 12, ok: (v) => Boolean(v.maintenanceHistory?.trim()) },
  { id: "owners", label: "Propietarios", weight: 8, ok: (v) => v.owners != null && v.owners > 0 },
  { id: "itv", label: "ITV", weight: 10, ok: (v) => Boolean(v.itv?.trim()) },
  {
    id: "accidents",
    label: "Accidentes",
    weight: 12,
    ok: (v) => Boolean(v.accidents?.trim()),
  },
  { id: "vin", label: "VIN / URL de anuncio", weight: 8, ok: (v) => Boolean(v.listingUrl?.trim()) },
  {
    id: "photos",
    label: "Fotos (vía anuncio)",
    weight: 6,
    ok: (v) => Boolean(v.listingUrl?.trim()),
  },
  {
    id: "description",
    label: "Descripción",
    weight: 8,
    ok: (v) => Boolean(v.description?.trim() && v.description.trim().length > 40),
  },
  {
    id: "equipment",
    label: "Equipamiento",
    weight: 8,
    ok: (v) => Boolean(v.equipment?.trim()),
  },
  {
    id: "service",
    label: "Libro / mantenimiento",
    weight: 6,
    ok: (v) => v.serviceBook === true || Boolean(v.maintenanceHistory?.trim()),
  },
];

export function analyzeListing(
  vehicle: Vehicle,
  verdict: PriceVerdict,
  options?: { marketObserved?: boolean; insufficientMarket?: boolean; listingScraped?: boolean },
): ListingAnalysis {
  const marketObserved = options?.marketObserved ?? false;
  const insufficient = options?.insufficientMarket ?? false;
  const likes: string[] = [];
  const concerns: string[] = [];
  const missingFields: string[] = [];
  const inspectBeforeBuying = [
    "Probar el coche en caliente y en frío, incluyendo autovía si es posible.",
    "Revisar bajos, neumáticos, frenos y posibles fugas.",
    "Contrastar el kilometraje con el estado interior y las facturas.",
  ];

  let quality = 0;
  let maxQuality = 0;
  for (const check of QUALITY_CHECKS) {
    maxQuality += check.weight;
    if (check.ok(vehicle)) {
      quality += check.weight;
    } else {
      missingFields.push(check.label);
      concerns.push(`Falta: ${check.label}.`);
    }
  }
  const qualityScore = Math.round((quality / maxQuality) * 100);

  if (vehicle.serviceBook) likes.push("Indica que hay libro de mantenimiento.");
  if (vehicle.equipment) likes.push("Se ha detallado equipamiento.");
  if (marketObserved && !insufficient && (verdict === "barato" || verdict === "muy_barato")) {
    likes.push("El precio anunciado queda por debajo de la estimación con anuncios reales.");
  }
  if (vehicle.accidents && !indicatesAccident(vehicle.accidents)) {
    likes.push("Se declara ausencia de accidentes (hay que verificarlo).");
    // Remove false "Falta: Accidentes" concern if they filled it with a negation
    const idx = concerns.findIndex((c) => c.includes("Accidentes"));
    if (idx >= 0) concerns.splice(idx, 1);
    const mIdx = missingFields.indexOf("Accidentes");
    if (mIdx >= 0) missingFields.splice(mIdx, 1);
  } else if (vehicle.accidents && indicatesAccident(vehicle.accidents)) {
    concerns.push("Se ha indicado un accidente o reparación: exige documentación.");
  }

  if (vehicle.listingUrl) {
    if (options?.listingScraped) {
      likes.push("URL de anuncio scrapeada: se contrastaron datos de la ficha.");
    } else {
      likes.push("Hay URL de anuncio (útil para contrastar; el scrape puede fallar por antibot).");
    }
  }

  const filledDesc = [vehicle.description, vehicle.equipment, vehicle.maintenanceHistory, vehicle.accidents].filter(
    Boolean,
  ).length;
  const description = filledDesc >= 3 ? "Completa" : filledDesc >= 1 ? "Normal" : "Escasa";
  const equipment =
    vehicle.equipment && vehicle.equipment.length > 40 ? "Alto" : vehicle.equipment ? "Medio" : "Desconocido";

  const risk: ListingAnalysis["risk"] =
    missingFields.length >= 5
      ? "alto"
      : missingFields.length >= 3
        ? "medio"
        : indicatesAccident(vehicle.accidents ?? "")
          ? "medio"
          : missingFields.length === 0
            ? "bajo"
            : "medio";

  const limitations: string[] = [
    "La calidad del anuncio mide completitud de información, no el estado real del coche.",
    "No sustituye inspección mecánica ni informe de bastidor.",
  ];

  return {
    available: true,
    qualityScore,
    price: priceLabel(verdict, marketObserved, insufficient),
    vehicle: "Pendiente de inspección",
    description,
    equipment,
    risk,
    likes: likes.length > 0 ? likes : ["Los datos básicos del vehículo están cubiertos."],
    concerns,
    askSeller: [
      vehicle.listingUrl
        ? "Confirma en el anuncio bastidor, facturas e ITV antes de desplazarte."
        : "Pedir fotos adicionales, número de bastidor y facturas antes de desplazarte.",
    ],
    inspectBeforeBuying,
    missingFields,
    limitations,
  };
}
