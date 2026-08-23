import type { FuelType, Vehicle, VehicleInput } from "@/types/vehicle";
import { findBrandByName, findModelInBrand } from "@/lib/vehicles/catalog";
import { normalizeKey } from "@/lib/utils/math";

export type ConsistencySeverity = "error" | "warning" | "info";

export type ConsistencyStatus = "valid" | "suspicious" | "invalid";

export interface ConsistencyIssue {
  code: string;
  severity: ConsistencySeverity;
  field?: string;
  message: string;
}

export interface ConsistencyReport {
  status: ConsistencyStatus;
  issues: ConsistencyIssue[];
  /** Brand/model found in catalog */
  catalogMatch: {
    brandFound: boolean;
    modelFound: boolean;
    brandSlug?: string;
    modelSlug?: string;
  };
  /** Blocks model-specific RAG / reliability when true */
  blockModelKnowledge: boolean;
  /** Blocks market search when identity is too broken */
  blockMarketSearch: boolean;
  summary: string;
}

/** Trim / drivetrain tokens strongly associated with a brand family. */
const BRAND_TRIM_SIGNATURES: Array<{
  brands: string[];
  patterns: RegExp[];
  label: string;
}> = [
  {
    brands: ["bmw", "mini"],
    patterns: [
      /\bsdrive\d*/i,
      /\bxdrive\d*/i,
      /\bm\s?\d{2,3}[di]/i,
      /\b\d{2}[di]\b/i,
      /\befficientdynamics\b/i,
    ],
    label: "BMW/MINI",
  },
  {
    brands: ["mercedes", "mercedes-benz", "mercedes benz"],
    patterns: [/\b4matic\b/i, /\bcdi\b/i, /\bblue.?tec\b/i, /\bamg\b/i, /\bkompressor\b/i],
    label: "Mercedes-Benz",
  },
  {
    brands: ["audi"],
    patterns: [/\bquattro\b/i, /\btfsi\b/i, /\btdi\b/i, /\bs\s?line\b/i, /\brs\d/i],
    label: "Audi",
  },
  {
    brands: ["volkswagen", "vw", "skoda", "seat", "cupra"],
    patterns: [/\btsi\b/i, /\btdi\b/i, /\bdsg\b/i, /\b4motion\b/i, /\bgti\b/i, /\bgtd\b/i],
    label: "VW Group",
  },
  {
    brands: ["toyota", "lexus"],
    patterns: [/\bhybrid\s?synergy\b/i, /\bvvti\b/i, /\bd[- ]?4d\b/i],
    label: "Toyota/Lexus",
  },
  {
    brands: ["renault", "dacia", "nissan"],
    patterns: [/\bdci\b/i, /\benergy\b/i, /\beco[- ]?g\b/i],
    label: "Renault-Nissan",
  },
  {
    brands: ["tesla"],
    patterns: [/\blong\s?range\b/i, /\bplaid\b/i, /\bperformance\b/i],
    label: "Tesla",
  },
  {
    brands: ["porsche"],
    patterns: [/\bpdk\b/i, /\btaycan\b/i, /\bgts\b/i],
    label: "Porsche",
  },
];

/** Diesel-coded trims that conflict with electric/petrol-only brands. */
const DIESEL_TRIM = /\b(tdi|cdi|dci|hdi|crdi|skyactiv[- ]?d|blue.?tec|sdrive\d*d|xdrive\d*d|\d{2}d)\b/i;
const PETROL_TRIM = /\b(tfsi|tsi|gdi|mpi|vvti|sdrive\d*i|xdrive\d*i|\d{2}i)\b/i;
const EV_ONLY_BRANDS = new Set(["tesla", "lucid", "rivian", "nio", "byd"]);
const DIESEL_INCOMPATIBLE_BRANDS = new Set(["tesla", "ferrari", "lamborghini", "mclaren"]);

/** Known brand ↔ model mismatches (cross-brand model names). */
const MODEL_OWNERSHIP: Array<{ model: RegExp; owners: string[]; label: string }> = [
  { model: /^model\s?[3sxy]$/i, owners: ["tesla"], label: "Tesla" },
  { model: /^prius$/i, owners: ["toyota"], label: "Toyota" },
  { model: /^leaf$/i, owners: ["nissan"], label: "Nissan" },
  { model: /^id\.?\s?[3-7buz]/i, owners: ["volkswagen", "vw"], label: "Volkswagen" },
  { model: /^i[x3]?[x]?[1-8]?$/i, owners: ["bmw"], label: "BMW" },
  { model: /^eq[aces]$/i, owners: ["mercedes", "mercedes-benz", "mercedes benz"], label: "Mercedes-Benz" },
  { model: /^e[- ]?tron/i, owners: ["audi"], label: "Audi" },
  { model: /^s800$/i, owners: ["ebro"], label: "Ebro" },
  { model: /^x[1-7]$/i, owners: ["bmw"], label: "BMW" },
];

function brandKey(brand: string): string {
  return normalizeKey(brand).replace(/-/g, " ");
}

function matchesBrandFamily(brand: string, family: string[]): boolean {
  const key = brandKey(brand);
  return family.some((item) => {
    const fam = brandKey(item);
    return key === fam || key.includes(fam) || fam.includes(key);
  });
}

function detectForeignTrim(brand: string, version: string): ConsistencyIssue | null {
  const trimmed = version.trim();
  if (!trimmed) return null;

  for (const sig of BRAND_TRIM_SIGNATURES) {
    if (matchesBrandFamily(brand, sig.brands)) continue;
    const hit = sig.patterns.find((pattern) => pattern.test(trimmed));
    if (hit) {
      return {
        code: "foreign_trim",
        severity: "error",
        field: "version",
        message: `La versión «${trimmed}» parece corresponder a ${sig.label}, no a ${brand}.`,
      };
    }
  }
  return null;
}

function detectModelOwnership(brand: string, model: string): ConsistencyIssue | null {
  const key = brandKey(brand);
  for (const rule of MODEL_OWNERSHIP) {
    if (!rule.model.test(model.trim())) continue;
    if (matchesBrandFamily(brand, rule.owners)) continue;
    return {
      code: "brand_model_mismatch",
      severity: "error",
      field: "model",
      message: `El modelo «${model}» no parece corresponder con ${brand}; suele asociarse a ${rule.label}.`,
    };
  }
  // Extra: BMW trim on non-BMW already covered; catch "Tesla Model 3" style in brand field
  if (/tesla/i.test(model) && !/tesla/i.test(key)) {
    return {
      code: "brand_model_mismatch",
      severity: "error",
      field: "model",
      message: `El modelo «${model}» no encaja con la marca ${brand}.`,
    };
  }
  return null;
}

function fuelVsTrimIssues(fuel: FuelType, version?: string, brand?: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const v = version ?? "";

  if (fuel === "electric" && DIESEL_TRIM.test(v)) {
    issues.push({
      code: "fuel_trim_conflict",
      severity: "error",
      field: "fuel",
      message: `Combustible eléctrico incompatible con la versión «${v}» (código diésel).`,
    });
  }
  if (fuel === "diesel" && /heat\s?pump|bomba de calor|soh|bater[ií]a\s*hv/i.test(v)) {
    issues.push({
      code: "fuel_trim_conflict",
      severity: "error",
      field: "version",
      message: "La versión menciona componentes de vehículo eléctrico en un diésel.",
    });
  }
  if ((fuel === "petrol" || fuel === "lpg" || fuel === "cng") && DIESEL_TRIM.test(v)) {
    issues.push({
      code: "fuel_trim_conflict",
      severity: "warning",
      field: "fuel",
      message: `Combustible ${fuel} con versión que parece diésel («${v}»). Revisa el dato.`,
    });
  }
  if (fuel === "diesel" && PETROL_TRIM.test(v) && !DIESEL_TRIM.test(v)) {
    issues.push({
      code: "fuel_trim_conflict",
      severity: "warning",
      field: "fuel",
      message: `Combustible diésel con versión que parece gasolina («${v}»).`,
    });
  }
  if (brand && EV_ONLY_BRANDS.has(brandKey(brand)) && fuel === "diesel") {
    issues.push({
      code: "fuel_brand_conflict",
      severity: "error",
      field: "fuel",
      message: `${brand} no fabrica vehículos diésel.`,
    });
  }
  if (brand && DIESEL_INCOMPATIBLE_BRANDS.has(brandKey(brand)) && fuel === "diesel") {
    issues.push({
      code: "fuel_brand_conflict",
      severity: "error",
      field: "fuel",
      message: `${brand} + diésel no es una combinación válida.`,
    });
  }
  return issues;
}

function powerVsFuelIssues(fuel: FuelType, power?: number): ConsistencyIssue[] {
  if (power == null) return [];
  const issues: ConsistencyIssue[] = [];
  if (fuel === "electric" && power < 40) {
    issues.push({
      code: "power_fuel_suspicious",
      severity: "warning",
      field: "power",
      message: `${power} CV es muy bajo para un eléctrico de turismo.`,
    });
  }
  if (fuel === "diesel" && power > 450) {
    issues.push({
      code: "power_fuel_suspicious",
      severity: "warning",
      field: "power",
      message: `${power} CV es excepcional para un diésel de turismo; verifica el dato.`,
    });
  }
  if ((fuel === "petrol" || fuel === "diesel") && power > 800) {
    issues.push({
      code: "power_unrealistic",
      severity: "error",
      field: "power",
      message: `${power} CV no es realista para este tipo de vehículo de calle.`,
    });
  }
  return issues;
}

function yearIssues(year: number, fuel: FuelType, brand: string, model: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const current = new Date().getFullYear();
  if (year > current + 1) {
    issues.push({
      code: "year_future",
      severity: "error",
      field: "year",
      message: `El año ${year} es futuro; no se puede valorar un vehículo no comercializado.`,
    });
  }
  // Ebro S800 launched ~2024/2025
  if (/ebro/i.test(brand) && /s800/i.test(model) && year < 2024) {
    issues.push({
      code: "year_model_mismatch",
      severity: "error",
      field: "year",
      message: `El Ebro S800 no existía en ${year}.`,
    });
  }
  if (fuel === "electric" && year < 2010 && !/tesla|nissan|mitsubishi|renault/i.test(brand)) {
    issues.push({
      code: "year_fuel_suspicious",
      severity: "warning",
      field: "year",
      message: `Eléctrico en ${year} es poco habitual para ${brand}; verifica marca/combustible.`,
    });
  }
  if (/prius/i.test(model) && year < 1997) {
    issues.push({
      code: "year_model_mismatch",
      severity: "error",
      field: "year",
      message: `El Prius no existía en ${year}.`,
    });
  }
  return issues;
}

function v8OnPrius(brand: string, model: string, version?: string, power?: number): ConsistencyIssue | null {
  if (!/prius/i.test(model)) return null;
  if (version && /v8|5\.0|4\.0\s*v/i.test(version)) {
    return {
      code: "engine_model_mismatch",
      severity: "error",
      field: "version",
      message: `Un Prius no lleva motorización «${version}».`,
    };
  }
  if (power != null && power >= 300) {
    return {
      code: "power_model_mismatch",
      severity: "error",
      field: "power",
      message: `${power} CV no encaja con un Toyota Prius convencional.`,
    };
  }
  void brand;
  return null;
}

/**
 * VehicleConsistencyValidator — rejects impossible brand/model/trim/fuel combinations
 * before RAG or market analysis invents knowledge.
 */
export function validateVehicleConsistency(
  vehicle: Pick<
    Vehicle | VehicleInput,
    "brand" | "model" | "version" | "year" | "mileage" | "fuel" | "power" | "transmission"
  >,
): ConsistencyReport {
  const issues: ConsistencyIssue[] = [];
  const brand = findBrandByName(vehicle.brand);
  const model = brand ? findModelInBrand(brand, vehicle.model) : undefined;

  const catalogMatch = {
    brandFound: Boolean(brand),
    modelFound: Boolean(model),
    brandSlug: brand?.slug,
    modelSlug: model?.slug,
  };

  if (!brand) {
    issues.push({
      code: "unknown_brand",
      severity: "warning",
      field: "brand",
      message: `Marca «${vehicle.brand}» no está en el catálogo. La valoración tendrá menor confianza.`,
    });
  } else if (!model) {
    issues.push({
      code: "unknown_model",
      severity: "warning",
      field: "model",
      message: `Modelo «${vehicle.model}» no aparece bajo ${vehicle.brand} en el catálogo.`,
    });
  }

  const ownership = detectModelOwnership(vehicle.brand, vehicle.model);
  if (ownership) issues.push(ownership);

  if (vehicle.version) {
    const foreign = detectForeignTrim(vehicle.brand, vehicle.version);
    if (foreign) issues.push(foreign);
  }

  issues.push(...fuelVsTrimIssues(vehicle.fuel, vehicle.version, vehicle.brand));
  issues.push(...powerVsFuelIssues(vehicle.fuel, vehicle.power));
  issues.push(...yearIssues(vehicle.year, vehicle.fuel, vehicle.brand, vehicle.model));

  const prius = v8OnPrius(vehicle.brand, vehicle.model, vehicle.version, vehicle.power);
  if (prius) issues.push(prius);

  // Ferrari + small diesel
  if (/ferrari/i.test(vehicle.brand) && (vehicle.fuel === "diesel" || DIESEL_TRIM.test(vehicle.version ?? ""))) {
    issues.push({
      code: "exotic_diesel",
      severity: "error",
      field: "fuel",
      message: "Ferrari + motorización diésel (p. ej. 1.5 dCi) no es una combinación válida.",
    });
  }

  if (vehicle.mileage < 0 || vehicle.mileage > 800_000) {
    issues.push({
      code: "mileage_unrealistic",
      severity: "error",
      field: "mileage",
      message: "Kilometraje fuera de rango realista.",
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  let status: ConsistencyStatus = "valid";
  if (errors.length > 0) status = "invalid";
  else if (warnings.length > 0) status = "suspicious";

  const blockModelKnowledge = status === "invalid";
  const blockMarketSearch =
    status === "invalid" &&
    issues.some((i) =>
      ["brand_model_mismatch", "foreign_trim", "fuel_brand_conflict", "exotic_diesel"].includes(i.code),
    );

  const summary =
    status === "valid"
      ? "La combinación marca / modelo / versión / combustible es coherente."
      : status === "invalid"
        ? `Datos incoherentes: ${errors.map((e) => e.message).join(" ")}`
        : `Datos dudosos: ${warnings.map((w) => w.message).join(" ")}`;

  return {
    status,
    issues,
    catalogMatch,
    blockModelKnowledge,
    blockMarketSearch,
    summary,
  };
}

export class VehicleConsistencyError extends Error {
  readonly report: ConsistencyReport;

  constructor(report: ConsistencyReport) {
    super(report.summary);
    this.name = "VehicleConsistencyError";
    this.report = report;
  }
}
