import type { ConsistencyIssue, ConsistencyReport, ConsistencyStatus } from "@/types/evidence";
import type { Vehicle, VehicleInput } from "@/types/vehicle";
import { findBrandByName, findModelInBrand, getVehicleCatalog } from "@/lib/vehicles/catalog";
import {
  brandKey,
  detectModelOwnership,
  detectVersionFamilies,
  inferFuelFromVersion,
  matchesBrandList,
  modelMentionsOtherBrand,
  priusAllowsPowertrain,
  teslaAllowsFuel,
  typicalPowerForDieselCode,
  versionHasV8,
} from "@/lib/vehicles/identity";
import { normalizeKey } from "@/lib/utils/math";

export type ConsistencyVehicle = Pick<
  Vehicle,
  "brand" | "model" | "version" | "year" | "fuel" | "power" | "transmission"
>;

function worstStatus(issues: ConsistencyIssue[]): ConsistencyStatus {
  if (issues.some((issue) => issue.status === "invalid")) return "invalid";
  if (issues.some((issue) => issue.status === "suspicious")) return "suspicious";
  return "valid";
}

export class VehicleConsistencyValidator {
  validate(vehicle: ConsistencyVehicle): ConsistencyReport {
    const issues: ConsistencyIssue[] = [];
    const discarded = new Set<string>();

    const brand = vehicle.brand?.trim() ?? "";
    const model = vehicle.model?.trim() ?? "";
    const version = vehicle.version?.trim() ?? "";
    const catalog = getVehicleCatalog();
    const catalogBrand = findBrandByName(brand);
    const catalogModel = catalogBrand ? findModelInBrand(catalogBrand, model) : undefined;

    if (catalogBrand && !catalogModel) {
      const ownedElsewhere = catalog.brands.find((item) =>
        item.models.some((candidate) => normalizeKey(candidate.name) === normalizeKey(model)),
      );
      if (ownedElsewhere && brandKey(ownedElsewhere.name) !== brandKey(brand)) {
        issues.push({
          code: "model_belongs_to_other_brand",
          field: "model",
          status: "invalid",
          message: `El modelo ${model} no parece corresponder con ${brand}; figura en el catálogo de ${ownedElsewhere.name}.`,
          relatedFields: ["brand", "model"],
        });
        discarded.add("model");
      } else {
        issues.push({
          code: "model_not_in_brand_catalog",
          field: "model",
          status: "suspicious",
          message: `No encontramos ${model} entre los modelos conocidos de ${brand}.`,
          relatedFields: ["brand", "model"],
        });
      }
    }

    const ownership = detectModelOwnership(`${model} ${version}`);
    if (ownership && !matchesBrandList(brand, ownership.brands)) {
      issues.push({
        code: "model_brand_mismatch",
        field: "model",
        status: "invalid",
        message: `El modelo ${model} no parece corresponder con ${brand}.`,
        relatedFields: ["brand", "model"],
      });
      discarded.add("model");
    }

    if (modelMentionsOtherBrand(brand, model)) {
      issues.push({
        code: "model_embeds_other_brand",
        field: "model",
        status: "invalid",
        message: `El modelo "${model}" mezcla marcas y no es coherente con ${brand}.`,
        relatedFields: ["brand", "model"],
      });
      discarded.add("model");
    }

    const families = detectVersionFamilies(version);
    for (const family of families) {
      if (!matchesBrandList(brand, family.brands)) {
        issues.push({
          code: "trim_brand_mismatch",
          field: "version",
          status: "invalid",
          message: `La versión ${version} no parece corresponder con el ${brand} ${model}. Usa nomenclatura ${family.label}, típica de ${family.brands.join(", ")}.`,
          relatedFields: ["brand", "model", "version"],
        });
        discarded.add("version");
      }
    }

    const impliedFuel = inferFuelFromVersion(version);
    if (impliedFuel && impliedFuel !== vehicle.fuel) {
      const electricVsDiesel =
        (vehicle.fuel === "electric" && impliedFuel === "diesel") ||
        (vehicle.fuel === "diesel" && impliedFuel === "electric");
      issues.push({
        code: "trim_fuel_mismatch",
        field: "fuel",
        status: electricVsDiesel || impliedFuel === "diesel" || impliedFuel === "electric" ? "invalid" : "suspicious",
        message: `La versión ${version} sugiere ${impliedFuel}, pero el combustible indicado es ${vehicle.fuel}.`,
        relatedFields: ["version", "fuel"],
      });
      discarded.add("version");
    }

    if (brandKey(brand) === "tesla" && !teslaAllowsFuel(vehicle.fuel)) {
      issues.push({
        code: "tesla_combustion",
        field: "fuel",
        status: "invalid",
        message: `Tesla no comercializa ${vehicle.fuel}. Un Tesla no puede ser diésel ni gasolina.`,
        relatedFields: ["brand", "fuel"],
      });
    }

    if (normalizeKey(model) === "prius" && !priusAllowsPowertrain(vehicle)) {
      issues.push({
        code: "prius_powertrain",
        field: "version",
        status: "invalid",
        message: `El Toyota Prius no encaja con ${vehicle.version ?? vehicle.fuel}${vehicle.power ? ` ${vehicle.power} CV` : ""}.`,
        relatedFields: ["model", "fuel", "version", "power"],
      });
      discarded.add("version");
    }

    if (versionHasV8(`${version} ${model}`) && vehicle.power != null && vehicle.power < 250) {
      issues.push({
        code: "v8_power_mismatch",
        field: "power",
        status: "suspicious",
        message: `Un V8 con ${vehicle.power} CV es poco plausible.`,
        relatedFields: ["version", "power"],
      });
    }

    const dieselPower = version ? typicalPowerForDieselCode(version) : null;
    if (dieselPower && vehicle.power != null && (vehicle.power < dieselPower.min - 20 || vehicle.power > dieselPower.max + 40)) {
      issues.push({
        code: "trim_power_mismatch",
        field: "power",
        status: "suspicious",
        message: `La potencia ${vehicle.power} CV no encaja bien con la versión ${version}.`,
        relatedFields: ["version", "power"],
      });
    }

    if (brandKey(brand) === "ferrari" && impliedFuel === "diesel") {
      issues.push({
        code: "ferrari_diesel",
        field: "version",
        status: "invalid",
        message: `Ferrari no ofrece motorizaciones diésel como ${version || vehicle.fuel}.`,
        relatedFields: ["brand", "version", "fuel"],
      });
      discarded.add("version");
    }

    if (vehicle.year < 1980 || vehicle.year > new Date().getFullYear() + 1) {
      issues.push({
        code: "year_out_of_range",
        field: "year",
        status: "invalid",
        message: `El año ${vehicle.year} no es coherente para un análisis de compraventa.`,
        relatedFields: ["year"],
      });
    }

    const status = worstStatus(issues);
    return {
      status,
      issues,
      discardedFields: [...discarded],
      summary: summarizeConsistency(status, issues, vehicle),
    };
  }
}

export const vehicleConsistencyValidator = new VehicleConsistencyValidator();

export function validateVehicleConsistency(vehicle: ConsistencyVehicle): ConsistencyReport {
  return vehicleConsistencyValidator.validate(vehicle);
}

export function summarizeConsistency(
  status: ConsistencyStatus,
  issues: ConsistencyIssue[],
  vehicle: ConsistencyVehicle,
): string {
  if (status === "valid") {
    return `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""} es una combinación coherente.`;
  }
  const first = issues.find((issue) => issue.status === status) ?? issues[0];
  return first?.message ?? "Hay incoherencias en los datos del vehículo.";
}

export function vehicleForRetrieval(
  vehicle: VehicleInput,
  report: ConsistencyReport,
): VehicleInput {
  if (report.status === "valid") return vehicle;
  const next = { ...vehicle };
  if (report.discardedFields.includes("version")) next.version = undefined;
  return next;
}
