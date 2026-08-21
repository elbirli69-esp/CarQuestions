import type { ComparableQuery, VehicleListing } from "@/types/listing";
import type { Vehicle } from "@/types/vehicle";
import { currentYear } from "@/lib/utils/format";
import { clamp, createSeededRandom, createVehicleId, normalizeKey, roundTo } from "@/lib/utils/math";

const MODEL_ANCHORS: Record<string, number> = {
  "bmw|x1": 29800,
  "bmw|x3": 36500,
  "bmw|serie 1": 24500,
  "bmw|serie 3": 31000,
  "audi|q3": 30500,
  "audi|a3": 25000,
  "mercedes|gla": 31500,
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

const BRAND_FALLBACK: Record<string, number> = {
  porsche: 52000,
  bmw: 28000,
  mercedes: 29000,
  "mercedes-benz": 29000,
  audi: 27000,
  volvo: 26000,
  lexus: 28000,
  toyota: 21000,
  volkswagen: 19000,
  cupra: 25000,
  seat: 17500,
  skoda: 18000,
  hyundai: 18500,
  kia: 18000,
  ford: 17000,
  peugeot: 17000,
  renault: 16000,
  citroen: 15500,
  dacia: 13000,
  tesla: 34000,
};

const CITIES = [
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Málaga",
  "Zaragoza",
  "Bilbao",
  "Alicante",
  "Murcia",
  "Valladolid",
];

const COMPETITORS: Record<string, Array<{ brand: string; model: string }>> = {
  "bmw|x1": [
    { brand: "Audi", model: "Q3" },
    { brand: "Mercedes-Benz", model: "GLA" },
    { brand: "Volvo", model: "XC40" },
  ],
  "audi|q3": [
    { brand: "BMW", model: "X1" },
    { brand: "Mercedes-Benz", model: "GLA" },
    { brand: "Volvo", model: "XC40" },
  ],
  "volkswagen|golf": [
    { brand: "SEAT", model: "León" },
    { brand: "Audi", model: "A3" },
    { brand: "BMW", model: "Serie 1" },
  ],
};

function vehicleKey(brand: string, model: string): string {
  return `${normalizeKey(brand)}|${normalizeKey(model)}`;
}

export function demoMarketAnchor(vehicle: Pick<Vehicle, "brand" | "model" | "year" | "mileage" | "power" | "transmission"> & { fuel?: Vehicle["fuel"] }): number {
  const key = vehicleKey(vehicle.brand, vehicle.model);
  const age = Math.max(0, currentYear() - vehicle.year);
  const known = MODEL_ANCHORS[key] ?? BRAND_FALLBACK[normalizeKey(vehicle.brand)] ?? 18000;
  const ageFromReference = age - 3;
  let base = known * Math.pow(0.93, ageFromReference);
  const expectedKm = Math.max(age, 1) * 15000;
  base -= (vehicle.mileage - expectedKm) * 0.055;
  if (vehicle.fuel === "diesel" && age >= 6) base -= 600;
  if (vehicle.fuel === "electric") base += 1800;
  if (vehicle.fuel === "hybrid" || vehicle.fuel === "plugin_hybrid") base += 900;
  if (vehicle.transmission === "automatic") base += 700;
  if (vehicle.transmission === "manual") base -= 250;
  if (vehicle.power) base += (vehicle.power - 140) * 18;
  return roundTo(clamp(base, 2500, 180000), 50);
}

function listingTitle(vehicle: { brand: string; model: string; version?: string; year?: number }): string {
  return [vehicle.brand, vehicle.model, vehicle.version, vehicle.year].filter(Boolean).join(" ");
}

export function buildDemoListings(
  query: ComparableQuery,
  source: string,
  count: number,
  offset = 0,
): VehicleListing[] {
  const seed = [source, query.brand, query.model, query.year, query.mileage, query.fuel, query.transmission, offset].join("|");
  const random = createSeededRandom(seed);
  const anchor = demoMarketAnchor(query);
  const fetchedAt = new Date().toISOString();
  const listings: VehicleListing[] = [];

  for (let i = 0; i < count; i += 1) {
    const yearDelta = Math.round((random() - 0.5) * 4);
    const year = clamp(query.year + yearDelta, query.year - 2, query.year + 2);
    const mileage = roundTo(query.mileage + (random() - 0.45) * 35000, 1000);
    const priceNoise = (random() - 0.48) * 0.22;
    const price = roundTo(anchor * (1 + priceNoise), 100);
    const city = CITIES[Math.floor(random() * CITIES.length)] ?? "Madrid";
    const version = query.version || undefined;

    listings.push({
      id: createVehicleId([source, query.brand, query.model, String(year), String(mileage), String(i + offset)]),
      source,
      url: `https://demo.carquestions.app/listing/${source}/${i + offset}`,
      title: listingTitle({ brand: query.brand, model: query.model, version, year }),
      brand: query.brand,
      model: query.model,
      version,
      year,
      mileage: Math.max(1000, mileage),
      fuel: query.fuel,
      transmission: query.transmission,
      power: query.power,
      bodyType: query.bodyType,
      price: Math.max(1500, price),
      location: city,
      sellerType: random() > 0.45 ? "dealer" : "private",
      publicationDate: new Date(Date.now() - Math.floor(random() * 1000 * 60 * 60 * 24 * 40)).toISOString(),
      isDemo: true,
      fetchedAt,
      dataKind: "dynamic",
      similarity: clamp(0.92 - Math.abs(yearDelta) * 0.04 - Math.abs(mileage - query.mileage) / 400000, 0.55, 0.98),
    });
  }

  return listings;
}

export function buildDemoAlternatives(query: ComparableQuery): VehicleListing[] {
  const key = vehicleKey(query.brand, query.model);
  const competitors = COMPETITORS[key] ?? [
    { brand: "Volkswagen", model: "Golf" },
    { brand: "Toyota", model: "Corolla" },
  ];

  return competitors.flatMap((competitor, index) => {
    const listings = buildDemoListings(
      {
        ...query,
        brand: competitor.brand,
        model: competitor.model,
        version: undefined,
      },
      "demo-alternatives",
      1,
      index * 10,
    );
    return listings.map((listing) => ({ ...listing, isCompetitor: true, similarity: 0.62 }));
  });
}

export function listingToVehicle(listing: VehicleListing, fallback: Vehicle): Vehicle {
  return {
    ...fallback,
    brand: listing.brand,
    model: listing.model,
    version: listing.version ?? fallback.version,
    year: listing.year ?? fallback.year,
    mileage: listing.mileage ?? fallback.mileage,
    fuel: listing.fuel ?? fallback.fuel,
    power: listing.power ?? fallback.power,
    transmission: listing.transmission ?? fallback.transmission,
    bodyType: listing.bodyType ?? fallback.bodyType,
    advertisedPrice: listing.price,
    location: listing.location ?? fallback.location,
  };
}
