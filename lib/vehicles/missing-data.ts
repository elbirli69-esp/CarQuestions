import type { MissingDataReport } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

export function buildMissingDataReport(vehicle: Vehicle): MissingDataReport {
  const items = [
    !vehicle.version
      ? {
          field: "version",
          label: "Versión exacta",
          impactPercent: 12,
          reason: "Separa motorizaciones y evita mezclar mercados.",
        }
      : null,
    vehicle.power == null
      ? {
          field: "power",
          label: "Motor / potencia",
          impactPercent: 10,
          reason: "Los comparables cambian mucho entre 150 y 220 CV.",
        }
      : null,
    !vehicle.transmission
      ? {
          field: "transmission",
          label: "Cambio",
          impactPercent: 8,
          reason: "Manual y automático no se tasán igual.",
        }
      : null,
    !vehicle.equipment
      ? {
          field: "equipment",
          label: "Equipamiento",
          impactPercent: 6,
          reason: "Paquetes y extras mueven el precio.",
        }
      : null,
    !vehicle.maintenanceHistory
      ? {
          field: "maintenanceHistory",
          label: "Historial",
          impactPercent: 8,
          reason: "Sin facturas no se puede afinar riesgo ni precio.",
        }
      : null,
    !vehicle.accidents
      ? {
          field: "accidents",
          label: "Accidentes",
          impactPercent: 7,
          reason: "Un siniestro no siempre se ve en fotos.",
        }
      : null,
    !vehicle.itv
      ? {
          field: "itv",
          label: "ITV",
          impactPercent: 4,
          reason: "Una ITV caducada o con deficiencias cambia la negociación.",
        }
      : null,
    vehicle.owners == null
      ? {
          field: "owners",
          label: "Propietarios",
          impactPercent: 3,
          reason: "Más dueños suele bajar trazabilidad y precio.",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item != null);

  const potentialGainPercent = items.reduce((sum, item) => sum + item.impactPercent, 0);
  const completeness = Math.max(0, 100 - potentialGainPercent);
  const top = items.slice(0, 5);
  const message =
    top.length === 0
      ? "Los datos básicos están cubiertos. Sigue faltando inspección real y, si puedes, el VIN."
      : `Para mejorar la valoración necesito: ${top.map((item) => item.label.toLowerCase()).join(", ")}.`;

  return {
    completeness,
    potentialGainPercent,
    message:
      potentialGainPercent >= 20
        ? `Puedes mejorar la valoración un ${potentialGainPercent} %. ${message}`
        : message,
    items: top,
  };
}
