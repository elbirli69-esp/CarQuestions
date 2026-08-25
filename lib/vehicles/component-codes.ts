import type { IdentityEvidenceChain } from "@/lib/vehicles/identity";
import type { CatalogTrim } from "@/lib/vehicles/trims-types";
import type { Vehicle } from "@/types/vehicle";
import { normalizeKey } from "@/lib/utils/math";

export interface VehicleComponentCodes {
  engineCode?: string;
  gearboxCode?: string;
  /** Normalized codes used for corpus matching (engine + gearbox). */
  codes: string[];
  /** At least one code from trim catalog or explicit vehicle fields. */
  catalogResolved: boolean;
  /** Codes inferred from version/description text (lower confidence). */
  textInferred: boolean;
}

function compactMotorKey(value: string): string {
  return normalizeKey(value).replace(/\s+/g, "");
}

/** Compare motor / gearbox codes from corpus with vehicle codes. */
export function motorCodesMatch(vehicleCodes: string[], chunkCodes: string[]): boolean {
  if (vehicleCodes.length === 0 || chunkCodes.length === 0) return false;
  const vehicleKeys = new Set(vehicleCodes.map(compactMotorKey));
  for (const chunkCode of chunkCodes) {
    const key = compactMotorKey(chunkCode);
    if (vehicleKeys.has(key)) return true;
    // Allow substring match for codes >= 4 chars (e.g. EA888 vs ea888tsi unlikely — skip broad match)
    for (const vk of vehicleKeys) {
      if (key.length >= 4 && vk.length >= 4 && (key.includes(vk) || vk.includes(key))) {
        return true;
      }
    }
  }
  return false;
}

const GEARBOX_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /\bdq\s*200\b/i, code: "DQ200" },
  { pattern: /\bdq\s*250\b/i, code: "DQ250" },
  { pattern: /\bdsg\b/i, code: "DSG" },
  { pattern: /\bzf\s*8\b/i, code: "ZF8" },
  { pattern: /\btiptronic\b/i, code: "Tiptronic" },
  { pattern: /\bpowershift\b/i, code: "PowerShift" },
];

function inferCodesFromText(text: string): { engine?: string; gearbox?: string } {
  const blob = text;
  let gearbox: string | undefined;
  for (const { pattern, code } of GEARBOX_PATTERNS) {
    if (pattern.test(blob)) {
      gearbox = code;
      break;
    }
  }
  return { gearbox };
}

/**
 * Resolve engine / gearbox codes for platform-level knowledge matching.
 */
export function resolveVehicleComponentCodes(
  vehicle: Vehicle,
  options?: {
    identity?: IdentityEvidenceChain;
    trim?: CatalogTrim;
  },
): VehicleComponentCodes {
  const engineCode =
    vehicle.engineCode ?? options?.trim?.engineCode ?? options?.identity?.engineCode ?? undefined;
  const gearboxCode =
    vehicle.gearboxCode ?? options?.trim?.gearboxCode ?? options?.identity?.gearboxCode ?? undefined;

  const catalogResolved = Boolean(
    options?.trim?.engineCode ||
      options?.trim?.gearboxCode ||
      options?.identity?.trimCatalogMatch &&
        (options?.identity?.engineCode || options?.identity?.gearboxCode),
  );

  const textBlob = [vehicle.version, vehicle.description, vehicle.equipment].filter(Boolean).join(" ");
  const inferred = inferCodesFromText(textBlob);
  const textInferred = Boolean(inferred.gearbox && !gearboxCode);

  const resolvedGearbox = gearboxCode ?? inferred.gearbox;
  const codes = [engineCode, resolvedGearbox].filter(Boolean) as string[];

  return {
    engineCode,
    gearboxCode: resolvedGearbox,
    codes,
    catalogResolved,
    textInferred,
  };
}
