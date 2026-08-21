"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/vehicle-form/field";
import {
  BODY_LABELS,
  BRAND_SUGGESTIONS,
  CONDITION_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/vehicles/labels";
import { BODY_TYPES, CONDITION_LEVELS, FUEL_TYPES, TRANSMISSION_TYPES, type VehicleInput } from "@/types/vehicle";

const emptyForm = {
  listingUrl: "",
  brand: "",
  model: "",
  version: "",
  year: "",
  mileage: "",
  fuel: "",
  power: "",
  transmission: "",
  bodyType: "",
  advertisedPrice: "",
  location: "",
  owners: "",
  generalCondition: "",
  maintenanceHistory: "",
  accidents: "",
  equipment: "",
  extras: "",
  itv: "",
  serviceBook: "",
  tires: "",
  bodyCondition: "",
  interiorCondition: "",
};

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function VehicleForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (vehicle: VehicleInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  const years = useMemo(() => {
    const max = new Date().getFullYear() + 1;
    return Array.from({ length: max - 1989 }, (_, index) => String(max - index));
  }, []);

  function update(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.brand.trim() || !form.model.trim() || !form.year || !form.mileage || !form.fuel) {
      setError("Marca, modelo, año, kilómetros y combustible son obligatorios.");
      return;
    }
    const vehicle: VehicleInput = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      version: form.version.trim() || undefined,
      year: Number(form.year),
      mileage: Number(form.mileage),
      fuel: form.fuel as VehicleInput["fuel"],
      power: toNumber(form.power),
      transmission: (form.transmission || undefined) as VehicleInput["transmission"],
      bodyType: (form.bodyType || undefined) as VehicleInput["bodyType"],
      advertisedPrice: toNumber(form.advertisedPrice),
      location: form.location.trim() || undefined,
      owners: toNumber(form.owners),
      generalCondition: (form.generalCondition || undefined) as VehicleInput["generalCondition"],
      maintenanceHistory: form.maintenanceHistory.trim() || undefined,
      accidents: form.accidents.trim() || undefined,
      equipment: form.equipment.trim() || undefined,
      extras: form.extras.trim() || undefined,
      itv: form.itv.trim() || undefined,
      serviceBook: form.serviceBook === "yes" ? true : form.serviceBook === "no" ? false : undefined,
      tires: form.tires.trim() || undefined,
      bodyCondition: (form.bodyCondition || undefined) as VehicleInput["bodyCondition"],
      interiorCondition: (form.interiorCondition || undefined) as VehicleInput["interiorCondition"],
      listingUrl: form.listingUrl.trim() || undefined,
    };
    await onSubmit(vehicle);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-1">
          <h2 className="font-heading text-lg font-medium">Datos del coche</h2>
          <p className="text-sm text-muted-foreground">Solo lo esencial. El resto es opcional.</p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Faltan datos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Marca" htmlFor="brand">
            <Input
              id="brand"
              required
              list="brand-suggestions"
              placeholder="BMW"
              value={form.brand}
              onChange={(event) => update("brand", event.target.value)}
              autoComplete="off"
            />
            <datalist id="brand-suggestions">
              {BRAND_SUGGESTIONS.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </Field>
          <Field label="Modelo" htmlFor="model">
            <Input
              id="model"
              required
              placeholder="X1"
              value={form.model}
              onChange={(event) => update("model", event.target.value)}
            />
          </Field>
          <Field label="Año" htmlFor="year">
            <Select value={form.year || undefined} onValueChange={(value) => update("year", value)}>
              <SelectTrigger id="year" className="w-full">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kilómetros" htmlFor="mileage">
            <Input
              id="mileage"
              required
              inputMode="numeric"
              placeholder="143000"
              value={form.mileage}
              onChange={(event) => update("mileage", event.target.value)}
            />
          </Field>
          <Field label="Combustible" htmlFor="fuel">
            <Select value={form.fuel || undefined} onValueChange={(value) => update("fuel", value)}>
              <SelectTrigger id="fuel" className="w-full">
                <SelectValue placeholder="Combustible" />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((fuel) => (
                  <SelectItem key={fuel} value={fuel}>
                    {FUEL_LABELS[fuel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Precio del anuncio (€)" htmlFor="advertisedPrice" hint="Recomendado para saber si es caro o barato.">
            <Input
              id="advertisedPrice"
              inputMode="numeric"
              placeholder="17900"
              value={form.advertisedPrice}
              onChange={(event) => update("advertisedPrice", event.target.value)}
            />
          </Field>
        </div>

        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="more" className="border-none">
            <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:no-underline">
              Más detalles (opcional)
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Versión" htmlFor="version">
                  <Input
                    id="version"
                    placeholder="sDrive18d"
                    value={form.version}
                    onChange={(event) => update("version", event.target.value)}
                  />
                </Field>
                <Field label="Ubicación" htmlFor="location">
                  <Input
                    id="location"
                    placeholder="Madrid"
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                  />
                </Field>
                <Field label="Potencia (CV)" htmlFor="power">
                  <Input
                    id="power"
                    inputMode="numeric"
                    placeholder="150"
                    value={form.power}
                    onChange={(event) => update("power", event.target.value)}
                  />
                </Field>
                <Field label="Cambio" htmlFor="transmission">
                  <Select value={form.transmission || undefined} onValueChange={(value) => update("transmission", value)}>
                    <SelectTrigger id="transmission" className="w-full">
                      <SelectValue placeholder="Cambio" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSMISSION_TYPES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {TRANSMISSION_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Carrocería" htmlFor="bodyType">
                  <Select value={form.bodyType || undefined} onValueChange={(value) => update("bodyType", value)}>
                    <SelectTrigger id="bodyType" className="w-full">
                      <SelectValue placeholder="Carrocería" />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_TYPES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {BODY_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Estado general" htmlFor="generalCondition">
                  <Select
                    value={form.generalCondition || undefined}
                    onValueChange={(value) => update("generalCondition", value)}
                  >
                    <SelectTrigger id="generalCondition" className="w-full">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_LEVELS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {CONDITION_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Propietarios" htmlFor="owners">
                  <Input
                    id="owners"
                    inputMode="numeric"
                    placeholder="2"
                    value={form.owners}
                    onChange={(event) => update("owners", event.target.value)}
                  />
                </Field>
                <Field label="Libro de mantenimiento" htmlFor="serviceBook">
                  <Select value={form.serviceBook || undefined} onValueChange={(value) => update("serviceBook", value)}>
                    <SelectTrigger id="serviceBook" className="w-full">
                      <SelectValue placeholder="¿Tiene libro?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Algo más que debamos saber" htmlFor="maintenanceHistory" className="sm:col-span-2">
                  <Textarea
                    id="maintenanceHistory"
                    placeholder="Mantenimiento, accidentes, equipamiento..."
                    value={form.maintenanceHistory}
                    onChange={(event) => update("maintenanceHistory", event.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-4 border-t pt-4">
          {!showUrl ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowUrl(true)}
            >
              <ChevronDownIcon className="size-4" />
              Tengo enlace del anuncio
            </button>
          ) : (
            <Field label="URL del anuncio" htmlFor="listingUrl" hint="Opcional. La extracción automática llegará después.">
              <Input
                id="listingUrl"
                inputMode="url"
                placeholder="https://www.coches.net/..."
                value={form.listingUrl}
                onChange={(event) => update("listingUrl", event.target.value)}
              />
            </Field>
          )}
        </div>

        <Button type="submit" size="lg" className="mt-6 h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
          Analizar coche
        </Button>
      </section>
    </form>
  );
}
