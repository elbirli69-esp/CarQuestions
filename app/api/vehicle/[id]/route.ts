import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { getAnalysis } from "@/lib/store/vehicle-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const analysis = getAnalysis(id);
    if (!analysis) {
      return jsonError(
        "No se ha encontrado este análisis. En Vercel el almacén en memoria no persiste entre invocaciones; vuelve a analizar el coche.",
        404,
      );
    }
    return NextResponse.json(analysis);
  } catch (error) {
    return handleRouteError(error);
  }
}
