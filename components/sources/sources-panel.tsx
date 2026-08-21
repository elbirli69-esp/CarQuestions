"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatKm } from "@/lib/utils/format";
import type { VehicleListing } from "@/types/listing";
import type { SourceCitation } from "@/types/source";

export function SourcesPanel({
  sources,
  listings,
  comparableCount,
  sourceCount,
  updatedAt,
}: {
  sources: SourceCitation[];
  listings: VehicleListing[];
  comparableCount: number;
  sourceCount: number;
  updatedAt: string;
}) {
  const updated = new Date(updatedAt);
  const ageHours = Math.max(0, Math.round((Date.now() - updated.getTime()) / (1000 * 60 * 60)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuentes</CardTitle>
        <CardDescription>
          Precio estimado basado en {comparableCount} anuncios similares, {sourceCount} fuentes y datos actualizados{" "}
          {ageHours < 1 ? "hace menos de una hora" : `hace ${ageHours} h`}. Todos los anuncios actuales son de demostración.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="sources">
            <AccordionTrigger>Ver fuentes</AccordionTrigger>
            <AccordionContent>
              <ul className="mb-4 space-y-2">
                {sources.map((source) => (
                  <li key={source.id} className="flex items-start justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{source.name}</span>
                      <span className="block text-muted-foreground">{source.note}</span>
                    </span>
                    <Badge variant="outline">{source.isMock ? "Mock" : "Live"} · {source.listingCount}</Badge>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                {listings.slice(0, 12).map((listing) => (
                  <div key={listing.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span>
                      {listing.title}
                      <span className="block text-xs text-muted-foreground">
                        {listing.source} · {listing.year} · {listing.mileage ? formatKm(listing.mileage) : "km n/d"}
                      </span>
                    </span>
                    <span>{listing.price ? formatEuro(listing.price) : "—"}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
