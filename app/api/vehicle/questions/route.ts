import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { fetchListingDetail } from "@/lib/sources/coches-net/fetch-listing-detail";
import { retrieveForVehicleQuestion } from "@/lib/rag/chat-retrieval";
import { getAnalysis } from "@/lib/store/vehicle-store";
import { analyzeVehicle, toVehicleContext } from "@/lib/vehicles/analyze";
import { questionRequestSchema } from "@/lib/vehicles/schema";
import { getAIProvider } from "@/providers/ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = questionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("La pregunta no es válida.", 400, parsed.error.issues);
    }

    const stored = parsed.data.analysisId ? await getAnalysis(parsed.data.analysisId) : undefined;
    const analysis = stored ?? (parsed.data.vehicle ? await analyzeVehicle(parsed.data.vehicle) : undefined);
    if (!analysis) {
      return jsonError("No hay un vehículo analizado para esta pregunta.", 404);
    }

    let listingDetail: Awaited<ReturnType<typeof fetchListingDetail>> = null;
    if (analysis.vehicle.listingUrl) {
      listingDetail = await fetchListingDetail(analysis.vehicle.listingUrl);
    }

    const retrieved = await retrieveForVehicleQuestion(
      analysis,
      parsed.data.question,
      listingDetail,
    );

    const context = {
      ...toVehicleContext(analysis),
      retrievedDocuments: retrieved,
    };

    const answer = await getAIProvider().answerQuestion(
      parsed.data.question,
      context,
      parsed.data.history ?? [],
    );

    return NextResponse.json({
      answer,
      analysisId: analysis.id,
      retrieved: retrieved.map((item) => ({
        id: item.document.id,
        source: item.document.source,
        url: item.document.url ?? null,
        score: item.score,
        isDemo: item.document.isDemo,
        chunkId: (item.document.metadata?.chunkId as string | undefined) ?? null,
        chunkType: item.document.metadata?.chunkType ?? item.document.metadata?.docKind ?? null,
        evidenceLevel: item.document.metadata?.evidenceLevel ?? null,
        severity: item.document.metadata?.severity ?? null,
        matchConfidence: item.document.metadata?.matchConfidence ?? null,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
