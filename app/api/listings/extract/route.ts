import { NextResponse } from "next/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { extractListingFromUrl } from "@/lib/sources/registry";
import { listingExtractSchema } from "@/lib/vehicles/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = listingExtractSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Introduce una URL válida.", 400, parsed.error.issues);
    }

    const result = await extractListingFromUrl(parsed.data.url);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
