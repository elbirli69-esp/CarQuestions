import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api/errors";
import { getTrimsForModel, trimLabel } from "@/lib/vehicles/trims";

const querySchema = z.object({
  brandSlug: z.string().trim().min(1),
  modelSlug: z.string().trim().min(1),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    brandSlug: searchParams.get("brandSlug"),
    modelSlug: searchParams.get("modelSlug"),
  });
  if (!parsed.success) {
    return jsonError("Indica brandSlug y modelSlug.", 400, parsed.error.issues);
  }

  const trims = getTrimsForModel(parsed.data.brandSlug, parsed.data.modelSlug).map((trim) => ({
    slug: trim.slug,
    name: trim.name,
    label: trimLabel(trim),
    fuel: trim.fuel,
    powerHp: trim.powerHp,
    yearFrom: trim.yearFrom,
    yearTo: trim.yearTo,
    engineCode: trim.engineCode,
    transmission: trim.transmission,
  }));

  return NextResponse.json({
    brandSlug: parsed.data.brandSlug,
    modelSlug: parsed.data.modelSlug,
    trims,
    count: trims.length,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
