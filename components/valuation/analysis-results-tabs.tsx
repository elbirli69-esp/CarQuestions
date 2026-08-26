"use client";

import { useCallback, useEffect, useState } from "react";
import { ComparableList } from "@/components/comparable-cars/comparable-list";
import { ContextualHelpSheet } from "@/components/help/contextual-help-sheet";
import { ListingAnalysisCard } from "@/components/listing-analysis/listing-analysis-card";
import { SellerQuestions } from "@/components/seller-questions/seller-questions";
import { SourcesPanel } from "@/components/sources/sources-panel";
import { IdentityEvidenceCard } from "@/components/valuation/identity-evidence-card";
import { InspectionChecklistCard } from "@/components/valuation/inspection-checklist-card";
import { MissingDataCard } from "@/components/valuation/missing-data-card";
import { PurchaseVerdictCard } from "@/components/valuation/purchase-verdict-card";
import { ScoreCard } from "@/components/valuation/score-card";
import { ValuationCard } from "@/components/valuation/valuation-card";
import { VehicleChat } from "@/components/vehicle-chat/vehicle-chat";
import { EditableListField } from "@/components/expert/editable-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExpertAnalysisPatch } from "@/lib/expert-mode/patch-analysis";
import {
  readContextHelpSeen,
  RESULT_TAB_HELP,
  resultTabContextId,
  type ResultTabId,
} from "@/lib/help/guide";
import type { AnalyzeResponse, SharedComponentSummary } from "@/types/valuation";

const EMPTY_SHARED_COMPONENTS: SharedComponentSummary = {
  available: false,
  issues: [],
  notes: [],
  isDemo: false,
  codesResolved: false,
};

function isResultTabId(value: string): value is ResultTabId {
  return value in RESULT_TAB_HELP;
}

export function AnalysisResultsTabs({
  analysis,
  identityBroken,
  hasMarketData,
  hasAlternatives,
  pendingQuestion,
  onQuestionChange,
  expertMode = false,
  onCurate,
}: {
  analysis: AnalyzeResponse;
  identityBroken: boolean;
  hasMarketData: boolean;
  hasAlternatives: boolean;
  pendingQuestion: string;
  onQuestionChange: (value: string) => void;
  expertMode?: boolean;
  onCurate?: (patch: ExpertAnalysisPatch) => void;
}) {
  const curate = onCurate ?? (() => undefined);
  const [activeTab, setActiveTab] = useState<ResultTabId>("summary");
  const [contextHelpOpen, setContextHelpOpen] = useState(false);
  const [contextHelpTab, setContextHelpTab] = useState<ResultTabId | null>(null);

  const maybeShowTabHelp = useCallback((tabId: ResultTabId) => {
    const contextId = resultTabContextId(tabId);
    if (readContextHelpSeen(contextId)) return;
    setContextHelpTab(tabId);
    setContextHelpOpen(true);
  }, []);

  useEffect(() => {
    maybeShowTabHelp("summary");
  }, [maybeShowTabHelp]);

  function handleTabChange(value: string) {
    if (!isResultTabId(value)) return;
    setActiveTab(value);
    maybeShowTabHelp(value);
  }

  const contextStep = contextHelpTab ? RESULT_TAB_HELP[contextHelpTab] : null;
  const contextId = contextHelpTab ? resultTabContextId(contextHelpTab) : "";

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full gap-4">
        <TabsList
          variant="line"
          className="w-full max-w-full flex-wrap justify-start gap-1 overflow-x-auto pb-1"
        >
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="market">Mercado</TabsTrigger>
          <TabsTrigger value="detail">Análisis</TabsTrigger>
          <TabsTrigger value="buy">Comprar</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="flex flex-col gap-6">
          {analysis.identityEvidence ? (
            <IdentityEvidenceCard
              evidence={analysis.identityEvidence}
              expertMode={expertMode}
              onSummaryChange={(value) => curate({ type: "identitySummary", value })}
              onFieldChange={(field, value) => curate({ type: "identityField", field, value })}
            />
          ) : null}
          {analysis.purchaseVerdict ? (
            <PurchaseVerdictCard
              verdict={analysis.purchaseVerdict}
              valuation={analysis.valuation}
              expertMode={expertMode}
              onVerdictChange={(patch) => curate({ type: "purchaseVerdict", patch })}
            />
          ) : null}
          {!identityBroken ? (
            <ValuationCard
              valuation={analysis.valuation}
              expertMode={expertMode}
              onValuationChange={(patch) => curate({ type: "valuation", patch })}
            />
          ) : null}
          {analysis.missingData ? (
            <MissingDataCard
              report={analysis.missingData}
              expertMode={expertMode}
              onHeadlineChange={(value) => curate({ type: "missingHeadline", value })}
              onItemReasonChange={(index, reason) => curate({ type: "missingItemReason", index, reason })}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="market" className="flex flex-col gap-6">
          <SourcesPanel
            sources={analysis.sources}
            listings={analysis.comparables}
            comparableCount={analysis.valuation.comparableCount}
            sourceCount={analysis.valuation.sourceCount}
            updatedAt={analysis.valuation.dataUpdatedAt}
            searchNotes={[...(analysis.searchNotes ?? []), ...(analysis.listingDetailNotes ?? [])]}
            matchStrictness={analysis.valuation.matchStrictness}
            emptyMessage="Sin anuncios comparables suficientes. No se inventa un precio de mercado."
          />
          {hasMarketData && !identityBroken ? (
            <ComparableList
              title="Coches similares"
              description={`${analysis.comparables.length} anuncios comparables observados del mismo modelo.`}
              listings={analysis.comparables}
            />
          ) : null}
          {hasAlternatives ? (
            <ComparableList
              title="Alternativas del segmento"
              description="Rivales comparables para valorar otras opciones."
              listings={analysis.alternatives}
              onAsk={(nextQuestion) => onQuestionChange(nextQuestion)}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="detail" className="flex flex-col gap-6">
          <ScoreCard
            scores={analysis.scores}
            expertMode={expertMode}
            onSummaryChange={(value) => curate({ type: "scoresSummary", value })}
            onDimensionChange={(id, patch) => curate({ type: "scoreDimension", id, patch })}
          />
          <ListingAnalysisCard
            analysis={analysis.listingAnalysis}
            reliability={analysis.reliability}
            sharedComponents={analysis.sharedComponents ?? EMPTY_SHARED_COMPONENTS}
            maintenance={analysis.maintenance}
            expertMode={expertMode}
            onAnalysisChange={(patch) => curate({ type: "listingAnalysis", patch })}
            onListChange={(field, value) => curate({ type: "listingList", field, value })}
            onKnownIssueChange={(index, patch) => curate({ type: "knownIssue", index, patch })}
            onReliabilityNoteChange={(index, value) => curate({ type: "reliabilityNote", index, value })}
            onSharedComponentIssueChange={(index, patch) =>
              curate({ type: "sharedComponentIssue", index, patch })
            }
            onSharedComponentNoteChange={(index, value) =>
              curate({ type: "sharedComponentNote", index, value })
            }
          />
        </TabsContent>

        <TabsContent value="buy" className="flex flex-col gap-6">
          <SellerQuestions
            questions={analysis.sellerQuestions}
            expertMode={expertMode}
            onQuestionChange={(index, patch) => curate({ type: "sellerQuestion", index, patch })}
          />
          {analysis.inspectionChecklist ? (
            <InspectionChecklistCard
              checklist={analysis.inspectionChecklist}
              expertMode={expertMode}
              onItemChange={(phaseId, itemIndex, patch) =>
                curate({ type: "checklistItem", phaseId, itemIndex, patch })
              }
            />
          ) : null}
        </TabsContent>

        <TabsContent value="chat" className="flex flex-col gap-6">
          <VehicleChat
            analysisId={analysis.id}
            vehicle={analysis.vehicle}
            question={pendingQuestion}
            onQuestionChange={onQuestionChange}
          />
        </TabsContent>

        {analysis.limitations.length > 0 || expertMode ? (
          <Alert>
            <AlertTitle>Limitaciones</AlertTitle>
            <AlertDescription>
              <EditableListField
                expertMode={expertMode}
                items={analysis.limitations}
                label="Limitaciones del análisis"
                emptyHint="Sin limitaciones indicadas."
                onChange={(value) => curate({ type: "limitations", value })}
              />
            </AlertDescription>
          </Alert>
        ) : null}
      </Tabs>

      <ContextualHelpSheet
        step={contextStep}
        contextId={contextId}
        open={contextHelpOpen}
        onOpenChange={setContextHelpOpen}
      />
    </>
  );
}
