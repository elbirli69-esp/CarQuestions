import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildVoModelCurationOverlays,
  VO_CURATION_AT,
  VO_MODEL_PRIMARY_CURATION,
} from "../lib/rag/curation/vo-model-sources";

const outPath = join(process.cwd(), "data", "knowledge", "vo-model-curation.json");
const overlays = buildVoModelCurationOverlays();

const file = {
  version: 1,
  updatedAt: VO_CURATION_AT,
  note: "Curación primaria top 100 VO España — fuentes OEM / Safety Gate / ADAC / foros. Regenerar: npx tsx scripts/generate-vo-model-curation.ts",
  models: VO_MODEL_PRIMARY_CURATION.map((m) => ({
    rank: m.rank,
    brandSlug: m.brandSlug,
    modelSlug: m.modelSlug,
    chunkId: m.chunkId,
    verificationLevel: m.verificationLevel,
    externalRef: m.externalRef,
    sourceUrl: m.sourceUrl,
  })),
  overlays,
};

writeFileSync(outPath, JSON.stringify(file, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}: ${overlays.length} chunk overlays for ${VO_MODEL_PRIMARY_CURATION.length} models`);
