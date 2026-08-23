import catalogData from "@/data/vehicle-catalog.json";
import supplementData from "@/data/vehicle-catalog-supplement.json";
import {
  normalizeCatalogKey,
  slugToBrandName,
  slugToModelName,
  type CatalogBrand,
  type CatalogModel,
  type VehicleCatalog,
} from "@/lib/vehicles/catalog-types";

function mergeCatalogs(base: VehicleCatalog, extra: VehicleCatalog): VehicleCatalog {
  const map = new Map<string, CatalogBrand>();

  for (const brand of base.brands) {
    map.set(brand.slug, { ...brand, models: [...brand.models] });
  }

  for (const brand of extra.brands) {
    const existing = map.get(brand.slug);
    if (!existing) {
      map.set(brand.slug, brand);
      continue;
    }
    const modelsMap = new Map(existing.models.map((model) => [model.slug, model]));
    for (const model of brand.models) {
      modelsMap.set(model.slug, model);
    }
    existing.models = [...modelsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  return {
    generatedAt: base.generatedAt,
    source: base.source,
    brands: [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

const catalog = mergeCatalogs(
  catalogData as VehicleCatalog,
  supplementData as VehicleCatalog,
);

export function getVehicleCatalog(): VehicleCatalog {
  return catalog;
}

export function getCatalogBrands(): CatalogBrand[] {
  return catalog.brands;
}

export function findBrandBySlug(slug: string): CatalogBrand | undefined {
  return catalog.brands.find((brand) => brand.slug === slug);
}

export function findBrandByName(name: string): CatalogBrand | undefined {
  const key = normalizeCatalogKey(name);
  return catalog.brands.find(
    (brand) =>
      normalizeCatalogKey(brand.name) === key ||
      brand.slug === key.replace(/\s+/g, "-") ||
      normalizeCatalogKey(slugToBrandName(brand.slug)) === key,
  );
}

export function findModelInBrand(brand: CatalogBrand, modelName: string): CatalogModel | undefined {
  const key = normalizeCatalogKey(modelName);
  return brand.models.find(
    (model) =>
      normalizeCatalogKey(model.name) === key ||
      model.slug === key.replace(/\s+/g, "-") ||
      normalizeCatalogKey(slugToModelName(model.slug)) === key,
  );
}

export function resolveCatalogSelection(
  brandInput: string,
  modelInput: string,
): { brand?: CatalogBrand; model?: CatalogModel } {
  const brand = findBrandByName(brandInput);
  if (!brand) return {};
  const model = findModelInBrand(brand, modelInput);
  return { brand, model };
}
