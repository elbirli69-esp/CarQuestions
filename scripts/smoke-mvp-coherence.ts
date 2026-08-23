import { analyzeVehicle } from "../lib/vehicles/analyze";

async function main() {
  const bad = await analyzeVehicle({
    brand: "Ebro",
    model: "S800",
    version: "sDrive18d",
    year: 2026,
    mileage: 12000,
    fuel: "electric",
    power: 220,
    advertisedPrice: 29000,
  });

  const issues = bad.reliability.knownIssues.map((issue) => issue.title).join(" | ");
  const contaminated = /ckp|cmp|p0118|octovalve|brake-by-wire/i.test(issues);
  console.log(
    JSON.stringify(
      {
        case: "ebro-sdrive18d",
        consistency: bad.consistency?.status,
        summary: bad.consistency?.summary,
        verdict: bad.purchaseVerdict?.label,
        reliabilityAvailable: bad.reliability.available,
        issueTitles: bad.reliability.knownIssues.map((issue) => issue.title),
        contaminated,
        marketStatus: bad.valuation.marketStatus,
        questions: bad.sellerQuestions.map((item) => item.question),
      },
      null,
      2,
    ),
  );

  const good = await analyzeVehicle({
    brand: "BMW",
    model: "X1",
    version: "sDrive18d",
    year: 2019,
    mileage: 85000,
    fuel: "diesel",
    power: 150,
    advertisedPrice: 18900,
  });
  console.log(
    JSON.stringify(
      {
        case: "bmw-x1",
        consistency: good.consistency?.status,
        reliabilityAvailable: good.reliability.available,
        evidenceLevel: good.reliability.evidenceLevel,
        issueTitles: good.reliability.knownIssues.map((issue) => issue.title),
        marketStatus: good.valuation.marketStatus,
        comparableCount: good.valuation.comparableCount,
        questions: good.sellerQuestions.map((item) => item.question),
      },
      null,
      2,
    ),
  );

  if (bad.consistency?.status !== "invalid" || contaminated || bad.reliability.available) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
