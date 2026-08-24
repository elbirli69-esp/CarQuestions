import type { SegmentReference } from "@/types/market";
import type { Vehicle } from "@/types/vehicle";
import { currentYear } from "@/lib/utils/format";
import { clamp, normalizeKey, roundTo } from "@/lib/utils/math";

/**
 * Anclas de precio por modelo.
 *
 * Es una tabla interna, escrita a mano, con el precio típico de un ejemplar de
 * ~3 años en el mercado español. NO procede de ninguna fuente automatizada, y
 * por eso solo se muestra como "orden de magnitud", nunca como precio de
 * mercado ni como tasación.
 *
 * Deliberadamente no hay valor por defecto ni fallback por marca: para un
 * modelo que no esté aquí devolvemos null antes que inventar una cifra.
 */
const MODEL_ANCHORS: Record<string, number> = {
  "bmw|x1": 29800,
  "bmw|x3": 36500,
  "bmw|serie 1": 24500,
  "bmw|serie 3": 31000,
  "audi|q3": 30500,
  "audi|a3": 25000,
  "mercedes-benz|gla": 31500,
  "volkswagen|t-roc": 24000,
  "volkswagen|golf": 21000,
  "seat|leon": 19500,
  "seat|ateca": 23000,
  "volvo|xc40": 32000,
  "toyota|corolla": 22000,
  "toyota|rav4": 31000,
  "hyundai|tucson": 24500,
  "kia|sportage": 24000,
  "renault|megane": 17500,
  "peugeot|3008": 23000,
  "cupra|formentor": 28500,
};

const REFERENCE_AGE_YEARS = 3;
const ANNUAL_DEPRECIATION = 0.93;
const EXPECTED_KM_PER_YEAR = 15000;

function anchorKey(brand: string, model: string): string {
  const normalizedBrand = normalizeKey(brand)
    .replace(/^mercedes( benz)?$/, "mercedes-benz")
    .replace(/^vw$/, "volkswagen");
  return `${normalizedBrand}|${normalizeKey(model)}`;
}

/**
 * Orden de magnitud del segmento cuando no hay mercado observable.
 * Devuelve null si el modelo no tiene ancla: preferimos no decir nada.
 */
export function segmentReferenceFor(vehicle: Vehicle): SegmentReference | null {
  const anchor = MODEL_ANCHORS[anchorKey(vehicle.brand, vehicle.model)];
  if (!anchor) return null;

  const age = Math.max(0, currentYear() - vehicle.year);
  let base = anchor * Math.pow(ANNUAL_DEPRECIATION, age - REFERENCE_AGE_YEARS);
  base -= (vehicle.mileage - Math.max(age, 1) * EXPECTED_KM_PER_YEAR) * 0.055;

  // El redondeo a 1.000 € recuerda visualmente que no es una tasación.
  const value = roundTo(clamp(base, 2000, 180000), 1000);

  return {
    value,
    basis: `Ancla interna de ${vehicle.brand} ${vehicle.model} a ${REFERENCE_AGE_YEARS} años, ajustada por antigüedad y kilometraje.`,
    disclaimer:
      "Es un orden de magnitud escrito a mano, no un precio de mercado ni una tasación. No lo uses para negociar.",
  };
}

export function hasSegmentAnchor(brand: string, model: string): boolean {
  return Boolean(MODEL_ANCHORS[anchorKey(brand, model)]);
}
