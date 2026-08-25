import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getAnalysis, saveAnalysis } from "@/lib/store/vehicle-store";
import type { AnalyzeResponse } from "@/types/valuation";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as AnalyzeResponse;
    if (!body || body.id !== id) {
      return jsonError("El análisis enviado no coincide con el id solicitado.", 400);
    }
    body.expertCurated = true;
    body.expertCuratedAt = body.expertCuratedAt ?? new Date().toISOString();
    await saveAnalysis(body);
    return NextResponse.json(body);
  } catch (error) {
    return handleRouteError(error);
  }
}
