"use client";

import { ComparableList } from "@/components/comparable-cars/comparable-list";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyzeResponse } from "@/types/valuation";

export function AnalysisResultsTabs({
  analysis,
  identityBroken,
  hasMarketData,
  hasAlternatives,
  pendingQuestion,
  onQuestionChange,
}: {
  analysis: AnalyzeResponse;
  identityBroken: boolean;
  hasMarketData: boolean;
  hasAlternatives: boolean;
  pendingQuestion: string;
  onQuestionChange: (value: string) => void;
}) {
  return (
    <Tabs defaultValue="summary" className="w-full gap-4">
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
          <IdentityEvidenceCard evidence={analysis.identityEvidence} />
        ) : null}
        {analysis.purchaseVerdict ? (
          <PurchaseVerdictCard verdict={analysis.purchaseVerdict} valuation={analysis.valuation} />
        ) : null}
        {!identityBroken ? <ValuationCard valuation={analysis.valuation} /> : null}
        {analysis.missingData ? <MissingDataCard report={analysis.missingData} /> : null}
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
        <ScoreCard scores={analysis.scores} />
        <ListingAnalysisCard
          analysis={analysis.listingAnalysis}
          reliability={analysis.reliability}
          maintenance={analysis.maintenance}
        />
      </TabsContent>

      <TabsContent value="buy" className="flex flex-col gap-6">
        <SellerQuestions questions={analysis.sellerQuestions} />
        {analysis.inspectionChecklist ? (
          <InspectionChecklistCard checklist={analysis.inspectionChecklist} />
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

      {analysis.limitations.length > 0 ? (
        <Alert>
          <AlertTitle>Limitaciones</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {analysis.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </Tabs>
  );
}
