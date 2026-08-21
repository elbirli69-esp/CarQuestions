import type { KnownIssue, MaintenanceSummary, ReliabilitySummary } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { normalizeKey } from "@/lib/utils/math";

interface KnowledgeEntry {
  brands: string[];
  models?: string[];
  fuels?: string[];
  yearFrom?: number;
  yearTo?: number;
  reliabilityScore: number;
  maintenanceNotes: string[];
  upcoming: string[];
  yearlyCost?: number;
  issues: KnownIssue[];
}

const DEMO_KNOWLEDGE: KnowledgeEntry[] = [
  {
    brands: ["bmw"],
    models: ["x1", "x3", "serie 1", "serie 2", "serie 3", "118d", "120d", "318d", "320d"],
    fuels: ["diesel"],
    yearFrom: 2014,
    yearTo: 2020,
    reliabilityScore: 74,
    maintenanceNotes: [
      "Los diésel BMW de esta época pueden requerir atención al sistema de distribución, EGR y FAP.",
      "El mantenimiento oficial suele ser más caro que en marcas generalistas.",
    ],
    upcoming: [
      "Revisar historial de cadena de distribución / tensores si el motor es N47 o B47.",
      "Comprobar regeneraciones del FAP y posibles fugas de AdBlue.",
    ],
    yearlyCost: 850,
    issues: [
      {
        title: "Cadena de distribución (motores N47/B47)",
        detail:
          "Algunos diésel BMW de esta generación acumularon quejas por desgaste prematuro de la cadena o tensores. No implica que este coche lo tenga: hay que verificar historial y ruidos en frío.",
        severity: "high",
        appliesWhen: "Diésel BMW ~2014-2020",
        source: "Base de conocimiento de demostración",
        isDemo: true,
      },
      {
        title: "EGR / FAP en uso urbano",
        detail:
          "Si el coche ha hecho muchos kilómetros cortos, EGR y filtro de partículas pueden ensuciarse antes de lo esperado.",
        severity: "medium",
        appliesWhen: "Diésel usado sobre todo en ciudad",
        source: "Base de conocimiento de demostración",
        isDemo: true,
      },
    ],
  },
  {
    brands: ["volkswagen", "vw", "seat", "skoda", "audi"],
    fuels: ["diesel"],
    yearFrom: 2012,
    yearTo: 2019,
    reliabilityScore: 76,
    maintenanceNotes: [
      "Grupo VAG diésel: conviene confirmar estado de volante bimasa, inyector y FAP.",
    ],
    upcoming: ["Kit de distribución si el motor es por correa y se acerca al intervalo."],
    yearlyCost: 650,
    issues: [
      {
        title: "Volante bimasa y Dual Mass",
        detail:
          "En diésel del grupo VAG con muchos km pueden aparecer vibraciones al ralenti por desgaste del volante bimasa.",
        severity: "medium",
        appliesWhen: "Diésel VAG con kilometraje medio-alto",
        source: "Base de conocimiento de demostración",
        isDemo: true,
      },
    ],
  },
  {
    brands: ["toyota", "lexus"],
    fuels: ["hybrid", "petrol"],
    reliabilityScore: 88,
    maintenanceNotes: [
      "Los híbridos Toyota suelen destacar en fiabilidad si el mantenimiento de batería híbrida y frenos es correcto.",
    ],
    upcoming: ["Revisión del sistema híbrido y del estado de la batería de alta tensión."],
    yearlyCost: 450,
    issues: [
      {
        title: "Desgaste de frenos irregular en híbridos",
        detail:
          "La regeneración reduce el uso de pastillas, pero discos y pinzas pueden oxidarse si el coche se usa poco.",
        severity: "low",
        appliesWhen: "Híbridos con uso mixto o escaso",
        source: "Base de conocimiento de demostración",
        isDemo: true,
      },
    ],
  },
  {
    brands: ["mercedes", "mercedes-benz", "mercedes benz"],
    fuels: ["diesel"],
    yearFrom: 2015,
    yearTo: 2021,
    reliabilityScore: 72,
    maintenanceNotes: [
      "Los diésel Mercedes de esta época pueden tener costes de mantenimiento elevados, especialmente en cambio automático.",
    ],
    upcoming: [
      "Preguntar por el mantenimiento de la caja automática (cambio de aceite y filtro).",
    ],
    yearlyCost: 950,
    issues: [
      {
        title: "Mantenimiento de caja automática",
        detail:
          "Algunos cambios automáticos requieren aceite periódico. Si no hay facturas, el riesgo de avería cara aumenta.",
        severity: "medium",
        appliesWhen: "Automático Mercedes sin historial de caja",
        source: "Base de conocimiento de demostración",
        isDemo: true,
      },
    ],
  },
];

function matchesEntry(vehicle: Vehicle, entry: KnowledgeEntry): boolean {
  const brand = normalizeKey(vehicle.brand);
  const model = normalizeKey(vehicle.model);
  const brandOk = entry.brands.some((item) => {
    const key = normalizeKey(item);
    return brand.includes(key) || key.includes(brand);
  });
  if (!brandOk) return false;

  if (entry.models && entry.models.length > 0) {
    const modelOk = entry.models.some((item) => {
      const key = normalizeKey(item);
      return model === key || model.includes(key) || key.includes(model);
    });
    if (!modelOk) return false;
  }

  if (entry.fuels && !entry.fuels.includes(vehicle.fuel)) return false;
  if (entry.yearFrom && vehicle.year < entry.yearFrom) return false;
  if (entry.yearTo && vehicle.year > entry.yearTo) return false;
  return true;
}

export function lookupKnowledge(vehicle: Vehicle): {
  reliability: ReliabilitySummary;
  maintenance: MaintenanceSummary;
} {
  const entry = DEMO_KNOWLEDGE.find((item) => matchesEntry(vehicle, item));

  if (!entry) {
    return {
      reliability: {
        available: false,
        score: null,
        notes: [
          "No hay una ficha de fiabilidad suficientemente específica para este vehículo en la base de demostración.",
        ],
        knownIssues: [],
        isDemo: true,
        source: "Base de conocimiento de demostración",
      },
      maintenance: {
        available: false,
        notes: [
          "Sin ficha de mantenimiento específica. No se estima un coste anual para no inventar cifras.",
        ],
        upcoming: [],
        isDemo: true,
        source: "Base de conocimiento de demostración",
      },
    };
  }

  return {
    reliability: {
      available: true,
      score: entry.reliabilityScore,
      notes: entry.maintenanceNotes,
      knownIssues: entry.issues,
      isDemo: true,
      source: "Base de conocimiento de demostración",
    },
    maintenance: {
      available: true,
      notes: entry.maintenanceNotes,
      upcoming: entry.upcoming,
      estimatedYearlyCost: entry.yearlyCost,
      isDemo: true,
      source: "Base de conocimiento de demostración",
    },
  };
}
