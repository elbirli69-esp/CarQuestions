import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { issueToDocument, listingToDocument, vehicleSummaryDocument } from "@/lib/rag/documents";
import { retrieveDocuments } from "@/lib/rag/index";
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

    const stored = parsed.data.analysisId ? getAnalysis(parsed.data.analysisId) : undefined;
    const analysis = stored ?? (parsed.data.vehicle ? await analyzeVehicle(parsed.data.vehicle) : undefined);
    if (!analysis) {
      return jsonError("No hay un vehículo analizado para esta pregunta.", 404);
    }

    const documents = [
      vehicleSummaryDocument(analysis.vehicle),
      ...analysis.comparables.slice(0, 10).map(listingToDocument),
      ...analysis.reliability.knownIssues.map((issue) => issueToDocument(analysis.vehicle, issue)),
    ];
    const retrieved = await retrieveDocuments(
      {
        text: parsed.data.question,
        vehicle: {
          brand: analysis.vehicle.brand,
          model: analysis.vehicle.model,
          year: analysis.vehicle.year,
          fuel: analysis.vehicle.fuel,
          version: analysis.vehicle.version,
        },
        limit: 8,
      },
      documents,
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
        score: item.score,
        isDemo: item.document.isDemo,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
