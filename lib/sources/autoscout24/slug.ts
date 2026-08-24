import type { ComparableQuery } from "@/types/listing";

const BASE = "https://www.autoscout24.es";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSearchUrlFromQuery(query: ComparableQuery, page = 1): string {
  const brand = slugify(query.brand);
  const model = slugify(query.model);
  const params = new URLSearchParams({
    sort: "standard",
    desc: "0",
    ustate: "N,U",
    size: "20",
    page: String(page),
  });
  return `${BASE}/lst/${brand}/${model}?${params.toString()}`;
}
