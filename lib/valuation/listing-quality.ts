import type { ListingQuality } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

const CHECKS: Array<{ id: string; label: string; weight: number; present: (vehicle: Vehicle) => boolean }> = [
  { id: "price", label: "Precio", weight: 12, present: (v) => v.advertisedPrice != null },
  { id: "mileage", label: "Kilometraje", weight: 10, present: (v) => v.mileage > 0 },
  { id: "history", label: "Historial de mantenimiento", weight: 12, present: (v) => Boolean(v.maintenanceHistory) },
  { id: "owners", label: "Número de propietarios", weight: 8, present: (v) => v.owners != null },
  { id: "itv", label: "ITV", weight: 10, present: (v) => Boolean(v.itv) },
  { id: "accidents", label: "Accidentes / siniestros", weight: 12, present: (v) => Boolean(v.accidents) },
  { id: "vin", label: "VIN / bastidor", weight: 8, present: (v) => /vin|bastidor|[A-HJ-NPR-Z0-9]{11,}/i.test(`${v.description ?? ""} ${v.equipment ?? ""}`) },
  { id: "photos", label: "Fotos / URL de anuncio", weight: 6, present: (v) => Boolean(v.listingUrl) },
  { id: "description", label: "Descripción", weight: 6, present: (v) => Boolean(v.description && v.description.length > 40) },
  { id: "equipment", label: "Equipamiento", weight: 6, present: (v) => Boolean(v.equipment && v.equipment.length > 12) },
  { id: "service", label: "Libro o facturas", weight: 6, present: (v) => Boolean(v.serviceBook || (v.maintenanceHistory && /factura|libro/i.test(v.maintenanceHistory))) },
  { id: "warranty", label: "Garantía", weight: 4, present: (v) => /garant/i.test(`${v.description ?? ""} ${v.extras ?? ""} ${v.equipment ?? ""}`) },
];

export function scoreListingQuality(vehicle: Vehicle): ListingQuality {
  const present: ListingQuality["present"] = [];
  const missing: ListingQuality["missing"] = [];
  let score = 0;

  for (const check of CHECKS) {
    if (check.present(vehicle)) {
      present.push({ id: check.id, label: check.label });
      score += check.weight;
    } else {
      missing.push({ id: check.id, label: check.label, weight: check.weight });
    }
  }

  return {
    score,
    present,
    missing,
    summary:
      score >= 75
        ? "El anuncio/formulario cubre lo esencial para decidir si merece la visita."
        : missing.length > 0
          ? `Calidad de la información ${score}/100. Falta: ${missing
              .slice(0, 4)
              .map((item) => item.label)
              .join(", ")}.`
          : `Calidad de la información ${score}/100.`,
  };
}
