import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { analyzeVehicle } from "@/lib/vehicles/analyze";
import { vehicleInputSchema } from "@/lib/vehicles/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = vehicleInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Revisa los datos del vehículo.", 400, parsed.error.issues);
    }

    const analysis = await analyzeVehicle(parsed.data);
    return NextResponse.json(analysis);
  } catch (error) {
    return handleRouteError(error);
  }
}
