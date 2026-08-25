import type { AnalyzeResponse, SellerQuestion, ScoreDimension } from "@/types/valuation";
import type { PurchaseVerdict } from "@/lib/vehicles/purchase-verdict";

export type ExpertAnalysisPatch =
  | { type: "purchaseVerdict"; patch: Partial<PurchaseVerdict> }
  | { type: "valuation"; patch: Partial<AnalyzeResponse["valuation"]> }
  | { type: "identitySummary"; value: string }
  | { type: "identityField"; field: string; value: string }
  | { type: "sellerQuestion"; index: number; patch: Partial<SellerQuestion> }
  | { type: "checklistItem"; phaseId: string; itemIndex: number; patch: { item?: string; reason?: string } }
  | { type: "limitations"; value: string[] }
  | { type: "scoresSummary"; value: string }
  | { type: "scoreDimension"; id: string; patch: Partial<ScoreDimension> }
  | { type: "consistencySummary"; value: string }
  | { type: "consistencyIssue"; index: number; message: string }
  | { type: "missingHeadline"; value: string }
  | { type: "missingItemReason"; index: number; reason: string }
  | { type: "listingAnalysis"; patch: Partial<AnalyzeResponse["listingAnalysis"]> }
  | { type: "listingList"; field: "likes" | "concerns" | "askSeller" | "inspectBeforeBuying"; value: string[] }
  | { type: "reliabilityNote"; index: number; value: string }
  | { type: "knownIssue"; index: number; patch: { title?: string; detail?: string } };

export function applyExpertPatch(analysis: AnalyzeResponse, patch: ExpertAnalysisPatch): AnalyzeResponse {
  const next: AnalyzeResponse = structuredClone(analysis);

  switch (patch.type) {
    case "purchaseVerdict":
      if (next.purchaseVerdict) {
        next.purchaseVerdict = { ...next.purchaseVerdict, ...patch.patch };
      }
      break;
    case "valuation":
      next.valuation = { ...next.valuation, ...patch.patch };
      break;
    case "identitySummary":
      if (next.identityEvidence) next.identityEvidence.summary = patch.value;
      break;
    case "identityField":
      if (next.identityEvidence) {
        const field = next.identityEvidence.fields.find((f) => f.field === patch.field);
        if (field) field.value = patch.value;
      }
      break;
    case "sellerQuestion":
      if (next.sellerQuestions[patch.index]) {
        next.sellerQuestions[patch.index] = {
          ...next.sellerQuestions[patch.index],
          ...patch.patch,
        };
      }
      break;
    case "checklistItem":
      if (next.inspectionChecklist) {
        const phase = next.inspectionChecklist.phases.find((p) => p.id === patch.phaseId);
        if (phase?.items[patch.itemIndex]) {
          phase.items[patch.itemIndex] = { ...phase.items[patch.itemIndex], ...patch.patch };
        }
      }
      break;
    case "limitations":
      next.limitations = patch.value;
      break;
    case "scoresSummary":
      next.scores.summary = patch.value;
      break;
    case "scoreDimension":
      const dim = next.scores.dimensions.find((d) => d.id === patch.id);
      if (dim) Object.assign(dim, patch.patch);
      break;
    case "consistencySummary":
      if (next.consistency) next.consistency.summary = patch.value;
      break;
    case "consistencyIssue":
      if (next.consistency?.issues[patch.index]) {
        next.consistency.issues[patch.index].message = patch.message;
      }
      break;
    case "missingHeadline":
      if (next.missingData) next.missingData.headline = patch.value;
      break;
    case "missingItemReason":
      if (next.missingData?.items[patch.index]) {
        next.missingData.items[patch.index].reason = patch.reason;
      }
      break;
    case "listingAnalysis":
      next.listingAnalysis = { ...next.listingAnalysis, ...patch.patch };
      break;
    case "listingList":
      next.listingAnalysis[patch.field] = patch.value;
      break;
    case "reliabilityNote":
      if (next.reliability.notes[patch.index] !== undefined) {
        next.reliability.notes[patch.index] = patch.value;
      }
      break;
    case "knownIssue":
      if (next.reliability.knownIssues[patch.index]) {
        next.reliability.knownIssues[patch.index] = {
          ...next.reliability.knownIssues[patch.index],
          ...patch.patch,
        };
      }
      break;
  }

  next.expertCurated = true;
  next.expertCuratedAt = new Date().toISOString();
  return next;
}
