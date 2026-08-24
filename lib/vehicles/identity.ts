import type { FieldConfidence, FieldSource } from "@/lib/vehicles/evidence";
import type { CatalogTrim } from "@/lib/vehicles/trims-types";
import type { Vehicle } from "@/types/vehicle";
import { findBrandByName, findModelInBrand } from "@/lib/vehicles/catalog";
import {
  getTrimsForModel,
  resolveTrimSelection,
  type ResolvedTrimFields,
} from "@/lib/vehicles/trims";

export interface FieldEvidence {
  field: string;
  label: string;
  value: string;
  source: FieldSource;
  confidence: FieldConfidence;
  verified: boolean;
}

export interface IdentityEvidenceChain {
  trimCatalogMatch: boolean;
  trimSlug?: string;
  trimName?: string;
  engineCode?: string;
  fields: FieldEvidence[];
  summary: string;
}

function prov(
  field: string,
  label: string,
  value: string | number,
  source: FieldSource,
  confidence: FieldConfidence,
  verified = false,
): FieldEvidence {
  return {
    field,
    label,
    value: String(value),
    source,
    confidence,
    verified,
  };
}

export interface ResolveIdentityResult {
  vehicle: Vehicle;
  trimResolution: ResolvedTrimFields & { trim?: CatalogTrim };
  evidence: IdentityEvidenceChain;
}

/**
 * Close the evidence chain at identity: catalog trim → canonical fields → provenance.
 */
export function resolveVehicleIdentity(
  vehicle: Vehicle,
  options?: { trimSlug?: string },
): ResolveIdentityResult {
  const brand = findBrandByName(vehicle.brand);
  const model = brand ? findModelInBrand(brand, vehicle.model) : undefined;

  let trimResolution: ResolvedTrimFields & { trim?: CatalogTrim } = {
    version: vehicle.version ?? "",
    trimCatalogMatch: false,
  };

  if (brand && model) {
    trimResolution = resolveTrimSelection({
      brandSlug: brand.slug,
      modelSlug: model.slug,
      trimSlug: options?.trimSlug,
      versionText: vehicle.version,
      fuel: vehicle.fuel,
      power: vehicle.power,
      transmission: vehicle.transmission,
      year: vehicle.year,
    });
  } else if (vehicle.version) {
    trimResolution = { version: vehicle.version, trimCatalogMatch: false };
  }

  const resolved: Vehicle = {
    ...vehicle,
    version: trimResolution.version || vehicle.version,
    fuel: trimResolution.fuel ?? vehicle.fuel,
    power: trimResolution.power ?? vehicle.power,
    transmission: trimResolution.transmission ?? vehicle.transmission,
  };

  const trimMatchedFuel =
    trimResolution.trimCatalogMatch &&
    trimResolution.trim != null &&
    trimResolution.trim.fuel === resolved.fuel;
  const trimMatchedPower =
    trimResolution.trimCatalogMatch &&
    trimResolution.trim != null &&
    trimResolution.trim.powerHp != null &&
    trimResolution.trim.powerHp === resolved.power;
  const trimMatchedTransmission =
    trimResolution.trimCatalogMatch &&
    trimResolution.trim != null &&
    trimResolution.trim.transmission != null &&
    trimResolution.trim.transmission === resolved.transmission;

  const fields: FieldEvidence[] = [
    prov("brand", "Marca", resolved.brand, "catalog", brand ? "high" : "medium", Boolean(brand)),
    prov("model", "Modelo", resolved.model, "catalog", model ? "high" : "medium", Boolean(model)),
  ];

  if (resolved.version) {
    fields.push(
      prov(
        "version",
        "Versión",
        resolved.version,
        trimResolution.trimCatalogMatch ? "catalog" : "user",
        trimResolution.trimCatalogMatch ? "high" : "medium",
        trimResolution.trimCatalogMatch,
      ),
    );
  }

  fields.push(
    prov(
      "fuel",
      "Combustible",
      resolved.fuel,
      trimMatchedFuel ? "catalog" : "user",
      trimMatchedFuel ? "high" : "high",
      trimMatchedFuel,
    ),
  );

  if (resolved.power != null) {
    fields.push(
      prov(
        "power",
        "Potencia",
        `${resolved.power} CV`,
        trimMatchedPower ? "catalog" : "user",
        trimMatchedPower ? "high" : "medium",
        trimMatchedPower,
      ),
    );
  }

  if (resolved.transmission) {
    fields.push(
      prov(
        "transmission",
        "Cambio",
        resolved.transmission,
        trimMatchedTransmission ? "catalog" : "user",
        trimMatchedTransmission ? "medium" : "medium",
        trimMatchedTransmission,
      ),
    );
  }

  fields.push(
    prov("year", "Año", resolved.year, "user", "high", false),
    prov("mileage", "Kilometraje", `${resolved.mileage} km`, "user", "high", false),
  );

  if (resolved.advertisedPrice != null) {
    fields.push(
      prov(
        "price",
        "Precio anunciado",
        `${resolved.advertisedPrice} €`,
        vehicle.listingUrl ? "listing" : "user",
        "medium",
        false,
      ),
    );
  }

  const trimCount =
    brand && model ? getTrimsForModel(brand.slug, model.slug).length : 0;

  const summary = trimResolution.trimCatalogMatch
    ? `Motorización identificada en catálogo (${trimResolution.trim?.name}). Combustible y potencia alineados con la ficha canónica.`
    : trimCount > 0
      ? "Versión no tomada del catálogo (texto libre). La coherencia combina catálogo y heurísticas."
      : "Sin catálogo de versiones para este modelo. Los datos dependen del formulario y el anuncio.";

  return {
    vehicle: resolved,
    trimResolution,
    evidence: {
      trimCatalogMatch: trimResolution.trimCatalogMatch,
      trimSlug: trimResolution.trimSlug,
      trimName: trimResolution.trim?.name,
      engineCode: trimResolution.engineCode ?? trimResolution.trim?.engineCode,
      fields,
      summary,
    },
  };
}
