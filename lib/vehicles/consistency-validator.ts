import type { ValidationIssue, VehicleValidationResult } from "@/types/vehicle-validation";
import type { FuelType, Vehicle, VehicleInput } from "@/types/vehicle";
import { findBrandByName, findModelInBrand, resolveCatalogSelection } from "@/lib/vehicles/catalog";
import { normalizeKey } from "@/lib/utils/math";

/** Patrones de versión/motorización asociados a marcas concretas. */
const VERSION_BRAND_PATTERNS: Array<{ brands: string[]; patterns: RegExp; label: string }> = [
  {
    brands: ["bmw", "mini"],
    patterns: /(?:^|[\s(])(sdrive|xdrive|edrive|ddrive)\d*\w*/i,
    label: "BMW/MINI (sDrive, xDrive, iX, etc.)",
  },
  {
    brands: ["bmw", "mini"],
    patterns: /\b(m\d{2,3}|b\d{2,3}|i[x\d][\w]*)\b/i,
    label: "BMW/MINI (M, iX, etc.)",
  },
  {
    brands: ["mercedes", "mercedes-benz"],
    patterns: /\b(cdi|bluetec|eq[a-z]?\d*|amg\s*\d|4matic|d\s*\d{3})\b/i,
    label: "Mercedes (CDI, EQ, AMG, 4MATIC…)",
  },
  {
    brands: ["audi"],
    patterns: /\b(tdi|tfsi|tdi|etron|quattro|s\s*line|rs\s*\d)\b/i,
    label: "Audi (TDI, TFSI, e-tron, quattro…)",
  },
  {
    brands: ["volkswagen", "vw", "seat", "skoda", "cupra"],
    patterns: /\b(tdi|tsi|tfsi|gtd|gti|r\s*\d{2,3}|4motion|dsg)\b/i,
    label: "Grupo VAG (TDI, TSI, GTI, DSG…)",
  },
  {
    brands: ["renault", "dacia"],
    patterns: /\b(dci|tce|e-tech|edc)\b/i,
    label: "Renault/Dacia (dCi, TCe, E-Tech…)",
  },
  {
    brands: ["peugeot", "citroen", "citroën", "ds", "opel"],
    patterns: /\b(hdi|bluehdi|puretech|e-?\d{3,4}|eat\d)\b/i,
    label: "Stellantis/PSA (HDi, PureTech, e-…)",
  },
  {
    brands: ["ford"],
    patterns: /\b(ecoboost|ecoblue|tdci|puma\s*ecoboost)\b/i,
    label: "Ford (EcoBoost, TDCi…)",
  },
  {
    brands: ["toyota", "lexus"],
    patterns: /\b(hybrid|h\s*\d|d-4d|vvt-i|e-four)\b/i,
    label: "Toyota/Lexus",
  },
  {
    brands: ["tesla"],
    patterns: /\b(performance|long\s*range|standard\s*range|plaid|dual\s*motor)\b/i,
    label: "Tesla",
  },
];

const FUEL_POWER_RANGES: Record<FuelType, { min: number; max: number }> = {
  diesel: { min: 60, max: 450 },
  petrol: { min: 50, max: 700 },
  hybrid: { min: 70, max: 400 },
  plugin_hybrid: { min: 80, max: 450 },
  electric: { min: 40, max: 1100 },
  lpg: { min: 60, max: 300 },
  cng: { min: 60, max: 200 },
  other: { min: 40, max: 800 },
};

const ICE_FUELS: FuelType[] = ["diesel", "petrol", "lpg", "cng"];
const EV_FUELS: FuelType[] = ["electric"];
const ELECTRIFIED_FUELS: FuelType[] = ["electric", "hybrid", "plugin_hybrid"];

function brandKey(brand: string): string {
  return normalizeKey(brand);
}

function versionImpliesFuel(version: string): FuelType | null {
  const v = version.toLowerCase();
  if (/\b(e-tron|eq[a-z]?\d|ev\b|electric|bev|i[x\d]|e\d{2,3}|long\s*range)\b/.test(v)) return "electric";
  if (/\b(phev|plugin|enchufable|tfsi\s*e|gte|e-hybrid|e-tech)\b/.test(v)) return "plugin_hybrid";
  if (/\b(hybrid|mhev|hev)\b/.test(v)) return "hybrid";
  if (/\b(tdi|dci|hdi|bluehdi|tdci|ecoblue|cdi|bluetec|d\s*\d{3}|\d+d\b|sdrive\d+d|xdrive\d+d)\b/.test(v)) return "diesel";
  if (/\b(tsi|tfsi|tce|puretech|ecoboost|mpi|gdi|sdrive\d+i|xdrive\d+i)\b/.test(v)) return "petrol";
  return null;
}

const EV_ONLY_BRANDS = ["tesla", "nio", "xpeng", "lucid", "rivian", "polestar"];

function brandImpliesFuel(brand: string): FuelType[] | null {
  const key = brandKey(brand);
  if (EV_ONLY_BRANDS.some((b) => key.includes(b))) {
    return ["electric"];
  }
  return null;
}

function pushIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

export function validateVehicleConsistency(vehicle: VehicleInput | Vehicle): VehicleValidationResult {
  const issues: ValidationIssue[] = [];
  const catalog = resolveCatalogSelection(vehicle.brand, vehicle.model);
  const brandFound = Boolean(catalog.brand);
  const modelFound = Boolean(catalog.model);

  if (!brandFound) {
    pushIssue(issues, {
      code: "brand_unknown",
      severity: "warning",
      field: "brand",
      message: `La marca "${vehicle.brand}" no está en el catálogo. No podemos validar coherencia marca-modelo.`,
    });
  }

  if (brandFound && !modelFound) {
    pushIssue(issues, {
      code: "model_unknown",
      severity: "warning",
      field: "model",
      message: `El modelo "${vehicle.model}" no aparece bajo ${vehicle.brand} en el catálogo.`,
    });
  }

  const version = vehicle.version?.trim() ?? "";
  if (version) {
    const ownerBrand = brandKey(vehicle.brand);
    for (const rule of VERSION_BRAND_PATTERNS) {
      if (!rule.patterns.test(version)) continue;
      const matchesOwner = rule.brands.some((b) => ownerBrand.includes(b) || b.includes(ownerBrand));
      if (!matchesOwner) {
        pushIssue(issues, {
          code: "version_brand_mismatch",
          severity: "error",
          field: "version",
          message: `La versión "${version}" parece de ${rule.label}, no de ${vehicle.brand} ${vehicle.model}.`,
        });
      }
    }
  }

  if (version && vehicle.fuel) {
    const impliedFuel = versionImpliesFuel(version);
    if (impliedFuel && impliedFuel !== vehicle.fuel) {
      pushIssue(issues, {
        code: "version_fuel_mismatch",
        severity: "error",
        field: "fuel",
        message: `La versión "${version}" sugiere combustible ${impliedFuel}, pero has indicado ${vehicle.fuel}.`,
      });
    }
  }

  const brandFuels = brandImpliesFuel(vehicle.brand);
  if (brandFuels && vehicle.fuel && !brandFuels.includes(vehicle.fuel)) {
    pushIssue(issues, {
      code: "brand_fuel_mismatch",
      severity: "error",
      field: "fuel",
      message: `${vehicle.brand} solo comercializa vehículos ${brandFuels.join("/")}, no ${vehicle.fuel}.`,
    });
  }

  if (vehicle.fuel === "electric" && version && /\b(dci|tdi|hdi|cdi|tdci|ecoblue|tfsi(?!.*e))\b/i.test(version)) {
    pushIssue(issues, {
      code: "ev_with_ice_version",
      severity: "error",
      field: "version",
      message: `Un vehículo eléctrico no debería llevar una versión diésel/gasolina como "${version}".`,
    });
  }

  if (ICE_FUELS.includes(vehicle.fuel) && version && /\b(e-tron|eqb|eqc|eqe|eqs|i[x\d]|model\s*[3syx]|long\s*range)\b/i.test(version)) {
    pushIssue(issues, {
      code: "ice_with_ev_version",
      severity: "error",
      field: "version",
      message: `El combustible ${vehicle.fuel} no encaja con una versión claramente eléctrica ("${version}").`,
    });
  }

  if (vehicle.power) {
    const range = FUEL_POWER_RANGES[vehicle.fuel];
    if (vehicle.power < range.min || vehicle.power > range.max) {
      pushIssue(issues, {
        code: "power_fuel_unlikely",
        severity: "warning",
        field: "power",
        message: `${vehicle.power} CV es poco habitual para un ${vehicle.fuel} (rango típico ${range.min}–${range.max} CV).`,
      });
    }
  }

  const currentYear = new Date().getFullYear();
  if (vehicle.year > currentYear + 1) {
    pushIssue(issues, {
      code: "year_future",
      severity: "warning",
      field: "year",
      message: `El año ${vehicle.year} es futuro o muy reciente para una valoración de segunda mano.`,
    });
  }

  if (vehicle.year < 1985 && ELECTRIFIED_FUELS.includes(vehicle.fuel)) {
    pushIssue(issues, {
      code: "year_fuel_mismatch",
      severity: "error",
      field: "year",
      message: `Un ${vehicle.fuel} de ${vehicle.year} es muy improbable.`,
    });
  }

  const absurdPairs: Array<{ brand: RegExp; model: RegExp; message: string }> = [
    { brand: /bmw/i, model: /model\s*3|tesla/i, message: "BMW no fabrica Tesla Model 3." },
    { brand: /ferrari/i, model: /dci|clio|sandero/i, message: "Ferrari no usa motorizaciones dCi." },
    { brand: /tesla/i, model: /dci|tdi|hdi/i, message: "Tesla no comercializa versiones diésel." },
  ];

  for (const pair of absurdPairs) {
    if (pair.brand.test(vehicle.brand) && pair.model.test(`${vehicle.model} ${version}`)) {
      pushIssue(issues, {
        code: "absurd_combo",
        severity: "error",
        field: "model",
        message: pair.message,
      });
    }
  }

  if (/toyota/i.test(vehicle.brand) && /prius/i.test(vehicle.model) && /\bv8\b/i.test(version)) {
    pushIssue(issues, {
      code: "prius_v8",
      severity: "error",
      field: "version",
      message: "Toyota Prius no tiene versión V8 gasolina.",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let severity: VehicleValidationResult["severity"] = "valid";
  if (errorCount > 0) severity = "invalid";
  else if (warningCount > 0) severity = "suspicious";

  const isConsistent = errorCount === 0;
  const canAnalyze = errorCount === 0;
  const canUseModelSpecificKnowledge = isConsistent && modelFound;

  return {
    severity,
    isConsistent,
    canAnalyze,
    canUseModelSpecificKnowledge,
    issues,
    catalogMatch: {
      brandFound,
      modelFound,
      brandSlug: catalog.brand?.slug,
      modelSlug: catalog.model?.slug,
    },
  };
}

export function buildMissingDataSuggestions(vehicle: VehicleInput | Vehicle): Array<{
  field: string;
  label: string;
  impact: "high" | "medium" | "low";
  message: string;
}> {
  const suggestions: Array<{
    field: string;
    label: string;
    impact: "high" | "medium" | "low";
    message: string;
  }> = [];

  if (!vehicle.version) {
    suggestions.push({
      field: "version",
      label: "Versión exacta",
      impact: "high",
      message: "Distingue motorizaciones con precios muy distintos.",
    });
  }
  if (!vehicle.power) {
    suggestions.push({
      field: "power",
      label: "Potencia",
      impact: "high",
      message: "Ayuda a filtrar comparables equivalentes.",
    });
  }
  if (!vehicle.transmission) {
    suggestions.push({
      field: "transmission",
      label: "Tipo de cambio",
      impact: "medium",
      message: "Manual y automático no valen lo mismo en muchos modelos.",
    });
  }
  if (!vehicle.maintenanceHistory) {
    suggestions.push({
      field: "maintenanceHistory",
      label: "Historial de mantenimiento",
      impact: "medium",
      message: "Permite evaluar riesgo mecánico y calidad del anuncio.",
    });
  }
  if (!vehicle.accidents) {
    suggestions.push({
      field: "accidents",
      label: "Accidentes",
      impact: "medium",
      message: "Un dato crítico para el riesgo de compra.",
    });
  }
  if (!vehicle.itv) {
    suggestions.push({
      field: "itv",
      label: "ITV",
      impact: "low",
      message: "Indica si puedes circular de inmediato.",
    });
  }

  return suggestions;
}
