import type { VehicleListing } from "@/types/listing";
import type {
  PriceAdjustment,
  PriceDistribution,
  PriceVerdict,
  ValuationResult,
} from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { average, clamp, percentile, roundTo } from "@/lib/utils/math";

const VERDICT_LABELS: Record<PriceVerdict, string> = {
  muy_barato: "Muy barato",
  barato: "Buen precio",
  precio_de_mercado: "Precio de mercado",
  caro: "Caro",
  muy_caro: "Muy caro",
  sin_precio: "Sin precio anunciado",
};

function distributionFrom(prices: number[]): PriceDistribution {
  const sorted = [...prices].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    p25: roundTo(percentile(sorted, 0.25), 50),
    median: roundTo(percentile(sorted, 0.5), 50),
    p75: roundTo(percentile(sorted, 0.75), 50),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function verdictFromDelta(delta: number): PriceVerdict {
  if (delta <= -0.12) return "muy_barato";
  if (delta <= -0.04) return "barato";
  if (delta <= 0.04) return "precio_de_mercado";
  if (delta <= 0.12) return "caro";
  return "muy_caro";
}

function conditionAdjustment(vehicle: Vehicle): PriceAdjustment | null {
  const condition = vehicle.generalCondition;
  if (!condition || condition === "unknown") return null;
  const amount =
    condition === "excellent" ? 600 : condition === "good" ? 250 : condition === "fair" ? -400 : -900;
  return {
    label: "Estado general",
    amount,
    reason: `Ajuste por estado declarado: ${condition}.`,
    origin: "observed",
    applied: true,
  };
}

export function valueVehicle(vehicle: Vehicle, listings: VehicleListing[]): ValuationResult {
  const priced = listings.filter((listing) => typeof listing.price === "number" && listing.price > 0);
  const prices = priced.map((listing) => listing.price as number);
  const limitations: string[] = [];

  if (prices.length < 5) {
    limitations.push("Hay pocos comparables. El intervalo de precio es orientativo y de baja confianza.");
  }

  const distribution = distributionFrom(prices);
  const comparableMileage = average(priced.map((listing) => listing.mileage).filter((value): value is number => typeof value === "number"));
  const comparableYear = average(priced.map((listing) => listing.year).filter((value): value is number => typeof value === "number"));

  const adjustments: PriceAdjustment[] = [];
  let estimated = distribution.median || 0;

  if (comparableMileage != null) {
    const amount = roundTo((comparableMileage - vehicle.mileage) * 0.05, 10);
    if (Math.abs(amount) >= 50) {
      adjustments.push({
        label: "Kilometraje",
        amount,
        reason:
          amount < 0
            ? "Este coche tiene más kilómetros que la media de los comparables."
            : "Este coche tiene menos kilómetros que la media de los comparables.",
        origin: "observed",
        applied: true,
      });
    }
  }

  if (comparableYear != null) {
    const amount = roundTo((vehicle.year - comparableYear) * 550, 10);
    if (Math.abs(amount) >= 50) {
      adjustments.push({
        label: "Antigüedad",
        amount,
        reason:
          amount < 0
            ? "Es algo más antiguo que la media de los anuncios comparables."
            : "Es algo más reciente que la media de los anuncios comparables.",
        origin: "observed",
        applied: true,
      });
    }
  }

  const condition = conditionAdjustment(vehicle);
  if (condition) adjustments.push(condition);

  if (vehicle.serviceBook) {
    adjustments.push({
      label: "Libro de mantenimiento",
      amount: 300,
      reason: "El usuario indica que existe libro de mantenimiento.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.maintenanceHistory && /completo|oficial|facturas/i.test(vehicle.maintenanceHistory)) {
    adjustments.push({
      label: "Historial de mantenimiento",
      amount: 300,
      reason: "El historial descrito sugiere mantenimiento documentado.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.accidents && /si|golpe|siniestro|repar/i.test(vehicle.accidents)) {
    adjustments.push({
      label: "Accidentes",
      amount: -700,
      reason: "El usuario ha indicado un posible accidente o reparación. Hay que contrastarlo; no se asume la gravedad.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.equipment && vehicle.equipment.length > 40) {
    adjustments.push({
      label: "Equipamiento",
      amount: 450,
      reason: "Se ha descrito un equipamiento amplio. El ajuste es aproximado hasta tener una lista normalizada.",
      origin: "observed",
      applied: true,
    });
  }

  if (vehicle.owners && vehicle.owners >= 3) {
    adjustments.push({
      label: "Número de propietarios",
      amount: -250,
      reason: `Consta de ${vehicle.owners} propietarios, por encima de lo habitual en este tipo de anuncio.`,
      origin: "observed",
      applied: true,
    });
  }

  if (!vehicle.power) {
    limitations.push("No se ha indicado la potencia. No se ajusta el precio por motor.");
  }
  if (!vehicle.transmission) {
    limitations.push("No se ha indicado el tipo de cambio. Los comparables se han generado con esa incertidumbre.");
  }

  for (const adjustment of adjustments) {
    estimated += adjustment.amount;
  }

  estimated = roundTo(clamp(estimated, distribution.min || estimated, distribution.max || estimated + 4000), 50);
  const spread = Math.max(800, roundTo(estimated * 0.045, 50));
  const low = roundTo(estimated - spread, 50);
  const high = roundTo(estimated + spread, 50);

  const advertisedPrice = vehicle.advertisedPrice;
  const percentDifference =
    advertisedPrice && estimated ? (advertisedPrice - estimated) / estimated : undefined;
  const verdict =
    percentDifference == null ? "sin_precio" : verdictFromDelta(percentDifference);

  const completeness =
    [
      vehicle.power,
      vehicle.transmission,
      vehicle.bodyType,
      vehicle.location,
      vehicle.generalCondition,
      vehicle.equipment,
    ].filter(Boolean).length / 6;

  const confidence = Math.round(
    clamp(38 + priced.length * 1.6 + completeness * 18, 40, 92),
  );

  const sourceCount = new Set(priced.map((listing) => listing.source)).size;
  const summary =
    percentDifference == null
      ? "No hay precio anunciado, así que solo se estima el intervalo de mercado a partir de comparables."
      : percentDifference < 0
        ? `Está aproximadamente un ${Math.abs(percentDifference * 100).toFixed(1).replace(".", ",")} % por debajo del valor estimado de mercado.`
        : percentDifference > 0
          ? `Está aproximadamente un ${(percentDifference * 100).toFixed(1).replace(".", ",")} % por encima del valor estimado de mercado.`
          : "Coincide con el valor estimado de mercado.";

  limitations.push(
    "Los comparables actuales son de demostración. Cuando se conecten portales reales, el mismo motor usará anuncios observados.",
  );

  return {
    estimatedPrice: estimated,
    advertisedPrice,
    low,
    high,
    percentDifference,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    summary,
    confidence,
    distribution,
    adjustments,
    comparableCount: priced.length,
    sourceCount,
    dataUpdatedAt: new Date().toISOString(),
    origin: "demo_model",
    methodology: [
      "Se buscan anuncios comparables del mismo modelo, año próximo, combustible y cambio.",
      "Se calcula la distribución de precios: mínimo, percentil 25, mediana, percentil 75 y máximo.",
      "El valor base es la mediana observada en esos comparables.",
      "Se aplican ajustes cuantitativos solo cuando el usuario ha aportado el dato (km, año, estado, historial, etc.).",
      "Los ajustes de IA, si existieran, se mostrarían aparte. En este MVP no se inventan.",
    ],
    limitations,
  };
}
