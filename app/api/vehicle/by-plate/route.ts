import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { lookupVehicleByPlate } from "@/lib/sources/plate/lookup";
import { plateLookupSchema } from "@/lib/vehicles/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = plateLookupSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Introduce una matrícula válida.", 400, parsed.error.issues);
    }

    const result = await lookupVehicleByPlate(parsed.data.plate);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
