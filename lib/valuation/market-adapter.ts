import type { MarketValuation } from "@/types/market";
import type { ValuationResult } from "@/types/valuation";

/**
 * Adapta MarketValuation al ValuationResult legacy que consumen componentes
 * antiguos (ValuationCard, mock AI, chat). Cuando no hay mercado, estimatedPrice
 * es 0 y origin es ai_estimate para que la UI no muestre un falso precio.
 */
export function marketToLegacyValuation(market: MarketValuation): ValuationResult {
  const hasPrice = market.estimatedPrice != null;
  const estimated = market.estimatedPrice ?? market.segmentReference?.value ?? 0;
  const low = market.range?.low ?? (hasPrice ? estimated * 0.9 : 0);
  const high = market.range?.high ?? (hasPrice ? estimated * 1.1 : 0);

  const distribution = market.distribution
    ? {
        count: market.distribution.count,
        min: market.distribution.min,
        p25: market.distribution.p25,
        median: market.distribution.median,
        p75: market.distribution.p75,
        max: market.distribution.max,
      }
    : {
        count: market.comparableCount,
        min: low,
        p25: low,
        median: estimated,
        p75: high,
        max: high,
      };

  return {
    estimatedPrice: estimated,
    advertisedPrice: market.advertisedPrice,
    low,
    high,
    percentDifference: market.percentDifference,
    verdict:
      market.verdict === "sin_mercado"
        ? "sin_precio"
        : (market.verdict as ValuationResult["verdict"]),
    verdictLabel: market.verdictLabel,
    summary: market.summary,
    confidence: market.confidence.score,
    confidenceDrivers: market.confidence.drivers,
    avgSimilarity: market.comparability?.averageSimilarity,
    matchStrictness: market.matchStrictness ?? undefined,
    distribution,
    adjustments: market.adjustments.map((adj) => ({
      label: adj.label,
      amount: adj.amount,
      reason: adj.reason,
      origin: adj.origin === "observed_market" ? "observed" : "ai_estimate",
      applied: true,
    })),
    comparableCount: market.comparableCount,
    sourceCount: market.sourceCount,
    dataUpdatedAt: market.dataUpdatedAt,
    origin: market.status === "observed" ? "observed" : "ai_estimate",
    methodology: market.methodology,
    limitations: market.limitations,
  };
}
