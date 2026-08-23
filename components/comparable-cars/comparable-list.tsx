"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatKm } from "@/lib/utils/format";
import { BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicles/labels";
import type { VehicleListing } from "@/types/listing";

export function ComparableList({
  title,
  description,
  listings,
  onAsk,
}: {
  title: string;
  description: string;
  listings: VehicleListing[];
  onAsk?: (question: string) => void;
}) {
  if (listings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No hay comparables suficientes con los datos actuales.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {listings.slice(0, 8).map((listing) => (
            <article key={listing.id} className="rounded-xl bg-muted/50 p-4">
              <p className="font-medium">
                {listing.url ? (
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {listing.brand} {listing.model} {listing.version ?? ""}
                  </a>
                ) : (
                  <>
                    {listing.brand} {listing.model} {listing.version ?? ""}
                  </>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {listing.year} · {listing.mileage ? formatKm(listing.mileage) : "km n/d"} ·{" "}
                {listing.fuel ? FUEL_LABELS[listing.fuel] : "combustible n/d"}
                {listing.power ? ` · ${listing.power} CV` : ""}
              </p>
              <p className="mt-2 text-lg font-medium">
                {listing.price ? formatEuro(listing.price) : "Precio n/d"}
              </p>
              <p className="text-xs text-muted-foreground">
                {listing.source} · {listing.location}
                {listing.similarity != null ? ` · similitud ${(listing.similarity * 100).toFixed(0)} %` : ""}
                {listing.transmission ? ` · ${TRANSMISSION_LABELS[listing.transmission]}` : ""}
                {listing.bodyType ? ` · ${BODY_LABELS[listing.bodyType]}` : ""}
              </p>
            </article>
          ))}
        </div>
        {onAsk ? (
          <Button type="button" variant="outline" onClick={() => onAsk("¿Cuál comprarías tú?")}>
            ¿Cuál comprarías tú?
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
