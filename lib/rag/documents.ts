import type { VehicleListing } from "@/types/listing";
import type { VehicleDocument } from "@/types/rag";
import type { KnownIssue } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

export function listingToDocument(listing: VehicleListing): VehicleDocument {
  const content = [
    listing.title,
    listing.price != null ? `Precio: ${listing.price} EUR` : null,
    listing.year != null ? `Año: ${listing.year}` : null,
    listing.mileage != null ? `Kilómetros: ${listing.mileage}` : null,
    listing.fuel ? `Combustible: ${listing.fuel}` : null,
    listing.transmission ? `Cambio: ${listing.transmission}` : null,
    listing.location ? `Ubicación: ${listing.location}` : null,
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
      isDemo: listing.isDemo,
    },
    timestamp: listing.fetchedAt,
    kind: "dynamic",
    isDemo: listing.isDemo,
  };
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
