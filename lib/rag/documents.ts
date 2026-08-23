import type { VehicleListing } from "@/types/listing";
import type { VehicleDocument } from "@/types/rag";
import type { KnownIssue, ValuationResult } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import type { ParsedCochesNetDetail } from "@/lib/sources/coches-net/parse-listing";

const CHUNK_SIZE = 400;

function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export function listingToDocument(listing: VehicleListing): VehicleDocument {
  const rawDesc =
    typeof listing.rawData?.description === "string" ? listing.rawData.description : undefined;
  const daysOnMarket =
    typeof listing.rawData?.daysOnMarket === "number" ? listing.rawData.daysOnMarket : undefined;

  const content = [
    listing.title,
    listing.price != null ? `Precio: ${listing.price} EUR` : null,
    listing.year != null ? `Año: ${listing.year}` : null,
    listing.mileage != null ? `Kilómetros: ${listing.mileage}` : null,
    listing.fuel ? `Combustible: ${listing.fuel}` : null,
    listing.transmission ? `Cambio: ${listing.transmission}` : null,
    listing.power != null ? `${listing.power} CV` : null,
    listing.location ? `Ubicación: ${listing.location}` : null,
    listing.similarity != null
      ? `Similitud con tu búsqueda: ${(listing.similarity * 100).toFixed(0)} %`
      : null,
    daysOnMarket != null ? `Publicado hace ${daysOnMarket} días` : null,
    listing.equipment?.length ? `Equipamiento: ${listing.equipment.join(", ")}` : null,
    rawDesc ? `Descripción: ${rawDesc.slice(0, 300)}` : null,
    listing.isDemo ? "Dato de demostración. No es un anuncio real." : null,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    id: `doc_${listing.id}`,
    source: listing.source,
    url: listing.url,
    vehicle: {
      brand: listing.brand,
      model: listing.model,
      version: listing.version,
      year: listing.year,
    },
    content,
    metadata: {
      price: listing.price,
      mileage: listing.mileage,
      similarity: listing.similarity,
      daysOnMarket,
      isDemo: listing.isDemo,
      docKind: "comparable",
    },
    timestamp: listing.fetchedAt,
    kind: "dynamic",
    isDemo: listing.isDemo,
  };
}

export function marketStatsDocument(
  valuation: ValuationResult,
  comparables: VehicleListing[],
): VehicleDocument {
  const avgSim =
    comparables.length > 0
      ? comparables.reduce((sum, l) => sum + (l.similarity ?? 0), 0) / comparables.length
      : 0;

  const content = [
    valuation.estimatedPrice != null
      ? `Precio estimado mercado: ${valuation.estimatedPrice} EUR`
      : "Sin precio de mercado observado",
    valuation.low != null && valuation.high != null
      ? `Intervalo: ${valuation.low}–${valuation.high} EUR`
      : null,
    `Confianza: ${valuation.confidence} %`,
    valuation.matchStrictness ? `Filtros: ${valuation.matchStrictness}` : null,
    `Comparables usados: ${valuation.comparableCount}`,
    valuation.distribution.count > 0
      ? `P25 ${valuation.distribution.p25} EUR, mediana ${valuation.distribution.median} EUR, P75 ${valuation.distribution.p75} EUR`
      : null,
    avgSim > 0 ? `Similitud media comparables: ${(avgSim * 100).toFixed(0)} %` : null,
    valuation.advertisedPrice && valuation.percentDifference != null
      ? `Precio anunciado vs mercado: ${valuation.percentDifference} %`
      : null,
    valuation.verdictLabel,
    valuation.insufficientMarketData ? "Mercado insuficiente: no inventar precisión" : null,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    id: "market_stats",
    source: "valuation",
    content,
    metadata: {
      docKind: "market_stats",
      confidence: valuation.confidence,
      matchStrictness: valuation.matchStrictness,
    },
    timestamp: valuation.dataUpdatedAt,
    kind: "dynamic",
    isDemo: false,
  };
}

export function listingDetailDocuments(
  vehicle: Vehicle,
  detail: ParsedCochesNetDetail,
): VehicleDocument[] {
  const baseContent = [
    detail.title ?? `${vehicle.brand} ${vehicle.model}`,
    detail.price != null ? `Precio anuncio: ${detail.price} EUR` : null,
    detail.year != null ? `Año: ${detail.year}` : null,
    detail.mileage != null ? `Kilómetros: ${detail.mileage}` : null,
    detail.fuel ? `Combustible: ${detail.fuel}` : null,
    detail.transmission ? `Cambio: ${detail.transmission}` : null,
    detail.daysOnMarket != null ? `Publicado hace ${detail.daysOnMarket} días` : null,
    detail.equipment?.length ? `Equipamiento detectado: ${detail.equipment.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  const docs: VehicleDocument[] = [
    {
      id: "listing_detail_summary",
      source: "coches.net",
      url: detail.url,
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        version: vehicle.version,
        year: vehicle.year,
      },
      content: baseContent,
      metadata: { docKind: "listing_detail" },
      timestamp: new Date().toISOString(),
      kind: "dynamic",
      isDemo: false,
    },
  ];

  if (detail.description && detail.description.length > 80) {
    const chunks = chunkText(detail.description);
    for (let i = 0; i < chunks.length; i += 1) {
      docs.push({
        id: `listing_detail_chunk_${i}`,
        source: "coches.net",
        url: detail.url,
        vehicle: {
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
        },
        content: chunks[i]!,
        metadata: { docKind: "listing_description", chunkIndex: i },
        timestamp: new Date().toISOString(),
        kind: "dynamic",
        isDemo: false,
      });
    }
  }

  return docs;
}

export function issueToDocument(vehicle: Vehicle, issue: KnownIssue): VehicleDocument {
  return {
    id: `issue_${issue.title}`,
    source: issue.source,
    vehicle: {
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
    },
    content: `${issue.title}. ${issue.detail} Aplica cuando: ${issue.appliesWhen}.`,
    metadata: {
      severity: issue.severity,
      isDemo: issue.isDemo,
    },
    timestamp: new Date().toISOString(),
    kind: "static",
    isDemo: issue.isDemo,
  };
}

export function vehicleSummaryDocument(vehicle: Vehicle): VehicleDocument {
  const content = [
    `${vehicle.brand} ${vehicle.model} ${vehicle.version ?? ""}`.trim(),
    `Año ${vehicle.year}, ${vehicle.mileage} km, ${vehicle.fuel}`,
    vehicle.power ? `${vehicle.power} CV` : null,
    vehicle.transmission ? `Cambio ${vehicle.transmission}` : null,
    vehicle.advertisedPrice ? `Precio anunciado ${vehicle.advertisedPrice} EUR` : null,
    vehicle.equipment ? `Equipamiento: ${vehicle.equipment}` : null,
    vehicle.maintenanceHistory ? `Mantenimiento: ${vehicle.maintenanceHistory}` : null,
    vehicle.accidents ? `Accidentes: ${vehicle.accidents}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    id: "vehicle_input",
    source: "user-input",
    vehicle: {
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version,
      year: vehicle.year,
    },
    content,
    metadata: { origin: "user" },
    timestamp: new Date().toISOString(),
    kind: "static",
    isDemo: false,
  };
}
