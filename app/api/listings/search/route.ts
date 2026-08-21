import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { searchAllComparables } from "@/lib/sources/registry";
import { listingSearchSchema } from "@/lib/vehicles/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = listingSearchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("La búsqueda no es válida.", 400, parsed.error.issues);
    }

    const result = await searchAllComparables(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
