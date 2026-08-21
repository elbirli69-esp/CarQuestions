"use client";

import { useMemo, useState } from "react";
import { LoaderCircleIcon, LinkIcon } from "lucide-react";
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

type ListingExtractResponse = {
  status: string;
  source?: string;
  message: string;
};

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
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const years = useMemo(() => {
    const max = new Date().getFullYear() + 1;
    return Array.from({ length: max - 1989 }, (_, index) => String(max - index));
  }, []);

  function update(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function extractUrl() {
    setExtractMessage(null);
    setError(null);
    if (!form.listingUrl.trim()) {
      setExtractMessage("Pega primero la URL del anuncio.");
      return;
    }
    setExtracting(true);
    try {
      const response = await fetch("/api/listings/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.listingUrl.trim() }),
      });
      const payload = (await response.json()) as ListingExtractResponse & { error?: string };
      if (!response.ok) {
        setExtractMessage(payload.error ?? "No se ha podido leer la URL.");
        return;
      }
      setExtractMessage(payload.message);
    } catch {
      setExtractMessage("No se ha podido contactar con el extractor.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.brand.trim() || !form.model.trim() || !form.year || !form.mileage || !form.fuel) {
      setError("Completa marca, modelo, año, kilómetros y combustible.");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <LinkIcon className="size-4" />
          Pega la URL del anuncio
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          La extracción automática llegará después. Hoy puedes guardar la URL y completar los datos a mano.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="listingUrl"
            inputMode="url"
            placeholder="https://www.coches.net/..."
            value={form.listingUrl}
            onChange={(event) => update("listingUrl", event.target.value)}
            className="h-9 flex-1"
          />
          <Button type="button" variant="outline" onClick={extractUrl} disabled={extracting} className="h-9">
            {extracting ? <LoaderCircleIcon className="animate-spin" /> : null}
            Extraer
          </Button>
        </div>
        {extractMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">{extractMessage}</p>
        ) : null}
      </div>

      <div>
        <h2 className="font-heading text-lg font-medium">¿Qué quieres saber de este coche?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Datos básicos</p>
      </div>

      {error ? (
        <Alert variant="destructive">
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
            className="h-9"
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
            className="h-9"
          />
        </Field>
        <Field label="Versión" htmlFor="version">
          <Input
            id="version"
            placeholder="sDrive18d"
            value={form.version}
            onChange={(event) => update("version", event.target.value)}
            className="h-9"
          />
        </Field>
        <Field label="Año" htmlFor="year">
          <Select value={form.year || undefined} onValueChange={(value) => update("year", value)}>
            <SelectTrigger id="year" className="h-9 w-full">
              <SelectValue placeholder="Selecciona año" />
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
            className="h-9"
          />
        </Field>
        <Field label="Combustible" htmlFor="fuel">
          <Select value={form.fuel || undefined} onValueChange={(value) => update("fuel", value)}>
            <SelectTrigger id="fuel" className="h-9 w-full">
              <SelectValue placeholder="Selecciona" />
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
        <Field label="Potencia (CV)" htmlFor="power">
          <Input
            id="power"
            inputMode="numeric"
            placeholder="150"
            value={form.power}
            onChange={(event) => update("power", event.target.value)}
            className="h-9"
          />
        </Field>
        <Field label="Cambio" htmlFor="transmission">
          <Select value={form.transmission || undefined} onValueChange={(value) => update("transmission", value)}>
            <SelectTrigger id="transmission" className="h-9 w-full">
              <SelectValue placeholder="Selecciona" />
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
            <SelectTrigger id="bodyType" className="h-9 w-full">
              <SelectValue placeholder="Selecciona" />
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
        <Field label="Precio anunciado (€)" htmlFor="advertisedPrice">
          <Input
            id="advertisedPrice"
            inputMode="numeric"
            placeholder="17900"
            value={form.advertisedPrice}
            onChange={(event) => update("advertisedPrice", event.target.value)}
            className="h-9"
          />
        </Field>
        <Field label="Ubicación" htmlFor="location" className="sm:col-span-2">
          <Input
            id="location"
            placeholder="Madrid"
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            className="h-9"
          />
        </Field>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="optional">
          <AccordionTrigger>Datos opcionales</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Número de propietarios" htmlFor="owners">
                <Input
                  id="owners"
                  inputMode="numeric"
                  value={form.owners}
                  onChange={(event) => update("owners", event.target.value)}
                  className="h-9"
                />
              </Field>
              <Field label="Estado general" htmlFor="generalCondition">
                <Select value={form.generalCondition || undefined} onValueChange={(value) => update("generalCondition", value)}>
                  <SelectTrigger id="generalCondition" className="h-9 w-full">
                    <SelectValue placeholder="Selecciona" />
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
              <Field label="Historial de mantenimiento" htmlFor="maintenanceHistory" className="sm:col-span-2">
                <Textarea
                  id="maintenanceHistory"
                  placeholder="Oficial, con facturas..."
                  value={form.maintenanceHistory}
                  onChange={(event) => update("maintenanceHistory", event.target.value)}
                />
              </Field>
              <Field label="Accidentes" htmlFor="accidents" className="sm:col-span-2">
                <Textarea
                  id="accidents"
                  placeholder="Sin accidentes / golpe levemente reparado..."
                  value={form.accidents}
                  onChange={(event) => update("accidents", event.target.value)}
                />
              </Field>
              <Field label="Equipamiento" htmlFor="equipment" className="sm:col-span-2">
                <Textarea
                  id="equipment"
                  placeholder="Cuero, navegador, techo, sensores..."
                  value={form.equipment}
                  onChange={(event) => update("equipment", event.target.value)}
                />
              </Field>
              <Field label="Extras" htmlFor="extras">
                <Input id="extras" value={form.extras} onChange={(event) => update("extras", event.target.value)} className="h-9" />
              </Field>
              <Field label="ITV" htmlFor="itv">
                <Input id="itv" placeholder="Válida hasta 2027" value={form.itv} onChange={(event) => update("itv", event.target.value)} className="h-9" />
              </Field>
              <Field label="Libro de mantenimiento" htmlFor="serviceBook">
                <Select value={form.serviceBook || undefined} onValueChange={(value) => update("serviceBook", value)}>
                  <SelectTrigger id="serviceBook" className="h-9 w-full">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Neumáticos" htmlFor="tires">
                <Input id="tires" value={form.tires} onChange={(event) => update("tires", event.target.value)} className="h-9" />
              </Field>
              <Field label="Estado de la carrocería" htmlFor="bodyCondition">
                <Select value={form.bodyCondition || undefined} onValueChange={(value) => update("bodyCondition", value)}>
                  <SelectTrigger id="bodyCondition" className="h-9 w-full">
                    <SelectValue placeholder="Selecciona" />
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
              <Field label="Estado del interior" htmlFor="interiorCondition">
                <Select value={form.interiorCondition || undefined} onValueChange={(value) => update("interiorCondition", value)}>
                  <SelectTrigger id="interiorCondition" className="h-9 w-full">
                    <SelectValue placeholder="Selecciona" />
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
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button type="submit" size="lg" className="h-11 w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
        Analizar coche
      </Button>
    </form>
  );
}
