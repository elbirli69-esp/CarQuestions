import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { searchAllComparables } from "@/lib/sources/registry";
import { valueVehicle } from "@/lib/valuation/engine";
import { vehicleInputSchema } from "@/lib/vehicles/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = vehicleInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Revisa los datos del vehículo.", 400, parsed.error.issues);
    }

    const search = await searchAllComparables(parsed.data);
    const valuation = valueVehicle(parsed.data, search.listings);
    return NextResponse.json({
      valuation,
      comparableCount: search.listings.length,
      isDemo: search.isDemo,
      notes: search.notes,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
