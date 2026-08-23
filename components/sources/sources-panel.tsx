"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatKm } from "@/lib/utils/format";
import type { VehicleListing } from "@/types/listing";
import type { SourceCitation } from "@/types/source";
import type { MatchStrictness } from "@/types/valuation";

export function SourcesPanel({
  sources,
  listings,
  comparableCount,
  sourceCount,
  updatedAt,
  searchNotes = [],
  matchStrictness,
  emptyMessage,
}: {
  sources: SourceCitation[];
  listings: VehicleListing[];
  comparableCount: number;
  sourceCount: number;
  updatedAt: string;
  searchNotes?: string[];
  matchStrictness?: MatchStrictness;
  emptyMessage?: string;
}) {
  const updated = new Date(updatedAt);
  const ageHours = Math.max(0, Math.round((Date.now() - updated.getTime()) / (1000 * 60 * 60)));
  const activeSources = sources.filter((source) => !source.isMock || source.listingCount > 0);
  const upcomingSources = sources.filter((source) => source.isMock && source.listingCount === 0);
  const hasListings = listings.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuentes</CardTitle>
        <CardDescription>
          {hasListings
            ? `Precio estimado basado en ${comparableCount} anuncios similares, ${sourceCount} fuentes activas y datos actualizados ${ageHours < 1 ? "hace menos de una hora" : `hace ${ageHours} h`}.`
            : emptyMessage ??
              "No hay anuncios comparables en este momento. Revisa el estado de coches.net abajo."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasListings && searchNotes.length > 0 ? (
          <ul className="space-y-1.5 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            {searchNotes.slice(0, 5).map((note) => (
              <li key={note}>· {note}</li>
            ))}
          </ul>
        ) : null}

        {matchStrictness && hasListings ? (
          <p className="text-xs text-muted-foreground">
            Calidad de emparejamiento:{" "}
            <span className="font-medium text-foreground">
              {matchStrictness === "strict"
                ? "filtros estrechos"
                : matchStrictness === "relaxed"
                  ? "filtros relajados"
                  : "filtros amplios"}
            </span>
          </p>
        ) : null}

        <Accordion type="single" collapsible defaultValue={hasListings ? undefined : "sources"}>
          <AccordionItem value="sources">
            <AccordionTrigger>Ver fuentes</AccordionTrigger>
            <AccordionContent>
              <ul className="mb-4 space-y-2">
                {activeSources.map((source) => (
                  <li key={source.id} className="flex items-start justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{source.name}</span>
                      <span className="block text-muted-foreground">{source.note}</span>
                    </span>
                    <Badge variant="outline">
                      {source.listingCount > 0 ? "Conectado" : "Sin resultados"} · {source.listingCount}
                    </Badge>
                  </li>
                ))}
              </ul>
              {upcomingSources.length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Próximamente
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {upcomingSources.map((source) => (
                      <li key={source.id}>{source.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {hasListings ? (
                <div className="space-y-2">
                  {listings.slice(0, 12).map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span>
                        {listing.url ? (
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {listing.title}
                          </a>
                        ) : (
                          listing.title
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {listing.source} · {listing.year} ·{" "}
                          {listing.mileage ? formatKm(listing.mileage) : "km n/d"}
                          {listing.similarity != null
                            ? ` · similitud ${(listing.similarity * 100).toFixed(0)} %`
                            : ""}
                        </span>
                      </span>
                      <span>{listing.price ? formatEuro(listing.price) : "—"}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
