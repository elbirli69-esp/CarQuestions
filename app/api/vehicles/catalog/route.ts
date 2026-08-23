import { NextResponse } from "next/server";
import { getVehicleCatalog } from "@/lib/vehicles/catalog";

export async function GET() {
  const catalog = getVehicleCatalog();
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
