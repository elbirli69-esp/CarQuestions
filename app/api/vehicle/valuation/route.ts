import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { searchAllComparables } from "@/lib/sources/registry";
import { marketToLegacyValuation } from "@/lib/valuation/market-adapter";
import { valueOnMarket } from "@/lib/valuation/market-engine";
import { validateVehicleConsistency } from "@/lib/vehicles/identity/consistency";
import { vehicleInputSchema } from "@/lib/vehicles/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = vehicleInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Revisa los datos del vehículo.", 400, parsed.error.issues);
    }

    const identity = validateVehicleConsistency(parsed.data);
    const search = await searchAllComparables(parsed.data);
    const comparables = search.listings.filter((l) => !l.isDemo);
    const market = valueOnMarket({
      vehicle: parsed.data,
      identity,
      listings: comparables,
      searchNotes: search.notes,
    });

    return NextResponse.json({
      market,
      valuation: marketToLegacyValuation(market),
      identity: { status: identity.status, issues: identity.issues },
      comparableCount: market.comparableCount,
      isDemo: search.isDemo,
      notes: search.notes,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
