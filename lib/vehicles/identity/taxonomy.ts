import type { BodyClass, Drivetrain, PowertrainClass } from "@/types/identity";
import type { BodyType, FuelType } from "@/types/vehicle";
import { normalizeKey } from "@/lib/utils/math";

/** Alias de marca → clave canónica usada en las tablas de nomenclatura. */
const BRAND_ALIASES: Record<string, string> = {
  vw: "volkswagen",
  mercedes: "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  mercedesbenz: "mercedes-benz",
  "alfa": "alfa romeo",
  "alfaromeo": "alfa romeo",
  "range rover": "land rover",
  landrover: "land rover",
  "rangerover": "land rover",
  citroën: "citroen",
  "lynk & co": "lynk",
  "gwm": "great wall",
  "vauxhall": "opel",
};

export function normalizeBrandKey(brand: string): string {
  const normalized = normalizeKey(brand);
  return BRAND_ALIASES[normalized] ?? normalized;
}

export function powertrainFromFuel(fuel: FuelType | undefined): PowertrainClass {
  switch (fuel) {
    case "diesel":
    case "petrol":
    case "lpg":
    case "cng":
      return "ice";
    case "hybrid":
      return "hybrid";
    case "plugin_hybrid":
      return "phev";
    case "electric":
      return "bev";
    default:
      return "unknown";
  }
}

/** ¿El tren motriz tiene motor de combustión? (para filtrar conocimiento ICE). */
export function hasCombustionEngine(powertrain: PowertrainClass): boolean {
  return powertrain === "ice" || powertrain === "hybrid" || powertrain === "phev";
}

/** ¿El tren motriz tiene batería de tracción de alto voltaje? */
export function hasHighVoltageBattery(powertrain: PowertrainClass): boolean {
  return powertrain === "bev" || powertrain === "hybrid" || powertrain === "phev";
}

/** ¿Puede enchufarse a la red? (carga externa, bomba de calor, curva DC…) */
export function isPluggable(powertrain: PowertrainClass): boolean {
  return powertrain === "bev" || powertrain === "phev";
}

const LCV_MODEL_PATTERN =
  /\b(transit|transporter|sprinter|crafter|ducato|boxer|jumper|jumpy|expert|master|movano|trafic|vivaro|daily|doblo|berlingo|partner|combo|caddy|kangoo|nv200|nv300|proace|dokker|scudo|talento|interstar|primastar|e-?nv200|custom|vito|citan|hiace|carry)\b/i;

/**
 * Los playbooks de vehículo comercial (ex-flota, sobrecarga, AdBlue de reparto)
 * son una fuente clásica de contaminación en turismos. Por eso, si no hay
 * indicios de comercial, se asume turismo con confianza baja: es preferible
 * omitir conocimiento de furgoneta a atribuírselo a un SUV.
 */
export function classifyBodyClass(
  model: string,
  bodyType: BodyType | undefined,
): { value: BodyClass; source: "derived" | "inferred" } {
  if (bodyType === "van" || bodyType === "pickup") return { value: "lcv", source: "derived" };
  if (LCV_MODEL_PATTERN.test(model)) return { value: "lcv", source: "inferred" };
  if (bodyType) return { value: "passenger", source: "derived" };
  return { value: "passenger", source: "inferred" };
}

// Las denominaciones comerciales llevan el número pegado ("xDrive20d", "sDrive18d"),
// por eso no se puede exigir un límite de palabra al final.
const AWD_PATTERN =
  /\b(4x4|awd|4wd|quattro|xdrive|4motion|4matic|allgrip|all4|haldex|4drive|sh-?awd|symmetrical|torsen)/i;
const FWD_PATTERN = /\b(fwd|tracci[oó]n\s?delantera|2wd|4x2)\b/i;
const RWD_PATTERN = /\b(rwd|propulsi[oó]n|tracci[oó]n\s?trasera|sdrive)/i;

export function classifyDrivetrain(text: string): Drivetrain {
  if (AWD_PATTERN.test(text)) return "awd";
  if (RWD_PATTERN.test(text)) return "rwd";
  if (FWD_PATTERN.test(text)) return "fwd";
  return "unknown";
}

const POWERTRAIN_LABELS: Record<PowertrainClass, string> = {
  ice: "combustión",
  hybrid: "híbrido",
  phev: "híbrido enchufable",
  bev: "eléctrico",
  unknown: "sin determinar",
};

export function powertrainLabel(powertrain: PowertrainClass): string {
  return POWERTRAIN_LABELS[powertrain];
}

const FUEL_LABELS: Record<FuelType, string> = {
  diesel: "diésel",
  petrol: "gasolina",
  hybrid: "híbrido",
  plugin_hybrid: "híbrido enchufable",
  electric: "eléctrico",
  lpg: "GLP",
  cng: "GNC",
  other: "otro",
};

export function fuelLabel(fuel: FuelType): string {
  return FUEL_LABELS[fuel] ?? fuel;
}

/**
 * Rangos de potencia plausibles por combustible, en CV.
 * Son vallas muy anchas: solo pretenden cazar disparates, no discriminar versiones.
 */
const POWER_RANGES: Record<FuelType, { min: number; max: number }> = {
  diesel: { min: 45, max: 550 },
  petrol: { min: 35, max: 1200 },
  hybrid: { min: 60, max: 900 },
  plugin_hybrid: { min: 90, max: 1100 },
  electric: { min: 40, max: 1400 },
  lpg: { min: 40, max: 400 },
  cng: { min: 50, max: 350 },
  other: { min: 20, max: 2000 },
};

export function powerRangeFor(fuel: FuelType): { min: number; max: number } {
  return POWER_RANGES[fuel] ?? POWER_RANGES.other;
}

/**
 * Primer año en que la tecnología existió de forma comercial en Europa.
 * Solo se usa para detectar combinaciones imposibles (un "eléctrico de 1995").
 */
const FUEL_FIRST_YEAR: Partial<Record<FuelType, number>> = {
  electric: 2008,
  plugin_hybrid: 2011,
  hybrid: 1998,
  cng: 1997,
};

export function fuelFirstYear(fuel: FuelType): number | undefined {
  return FUEL_FIRST_YEAR[fuel];
}
