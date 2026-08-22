import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getAnalysis } from "@/lib/store/vehicle-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const analysis = await getAnalysis(id);
    if (!analysis) {
      return jsonError(
        "No se ha encontrado este análisis (caducó o no hay almacén persistente). Vuelve a analizar el coche. En Vercel configura Upstash Redis (UPSTASH_REDIS_REST_URL/TOKEN).",
        404,
      );
    }
    return NextResponse.json(analysis);
  } catch (error) {
    return handleRouteError(error);
  }
}
