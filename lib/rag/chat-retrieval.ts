import {
  issueToDocument,
  knowledgeChunkIdsToDocuments,
  listingDetailDocuments,
  listingToDocument,
  marketStatsDocument,
  sharedComponentToDocument,
  vehicleSummaryDocument,
} from "@/lib/rag/documents";
import { buildVehicleKnowledgeQuery } from "@/lib/rag/knowledge/retrieval-query";
import { retrieveDocuments } from "@/lib/rag/retrieval";
import { resolveVehicleComponentCodes } from "@/lib/vehicles/component-codes";
import type { AnalyzeResponse } from "@/types/valuation";
import type { VehicleDocument } from "@/types/rag";
import type { ParsedCochesNetDetail } from "@/lib/sources/coches-net/parse-listing";

export function buildAnalysisKnowledgeDocuments(analysis: AnalyzeResponse): VehicleDocument[] {
  const vehicle = analysis.vehicle;
  const chunkDocs = knowledgeChunkIdsToDocuments(
    vehicle,
    analysis.knowledgeContext?.chunkIds ?? [],
  );
  const modelIssues = analysis.reliability.knownIssues.map((issue, index) =>
    issueToDocument(vehicle, issue, index),
  );
  const sharedIssues =
    analysis.sharedComponents?.issues.map((issue, index) =>
      sharedComponentToDocument(vehicle, issue, index),
    ) ?? [];

  return [...chunkDocs, ...modelIssues, ...sharedIssues];
}

export function buildChatRetrievalContext(
  analysis: AnalyzeResponse,
  question: string,
  listingDetailDocs: ReturnType<typeof listingDetailDocuments>,
) {
  const codes = resolveVehicleComponentCodes(analysis.vehicle, {
    identity: analysis.identityEvidence
      ? {
          trimCatalogMatch: analysis.identityEvidence.trimCatalogMatch,
          engineCode: analysis.identityEvidence.engineCode,
          gearboxCode: analysis.identityEvidence.gearboxCode,
          fields: analysis.identityEvidence.fields,
          summary: analysis.identityEvidence.summary,
        }
      : undefined,
  });

  const knowledgeDocs = buildAnalysisKnowledgeDocuments(analysis);

  const dynamicDocuments = [
    vehicleSummaryDocument(analysis.vehicle),
    marketStatsDocument(analysis.valuation, analysis.comparables),
    ...analysis.comparables.slice(0, 15).map(listingToDocument),
    ...listingDetailDocs,
    ...knowledgeDocs,
  ];

  const pinnedIds = [
    ...knowledgeDocs.map((doc) => doc.id),
    ...analysis.reliability.knownIssues.map((issue, i) =>
      `issue_model_${i}_${issue.title.slice(0, 40)}`,
    ),
  ];

  const query = buildVehicleKnowledgeQuery(analysis.vehicle, {
    limit: 14,
    componentCodes: codes,
    extraTerms: [question],
  });

  return {
    codes,
    query: { ...query, text: question, limit: 14 },
    dynamicDocuments,
    pinnedIds,
  };
}

export async function retrieveForVehicleQuestion(
  analysis: AnalyzeResponse,
  question: string,
  listingDetail?: ParsedCochesNetDetail | null,
) {
  const listingDetailDocs = listingDetail
    ? listingDetailDocuments(analysis.vehicle, listingDetail)
    : [];

  const { query, dynamicDocuments, pinnedIds } = buildChatRetrievalContext(
    analysis,
    question,
    listingDetailDocs,
  );

  return retrieveDocuments(query, dynamicDocuments, {
    pinnedDocumentIds: pinnedIds,
    pinnedMinScore: 0.75,
  });
}
