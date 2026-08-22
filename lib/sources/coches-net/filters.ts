/**
 * Filtros de búsqueda coches.net vía segmentos de path (no query string).
 *
 * Observado en HTML de resultados (2026):
 * - `/bmw/x1/segunda-mano/2019/` — año de matriculación
 * - `/bmw/x1/segunda-mano/diesel/` — combustible
 * - `/bmw/x1/segunda-mano/2019/diesel/` — combinación
 * - `/bmw/x1/segunda-mano/madrid/` — provincia
 * - `/bmw/x1/segunda-mano/automaticos/` — cambio automático
 * Paginación: `?pg=2`
 */

import type { ComparableQuery } from "@/types/listing";
import type { FuelType, TransmissionType } from "@/types/vehicle";
import { toCochesNetSlug } from "@/lib/sources/coches-net/slug";

export interface CochesNetSearchFilters {
  year?: number;
  fuel?: FuelType;
  transmission?: TransmissionType;
  location?: string;
}

const FUEL_PATH: Partial<Record<FuelType, string>> = {
  diesel: "diesel",
  petrol: "gasolina",
  hybrid: "hibrido",
  plugin_hybrid: "hibrido-enchufable",
  electric: "electrico",
  lpg: "glp",
  cng: "gnc",
};

/** Provincias / CCAA → slug de path coches.net. */
const LOCATION_SLUGS: Record<string, string> = {
  madrid: "madrid",
  barcelona: "barcelona",
  valencia: "valencia",
  sevilla: "sevilla",
  malaga: "malaga",
  málaga: "malaga",
  bilbao: "bizkaia",
  vizcaya: "bizkaia",
  bizkaia: "bizkaia",
  asturias: "asturias",
  cantabria: "cantabria",
  valladolid: "valladolid",
  zaragoza: "zaragoza",
  murcia: "murcia",
  alicante: "alicante",
  granada: "granada",
  cordoba: "cordoba",
  córdoba: "cordoba",
  "a coruna": "a_coruna",
  "a coruña": "a_coruna",
  galicia: "galicia",
  andalucia: "andalucia",
  andalucía: "andalucia",
  cataluna: "cataluna",
  cataluña: "cataluna",
  catalonia: "cataluna",
};

export function fuelToPathSegment(fuel: FuelType | undefined): string | undefined {
  if (!fuel) return undefined;
  return FUEL_PATH[fuel];
}

export function locationToPathSegment(location: string | undefined): string | undefined {
  if (!location?.trim()) return undefined;
  const key = location
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (LOCATION_SLUGS[key]) return LOCATION_SLUGS[key];
  return toCochesNetSlug(location).replace(/-/g, "_");
}

export function transmissionToPathSegment(
  transmission: TransmissionType | undefined,
): string | undefined {
  if (transmission === "automatic") return "automaticos";
  return undefined;
}

export function filtersFromComparableQuery(query: ComparableQuery): CochesNetSearchFilters {
  return {
    year: query.year,
    fuel: query.fuel,
    transmission: query.transmission,
    location: query.location,
  };
}

export function buildFilterPathSegments(filters: CochesNetSearchFilters): string[] {
  const segments: string[] = [];
  if (filters.year != null && filters.year >= 1990 && filters.year <= 2030) {
    segments.push(String(filters.year));
  }
  const fuel = fuelToPathSegment(filters.fuel);
  if (fuel) segments.push(fuel);
  const location = locationToPathSegment(filters.location);
  if (location) segments.push(location);
  const auto = transmissionToPathSegment(filters.transmission);
  if (auto) segments.push(auto);
  return segments;
}
