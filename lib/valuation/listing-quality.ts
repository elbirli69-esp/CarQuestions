import type { ListingQuality, ListingQualityCriterion } from "@/types/analysis";
import type { MarketValuation } from "@/types/market";
import type { Vehicle } from "@/types/vehicle";

interface CriterionSpec {
  id: string;
  label: string;
  weight: number;
  present: boolean;
  whenPresent: string;
  whenMissing: string;
}

/**
 * Calidad de la información disponible sobre el anuncio (FASE 11).
 *
 * No puntúa el coche: puntúa cuánto sabes de él. Un 40/100 no significa que el
 * coche sea malo, significa que estarías comprando a ciegas.
 */
export function assessListingQuality(
  vehicle: Vehicle,
  market: MarketValuation,
): ListingQuality {
  const hasEquipment = Boolean(vehicle.equipment && vehicle.equipment.trim().length > 15);
  const hasDescription = Boolean(vehicle.description && vehicle.description.trim().length > 80);

  const specs: CriterionSpec[] = [
    {
      id: "price",
      label: "Precio",
      weight: 12,
      present: vehicle.advertisedPrice != null,
      whenPresent: `Precio anunciado: ${vehicle.advertisedPrice?.toLocaleString("es-ES")} €.`,
      whenMissing: "Sin precio no se puede valorar si la operación interesa.",
    },
    {
      id: "mileage",
      label: "Kilometraje",
      weight: 10,
      present: vehicle.mileage > 0,
      whenPresent: `${vehicle.mileage.toLocaleString("es-ES")} km declarados.`,
      whenMissing: "Falta el kilometraje, el dato que más mueve el precio.",
    },
    {
      id: "version",
      label: "Versión y motor",
      weight: 12,
      present: Boolean(vehicle.version) && vehicle.power != null,
      whenPresent: `${vehicle.version ?? ""}${vehicle.power ? ` · ${vehicle.power} CV` : ""}.`,
      whenMissing: "Sin versión y potencia exactas no se puede comparar contra el acabado correcto.",
    },
    {
      id: "history",
      label: "Historial de mantenimiento",
      weight: 14,
      present: Boolean(vehicle.maintenanceHistory) || vehicle.serviceBook === true,
      whenPresent: "El anuncio o tus datos mencionan historial de mantenimiento.",
      whenMissing: "No consta historial. Es lo primero que hay que exigir.",
    },
    {
      id: "owners",
      label: "Propietarios",
      weight: 6,
      present: vehicle.owners != null,
      whenPresent: `${vehicle.owners} propietario(s).`,
      whenMissing: "No consta el número de propietarios.",
    },
    {
      id: "itv",
      label: "ITV",
      weight: 8,
      present: Boolean(vehicle.itv),
      whenPresent: `ITV: ${vehicle.itv}.`,
      whenMissing: "No consta el estado ni la caducidad de la ITV.",
    },
    {
      id: "accidents",
      label: "Accidentes",
      weight: 12,
      present: Boolean(vehicle.accidents),
      whenPresent: "El vendedor se ha pronunciado sobre siniestros.",
      whenMissing: "Nadie ha dicho si ha tenido golpes. El silencio no es un 'no'.",
    },
    {
      id: "vin",
      label: "Bastidor (VIN)",
      weight: 8,
      present: false,
      whenPresent: "VIN disponible para pedir informe oficial.",
      whenMissing: "No hay VIN, así que no se puede pedir el informe de la DGT ni verificar cargas.",
    },
    {
      id: "listing-url",
      label: "Anuncio original",
      weight: 4,
      present: Boolean(vehicle.listingUrl),
      whenPresent: "Hay URL del anuncio para contrastar los datos.",
      whenMissing: "Sin URL del anuncio solo tenemos lo que has escrito tú.",
    },
    {
      id: "description",
      label: "Descripción",
      weight: 5,
      present: hasDescription,
      whenPresent: "La descripción tiene detalle suficiente.",
      whenMissing: "La descripción es escasa o inexistente.",
    },
    {
      id: "equipment",
      label: "Equipamiento",
      weight: 5,
      present: hasEquipment,
      whenPresent: "El equipamiento está detallado.",
      whenMissing: "No hay lista de equipamiento, que puede valer varios miles de euros.",
    },
    {
      id: "condition",
      label: "Estado declarado",
      weight: 4,
      present: Boolean(vehicle.generalCondition && vehicle.generalCondition !== "unknown"),
      whenPresent: `Estado declarado: ${vehicle.generalCondition}.`,
      whenMissing: "Nadie ha declarado el estado general.",
    },
  ];

  const criteria: ListingQualityCriterion[] = specs.map((spec) => ({
    id: spec.id,
    label: spec.label,
    present: spec.present,
    weight: spec.weight,
    detail: spec.present ? spec.whenPresent : spec.whenMissing,
  }));

  const totalWeight = specs.reduce((sum, spec) => sum + spec.weight, 0);
  const earned = specs.filter((spec) => spec.present).reduce((sum, spec) => sum + spec.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);

  const level: ListingQuality["level"] =
    score >= 80 ? "excelente" : score >= 60 ? "buena" : score >= 38 ? "mejorable" : "pobre";

  const missing = specs
    .filter((spec) => !spec.present)
    .sort((a, b) => b.weight - a.weight)
    .map((spec) => `${spec.label}: ${spec.whenMissing}`);

  const marketNote =
    market.status === "observed"
      ? ""
      : " Además, no hay anuncios comparables para contrastar lo que dice.";

  const summary =
    level === "excelente"
      ? `Sabes prácticamente todo lo que se puede saber sin ver el coche.${marketNote}`
      : level === "buena"
        ? `Tienes lo esencial, pero quedan huecos que conviene cerrar antes de ir.${marketNote}`
        : level === "mejorable"
          ? `Falta información importante. Pregúntala antes de desplazarte.${marketNote}`
          : `Estarías comprando prácticamente a ciegas: faltan los datos que definen el riesgo.${marketNote}`;

  return { score, level, summary, criteria, missing };
}
