import type { FuelType, TransmissionType } from "@/types/vehicle";

export interface CatalogTrim {
  slug: string;
  name: string;
  fuel: FuelType;
  powerHp?: number;
  yearFrom?: number;
  yearTo?: number;
  engineCode?: string;
  /** Código de caja (ej. DQ200) para conocimiento de plataforma compartida. */
  gearboxCode?: string;
  transmission?: TransmissionType;
  /** Human label for dropdown, e.g. "sDrive18d · 150 CV · Diésel" */
  label?: string;
}

export interface TrimCatalogEntry {
  brandSlug: string;
  modelSlug: string;
  trims: CatalogTrim[];
  /** Posición en ventas España (matriculaciones año ref). Menor = más prioritario para curación. */
  spainMarketRank?: number;
  /** Matriculaciones orientativas en España (año ref, ver data/spain-market-priority.json). */
  spainRegistrations?: number;
  /** Posición en top 100 mercado VO España (data/spain-used-market-priority.json). */
  spainUsedMarketRank?: number;
  /** Año típico mínimo de unidades en stock VO para este modelo. */
  voYearFrom?: number;
  /** Año típico máximo de unidades en stock VO. */
  voYearTo?: number;
}

export interface VehicleTrimCatalog {
  generatedAt: string;
  source: string;
  entries: TrimCatalogEntry[];
}
