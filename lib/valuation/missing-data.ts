import type { MissingDataItem, MissingDataReport } from "@/types/analysis";
import type { VehicleIdentity } from "@/types/identity";
import type { MarketValuation } from "@/types/market";
import type { Vehicle } from "@/types/vehicle";
import { hasHighVoltageBattery } from "@/lib/vehicles/identity/taxonomy";

/**
 * Qué falta y cuánto mejoraría el análisis (FASE 14).
 *
 * Sustituye el "completitud 17 %" anterior, que informaba de un problema sin
 * decir qué hacer. Aquí cada hueco lleva su impacto y el motivo.
 */
export function detectMissingData(
  vehicle: Vehicle,
  identity: VehicleIdentity,
  market: MarketValuation,
): MissingDataReport {
  const items: MissingDataItem[] = [];

  if (!vehicle.version) {
    items.push({
      field: "version",
      label: "Versión exacta",
      impact: 10,
      why: "Es lo que más separa precios dentro del mismo modelo: define acabado, motor y equipamiento de serie.",
    });
  }

  if (vehicle.power == null) {
    items.push({
      field: "power",
      label: "Potencia (CV)",
      impact: 9,
      why: "Sin potencia mezclamos motorizaciones distintas al buscar comparables, y eso desplaza la mediana.",
    });
  }

  if (!vehicle.transmission) {
    items.push({
      field: "transmission",
      label: "Tipo de cambio",
      impact: 7,
      why: "Un automático suele valer bastante más que el mismo coche en manual.",
    });
  }

  if (vehicle.advertisedPrice == null) {
    items.push({
      field: "advertisedPrice",
      label: "Precio del anuncio",
      impact: 10,
      why: "Sin precio podemos decirte cuánto vale un coche así, pero no si este en concreto interesa.",
    });
  }

  if (!vehicle.maintenanceHistory && !vehicle.serviceBook) {
    items.push({
      field: "maintenanceHistory",
      label: "Historial de mantenimiento",
      impact: 8,
      why: "Es el dato que más reduce el riesgo de una avería cara a corto plazo.",
    });
  }

  if (!vehicle.accidents) {
    items.push({
      field: "accidents",
      label: "Accidentes o reparaciones",
      impact: 7,
      why: "Un siniestro estructural cambia seguridad, valor de reventa y a veces el seguro.",
    });
  }

  if (!vehicle.itv) {
    items.push({
      field: "itv",
      label: "Estado de la ITV",
      impact: 5,
      why: "Una ITV próxima a caducar o con defectos previos es coste inmediato.",
    });
  }

  if (!vehicle.equipment) {
    items.push({
      field: "equipment",
      label: "Equipamiento",
      impact: 4,
      why: "Los extras de fábrica pueden suponer varios miles de euros de diferencia.",
    });
  }

  if (vehicle.owners == null) {
    items.push({
      field: "owners",
      label: "Número de propietarios",
      impact: 3,
      why: "Ayuda a interpretar el kilometraje y el tipo de uso que ha tenido.",
    });
  }

  if (hasHighVoltageBattery(identity.canonical.powertrain.value)) {
    items.push({
      field: "batteryHealth",
      label: "Salud de la batería (SOH)",
      impact: 9,
      why: "En un electrificado la batería es el componente más caro: su estado condiciona el precio más que los kilómetros.",
    });
  }

  if (!vehicle.listingUrl) {
    items.push({
      field: "listingUrl",
      label: "URL del anuncio",
      impact: 4,
      why: "Con el enlace podemos leer la ficha y contrastar los datos en lugar de fiarnos solo del formulario.",
    });
  }

  items.sort((a, b) => b.impact - a.impact);

  const top = items.slice(0, 5);
  const totalImpact = top.reduce((sum, item) => sum + item.impact, 0);

  // La mejora se expresa como rango ancho a propósito: es una estimación de
  // cuánto se estrecharía el análisis, no una medida.
  const improvementRange =
    totalImpact >= 8
      ? { min: Math.min(45, Math.round(totalImpact * 1.2)), max: Math.min(70, Math.round(totalImpact * 2)) }
      : null;

  const summary = (() => {
    if (top.length === 0) {
      return "Has aportado todo lo relevante. El análisis está tan afinado como permiten los datos disponibles.";
    }
    if (market.status !== "observed") {
      return `Faltan ${top.length} datos importantes, pero ahora mismo el mayor limitante es que no hay anuncios comparables.`;
    }
    return improvementRange
      ? `Completando estos datos el análisis podría afinarse entre un ${improvementRange.min} y un ${improvementRange.max} %.`
      : "Quedan detalles menores por completar; el análisis ya es razonablemente sólido.";
  })();

  return { items: top, improvementRange, summary };
}
