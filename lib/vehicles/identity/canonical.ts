import type {
  CanonicalVehicle,
  ConfidenceLevel,
  Drivetrain,
  FieldProvenance,
  FieldSource,
} from "@/types/identity";
import type { Vehicle } from "@/types/vehicle";
import { findBrandByName, findModelInBrand } from "@/lib/vehicles/catalog";
import {
  classifyBodyClass,
  classifyDrivetrain,
  fuelLabel,
  powertrainFromFuel,
} from "@/lib/vehicles/identity/taxonomy";
import { TRIM_SIGNALS } from "@/lib/vehicles/identity/trim-signals";

function field<T>(
  value: T,
  source: FieldSource,
  confidence: ConfidenceLevel,
  verified = false,
  note?: string,
): FieldProvenance<T> {
  return { value, source, confidence, verified, note };
}

/**
 * Deduce la tracción a partir de la versión y el modelo.
 * Solo devuelve algo distinto de "unknown" cuando hay una señal explícita.
 */
function resolveDrivetrain(vehicle: Vehicle): FieldProvenance<Drivetrain> {
  const fromVersion = classifyDrivetrain(vehicle.version ?? "");
  if (fromVersion !== "unknown") {
    return field(fromVersion, "derived", "medium", false, "Deducida de la nomenclatura de la versión.");
  }
  const fromModel = classifyDrivetrain(vehicle.model);
  if (fromModel !== "unknown") {
    return field(fromModel, "derived", "low", false, "Deducida del nombre del modelo.");
  }
  return field("unknown", "inferred", "none", false, "No se ha podido determinar la tracción.");
}

/** Busca códigos de motor explícitos en la versión (N47, B47, EA888, 1.6 HDi…). */
const ENGINE_CODE_PATTERN =
  /\b(([A-Z]{1,3}\d{2,3}[A-Z]?)|(EA\d{3})|(OM\d{3})|(M\d{2}[A-Z]?)|(N\d{2})|(B\d{2}))\b/;

function resolveEngineCode(version?: string): FieldProvenance<string> | undefined {
  if (!version) return undefined;
  const match = version.toUpperCase().match(ENGINE_CODE_PATTERN);
  if (!match?.[0]) return undefined;
  // Evita confundir designaciones comerciales (18D, 320D) con códigos de motor.
  if (/^\d/.test(match[0])) return undefined;
  return field(match[0], "derived", "low", false, "Extraído del texto de la versión, sin verificar.");
}

/** Señales de nomenclatura que coinciden con el texto de la versión. */
export function matchTrimSignals(version: string | undefined) {
  if (!version) return [];
  return TRIM_SIGNALS.filter((signal) => signal.pattern.test(version));
}

export function buildCanonicalVehicle(vehicle: Vehicle): CanonicalVehicle {
  const catalogBrand = findBrandByName(vehicle.brand);
  const catalogModel = catalogBrand ? findModelInBrand(catalogBrand, vehicle.model) : undefined;

  const powertrain = powertrainFromFuel(vehicle.fuel);
  const bodyClass = classifyBodyClass(vehicle.model, vehicle.bodyType);

  const canonical: CanonicalVehicle = {
    make: field(
      catalogBrand?.name ?? vehicle.brand,
      catalogBrand ? "catalog" : "user",
      catalogBrand ? "high" : "medium",
      Boolean(catalogBrand),
      catalogBrand
        ? "Marca presente en el catálogo de coches.net."
        : "Marca no encontrada en el catálogo; se usa tal cual la escribiste.",
    ),
    model: field(
      catalogModel?.name ?? vehicle.model,
      catalogModel ? "catalog" : "user",
      catalogModel ? "high" : "low",
      Boolean(catalogModel),
      catalogModel
        ? "Modelo confirmado en el catálogo de la marca."
        : "Modelo no confirmado en el catálogo de la marca.",
    ),
    fuelType: field(vehicle.fuel, "user", "high", false, `Declarado como ${fuelLabel(vehicle.fuel)}.`),
    powertrain: field(powertrain, "derived", "high", false, "Derivado del combustible declarado."),
    drive: resolveDrivetrain(vehicle),
    bodyClass: field(
      bodyClass.value,
      bodyClass.source,
      bodyClass.source === "derived" ? "medium" : "low",
      false,
    ),
    year: field(vehicle.year, "user", "high"),
    mileage: field(vehicle.mileage, "user", "high"),
    country: field("ES", "derived", "high", true, "El mercado de referencia es España."),
  };

  if (vehicle.version) {
    canonical.trim = field(vehicle.version, "user", "medium", false, "Versión tal y como la has escrito.");
  }
  const engineCode = resolveEngineCode(vehicle.version);
  if (engineCode) canonical.engineCode = engineCode;

  if (vehicle.power != null) {
    canonical.powerHp = field(vehicle.power, "user", "high");
  }
  if (vehicle.transmission) {
    canonical.transmission = field(vehicle.transmission, "user", "high");
  }
  if (vehicle.bodyType) {
    canonical.bodyType = field(vehicle.bodyType, "user", "high");
  }
  if (vehicle.advertisedPrice != null) {
    canonical.price = field(vehicle.advertisedPrice, "user", "high");
  }
  if (vehicle.listingUrl) {
    canonical.sourceUrl = field(vehicle.listingUrl, "listing", "high", true);
  }

  return canonical;
}

export function canonicalLabel(canonical: CanonicalVehicle): string {
  const trim = canonical.trim?.value ? ` ${canonical.trim.value}` : "";
  return `${canonical.make.value} ${canonical.model.value}${trim} (${canonical.year.value}, ${fuelLabel(
    canonical.fuelType.value,
  )})`;
}
