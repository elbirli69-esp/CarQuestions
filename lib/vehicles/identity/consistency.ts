import type {
  CanonicalVehicle,
  ConsistencyIssue,
  ConsistencyStatus,
  VehicleIdentity,
} from "@/types/identity";
import type { Vehicle } from "@/types/vehicle";
import { currentYear } from "@/lib/utils/format";
import { findBrandByName, getCatalogBrands } from "@/lib/vehicles/catalog";
import { buildCanonicalVehicle, canonicalLabel, matchTrimSignals } from "@/lib/vehicles/identity/canonical";
import {
  fuelFirstYear,
  fuelLabel,
  normalizeBrandKey,
  powerRangeFor,
  powertrainFromFuel,
} from "@/lib/vehicles/identity/taxonomy";
import { findModelPowertrainFact } from "@/lib/vehicles/identity/model-facts";
import { ENGINE_LAYOUT_PATTERN, GENERIC_FUEL_SIGNALS } from "@/lib/vehicles/identity/trim-signals";

/**
 * Marcas con catálogo suficientemente completo como para que "modelo no encontrado"
 * sea una señal real y no un hueco del catálogo.
 */
const MIN_MODELS_FOR_RELIABLE_CATALOG = 5;

function checkBrandModel(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const brand = findBrandByName(vehicle.brand);
  if (!brand) {
    issues.push({
      code: "BRAND_NOT_IN_CATALOG",
      severity: "warning",
      fields: ["brand"],
      message: `No encontramos la marca "${vehicle.brand}" en el catálogo de coches.net.`,
      suggestion:
        "Revisa la ortografía o elige la marca en el desplegable. Sin marca reconocida no podemos buscar comparables ni conocimiento del modelo.",
    });
    return;
  }

  const model = brand.models.find((item) => {
    const a = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const b = vehicle.model.toLowerCase().replace(/[^a-z0-9]/g, "");
    return a === b;
  });

  if (model) return;

  if (brand.models.length >= MIN_MODELS_FOR_RELIABLE_CATALOG) {
    issues.push({
      code: "MODEL_NOT_IN_BRAND",
      severity: "warning",
      fields: ["brand", "model"],
      message: `"${vehicle.model}" no aparece entre los modelos de ${brand.name} que conocemos.`,
      suggestion: `Comprueba el modelo. ${brand.name} sí tiene, por ejemplo: ${brand.models
        .slice(0, 6)
        .map((item) => item.name)
        .join(", ")}.`,
    });
  }
}

/**
 * El chequeo central: la versión pertenece a la nomenclatura de otra marca.
 * Es el caso "Ebro S800 sDrive18d".
 */
function checkTrimBelongsToBrand(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const signals = matchTrimSignals(vehicle.version);
  if (signals.length === 0) return;

  const brandKey = normalizeBrandKey(vehicle.brand);
  const foreign = signals.filter(
    (signal) => signal.exclusive && signal.brands.length > 0 && !signal.brands.includes(brandKey),
  );
  if (foreign.length === 0) return;

  const owners = Array.from(new Set(foreign.flatMap((signal) => signal.brands)));
  const labels = foreign.map((signal) => signal.label).join("; ");

  issues.push({
    code: "TRIM_BRAND_MISMATCH",
    severity: "blocking",
    fields: ["brand", "version"],
    message: `La versión "${vehicle.version}" no parece corresponder con un ${vehicle.brand} ${vehicle.model}: ${labels} es nomenclatura de ${owners
      .slice(0, 3)
      .join(" / ")}.`,
    suggestion:
      "Corrige la versión con la denominación real del anuncio, o déjala en blanco. Con una versión de otra marca no podemos dar conocimiento técnico fiable de este coche.",
  });
}

/** La versión implica un combustible distinto del declarado. */
function checkTrimFuel(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const version = vehicle.version;
  if (!version) return;

  const declaredPowertrain = powertrainFromFuel(vehicle.fuel);
  const brandKey = normalizeBrandKey(vehicle.brand);

  for (const signal of matchTrimSignals(version)) {
    // Una denominación ambigua de otra marca puede coincidir por casualidad:
    // solo se usa como prueba si es inequívoca o si la marca la usa de verdad.
    if (!signal.exclusive && !signal.brands.includes(brandKey)) continue;

    if (signal.fuel && !signal.fuel.includes(vehicle.fuel)) {
      issues.push({
        code: "TRIM_FUEL_MISMATCH",
        severity: "blocking",
        fields: ["version", "fuel"],
        message: `La versión "${version}" indica ${signal.label}, pero has marcado el combustible como ${fuelLabel(
          vehicle.fuel,
        )}.`,
        suggestion: "Corrige el combustible o la versión: una de las dos cosas no puede ser cierta.",
      });
      return;
    }
    if (signal.powertrain && !signal.powertrain.includes(declaredPowertrain)) {
      issues.push({
        code: "TRIM_POWERTRAIN_MISMATCH",
        severity: "blocking",
        fields: ["version", "fuel"],
        message: `La versión "${version}" (${signal.label}) no encaja con el combustible declarado (${fuelLabel(
          vehicle.fuel,
        )}).`,
        suggestion: "Revisa el combustible o la versión del anuncio.",
      });
      return;
    }
  }

  for (const generic of GENERIC_FUEL_SIGNALS) {
    if (!generic.pattern.test(version)) continue;
    if (generic.fuel.includes(vehicle.fuel)) continue;
    issues.push({
      code: "TRIM_FUEL_TEXT_MISMATCH",
      severity: "blocking",
      fields: ["version", "fuel"],
      message: `La versión menciona "${generic.label}" pero el combustible declarado es ${fuelLabel(vehicle.fuel)}.`,
      suggestion: "Ajusta el combustible para que coincida con la versión del anuncio.",
    });
    return;
  }
}

/** Arquitecturas de motor imposibles para el tren motriz declarado. */
function checkEngineLayout(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const version = vehicle.version;
  if (!version) return;
  const layout = version.match(ENGINE_LAYOUT_PATTERN)?.[0];
  if (!layout) return;

  if (vehicle.fuel === "electric") {
    issues.push({
      code: "LAYOUT_ON_ELECTRIC",
      severity: "blocking",
      fields: ["version", "fuel"],
      message: `Has indicado un motor ${layout.toUpperCase()} en un vehículo eléctrico.`,
      suggestion: "Un eléctrico puro no tiene motor de combustión. Corrige el combustible o la versión.",
    });
    return;
  }

  const fact = findModelPowertrainFact(vehicle.brand, vehicle.model);
  if (fact) {
    issues.push({
      code: "LAYOUT_ON_ELECTRIFIED_MODEL",
      severity: "blocking",
      fields: ["model", "version"],
      message: `Has indicado un motor ${layout.toUpperCase()} en un ${vehicle.brand} ${vehicle.model}.`,
      suggestion: fact.note,
    });
  }
}

/**
 * Modelos que solo existieron con un tren motriz concreto.
 * Cubre "Tesla diésel" o "Prius gasolina V8".
 */
function checkModelPowertrainFact(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const fact = findModelPowertrainFact(vehicle.brand, vehicle.model);
  if (!fact) return;
  if (fact.fuels.includes(vehicle.fuel)) return;

  issues.push({
    code: "MODEL_FUEL_IMPOSSIBLE",
    severity: "blocking",
    fields: ["model", "fuel"],
    message: `Un ${vehicle.brand} ${vehicle.model} no existe en ${fuelLabel(vehicle.fuel)}: ${fact.note}`,
    suggestion: `Corrige el combustible (${fact.fuels.map(fuelLabel).join(" o ")}) o el modelo.`,
  });
}

function checkFuelPower(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  if (vehicle.power == null) return;
  const range = powerRangeFor(vehicle.fuel);
  if (vehicle.power >= range.min && vehicle.power <= range.max) return;

  issues.push({
    code: "POWER_OUT_OF_RANGE",
    severity: "warning",
    fields: ["power", "fuel"],
    message: `${vehicle.power} CV queda fuera del rango habitual para un ${fuelLabel(vehicle.fuel)} (${range.min}–${range.max} CV).`,
    suggestion: "Comprueba la potencia del anuncio: puede estar en kW en lugar de CV.",
  });
}

function checkYearFuel(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const first = fuelFirstYear(vehicle.fuel);
  if (first && vehicle.year < first) {
    issues.push({
      code: "FUEL_BEFORE_TECHNOLOGY",
      severity: "blocking",
      fields: ["year", "fuel"],
      message: `No existían ${fuelLabel(vehicle.fuel)}s comercializados en ${vehicle.year}.`,
      suggestion: "Revisa el año de matriculación o el tipo de combustible.",
    });
  }

  const max = currentYear() + 1;
  if (vehicle.year > max) {
    issues.push({
      code: "YEAR_IN_FUTURE",
      severity: "blocking",
      fields: ["year"],
      message: `El año ${vehicle.year} es posterior al máximo admitido (${max}).`,
      suggestion: "Indica el año de matriculación real.",
    });
  }
}

function checkMileagePlausibility(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const age = Math.max(0, currentYear() - vehicle.year);
  if (age === 0) {
    if (vehicle.mileage > 60000) {
      issues.push({
        code: "MILEAGE_TOO_HIGH_FOR_AGE",
        severity: "warning",
        fields: ["year", "mileage"],
        message: `${vehicle.mileage.toLocaleString("es-ES")} km en un coche de ${vehicle.year} es muy alto.`,
        suggestion: "Confirma el kilometraje real y el año de primera matriculación.",
      });
    }
    return;
  }

  const kmPerYear = vehicle.mileage / age;
  if (kmPerYear > 55000) {
    issues.push({
      code: "MILEAGE_TOO_HIGH_FOR_AGE",
      severity: "warning",
      fields: ["year", "mileage"],
      message: `Salen ${Math.round(kmPerYear).toLocaleString("es-ES")} km/año, muy por encima de lo habitual.`,
      suggestion: "Verifica el kilometraje: podría ser un ex-flota o un dato erróneo.",
    });
  }
  if (age >= 5 && vehicle.mileage < 1000) {
    issues.push({
      code: "MILEAGE_TOO_LOW_FOR_AGE",
      severity: "warning",
      fields: ["year", "mileage"],
      message: `Menos de 1.000 km en un coche de ${age} años es muy poco habitual.`,
      suggestion: "Confirma el kilometraje con el cuadro y las facturas: podría estar manipulado.",
    });
  }
}

function checkTransmission(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  if (vehicle.fuel !== "electric") return;
  if (vehicle.transmission === "manual") {
    issues.push({
      code: "ELECTRIC_WITH_MANUAL",
      severity: "blocking",
      fields: ["fuel", "transmission"],
      message: "Has indicado un eléctrico con cambio manual.",
      suggestion:
        "Los eléctricos de serie no llevan caja manual. Corrige el combustible o el tipo de cambio.",
    });
  }
}

/** Un modelo cuyo nombre es de otra marca (BMW Model 3, Ferrari Clio…). */
function checkModelBelongsToAnotherBrand(vehicle: Vehicle, issues: ConsistencyIssue[]): void {
  const brandKey = normalizeBrandKey(vehicle.brand);
  const modelKey = vehicle.model.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (modelKey.length < 3) return;

  const owners = getCatalogBrands().filter(
    (brand) =>
      normalizeBrandKey(brand.name) !== brandKey &&
      brand.models.some((model) => model.name.toLowerCase().replace(/[^a-z0-9]/g, "") === modelKey),
  );
  if (owners.length === 0) return;

  // Si la marca declarada también tiene ese modelo, no hay conflicto.
  const declared = findBrandByName(vehicle.brand);
  if (
    declared?.models.some((model) => model.name.toLowerCase().replace(/[^a-z0-9]/g, "") === modelKey)
  ) {
    return;
  }

  issues.push({
    code: "MODEL_BELONGS_TO_OTHER_BRAND",
    severity: "blocking",
    fields: ["brand", "model"],
    message: `"${vehicle.model}" es un modelo de ${owners
      .slice(0, 2)
      .map((brand) => brand.name)
      .join(" / ")}, no de ${vehicle.brand}.`,
    suggestion: "Corrige la marca o el modelo para que se correspondan.",
  });
}

function statusFrom(issues: ConsistencyIssue[]): ConsistencyStatus {
  if (issues.some((issue) => issue.severity === "blocking")) return "invalid";
  if (issues.some((issue) => issue.severity === "warning")) return "suspicious";
  return "ok";
}

/**
 * Comprueba que los datos del vehículo son coherentes entre sí antes de
 * generar precio, conocimiento técnico o preguntas.
 *
 * Nunca "arregla" los datos en silencio: describe el conflicto y deja que el
 * usuario decida. Si hay un conflicto bloqueante, el análisis degrada.
 */
export function validateVehicleConsistency(vehicle: Vehicle): VehicleIdentity {
  const issues: ConsistencyIssue[] = [];

  checkBrandModel(vehicle, issues);
  checkModelBelongsToAnotherBrand(vehicle, issues);
  checkTrimBelongsToBrand(vehicle, issues);
  checkTrimFuel(vehicle, issues);
  checkModelPowertrainFact(vehicle, issues);
  checkEngineLayout(vehicle, issues);
  checkFuelPower(vehicle, issues);
  checkYearFuel(vehicle, issues);
  checkMileagePlausibility(vehicle, issues);
  checkTransmission(vehicle, issues);

  const canonical: CanonicalVehicle = buildCanonicalVehicle(vehicle);
  const status = statusFrom(issues);

  return {
    canonical,
    status,
    issues,
    safeForTechnicalKnowledge: status !== "invalid",
    label: canonicalLabel(canonical),
  };
}
