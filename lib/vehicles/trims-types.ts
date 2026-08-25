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
}

export interface VehicleTrimCatalog {
  generatedAt: string;
  source: string;
  entries: TrimCatalogEntry[];
}
