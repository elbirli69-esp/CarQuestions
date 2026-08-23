import type { Vehicle } from "@/types/vehicle";

export interface MissingDataItem {
  field: string;
  label: string;
  impactPercent: number;
  reason: string;
}

export interface MissingDataReport {
  completenessPercent: number;
  potentialGainPercent: number;
  headline: string;
  items: MissingDataItem[];
}

const IMPACT_FIELDS: Array<{
  key: keyof Vehicle;
  label: string;
  impactPercent: number;
  reason: string;
  present: (v: Vehicle) => boolean;
}> = [
  {
    key: "version",
    label: "Versión exacta",
    impactPercent: 18,
    reason: "Permite emparejar motorización y equipamiento con anuncios equivalentes.",
    present: (v) => Boolean(v.version?.trim()),
  },
  {
    key: "power",
    label: "Potencia (CV)",
    impactPercent: 14,
    reason: "Filtra comparables con el mismo motor y ajusta el precio.",
    present: (v) => v.power != null && v.power > 0,
  },
  {
    key: "transmission",
    label: "Tipo de cambio",
    impactPercent: 12,
    reason: "Manual vs automático cambia el precio de mercado de forma relevante.",
    present: (v) => Boolean(v.transmission),
  },
  {
    key: "equipment",
    label: "Equipamiento",
    impactPercent: 10,
    reason: "Paquetes y extras justifican diferencias de miles de euros.",
    present: (v) => Boolean(v.equipment?.trim()),
  },
  {
    key: "maintenanceHistory",
    label: "Historial de mantenimiento",
    impactPercent: 12,
    reason: "Reduce incertidumbre de riesgo y mejora la confianza de compra.",
    present: (v) => Boolean(v.maintenanceHistory?.trim()),
  },
  {
    key: "accidents",
    label: "Historial de accidentes",
    impactPercent: 10,
    reason: "Un siniestro no declarado invalida cualquier valoración.",
    present: (v) => Boolean(v.accidents?.trim()),
  },
  {
    key: "owners",
    label: "Número de propietarios",
    impactPercent: 6,
    reason: "Afecta a trazabilidad y a la percepción de mercado.",
    present: (v) => v.owners != null && v.owners > 0,
  },
  {
    key: "itv",
    label: "Estado de la ITV",
    impactPercent: 6,
    reason: "ITV caducada o con deficiencias es un freno de compra inmediato.",
    present: (v) => Boolean(v.itv?.trim()),
  },
  {
    key: "generalCondition",
    label: "Estado general",
    impactPercent: 6,
    reason: "Permite ajustar el precio por condición declarada.",
    present: (v) => Boolean(v.generalCondition) && v.generalCondition !== "unknown",
  },
  {
    key: "advertisedPrice",
    label: "Precio anunciado",
    impactPercent: 8,
    reason: "Sin precio no se puede decir si es caro o barato.",
    present: (v) => v.advertisedPrice != null && v.advertisedPrice > 0,
  },
  {
    key: "listingUrl",
    label: "URL del anuncio",
    impactPercent: 5,
    reason: "Permite contrastar ficha, fotos y descripción reales.",
    present: (v) => Boolean(v.listingUrl?.trim()),
  },
  {
    key: "serviceBook",
    label: "Libro de mantenimiento",
    impactPercent: 4,
    reason: "Señal positiva de trazabilidad si está sellado.",
    present: (v) => v.serviceBook === true,
  },
];

export function detectMissingData(vehicle: Vehicle): MissingDataReport {
  const missing = IMPACT_FIELDS.filter((f) => !f.present(vehicle)).map((f) => ({
    field: String(f.key),
    label: f.label,
    impactPercent: f.impactPercent,
    reason: f.reason,
  }));

  const presentImpact = IMPACT_FIELDS.filter((f) => f.present(vehicle)).reduce(
    (sum, f) => sum + f.impactPercent,
    0,
  );
  const totalImpact = IMPACT_FIELDS.reduce((sum, f) => sum + f.impactPercent, 0);
  const completenessPercent = Math.round((presentImpact / totalImpact) * 100);
  const potentialGainPercent = Math.min(
    45,
    missing.reduce((sum, item) => sum + item.impactPercent, 0),
  );

  const top = missing.sort((a, b) => b.impactPercent - a.impactPercent).slice(0, 6);

  const headline =
    top.length === 0
      ? "Los datos clave están cubiertos. La precisión depende ya del mercado y de la inspección."
      : `Puedes mejorar la valoración un ~${Math.max(15, Math.round(potentialGainPercent * 0.7))}–${potentialGainPercent} % completando estos datos.`;

  return {
    completenessPercent,
    potentialGainPercent,
    headline,
    items: top,
  };
}
