"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CatalogSelect } from "@/components/vehicle-form/catalog-select";
import { Field } from "@/components/vehicle-form/field";
import {
  BODY_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/vehicles/labels";
import {
  detectVersionFamilies,
  inferFuelFromVersion,
  matchesBrandList,
} from "@/lib/vehicles/identity";
import type { VehicleCatalog } from "@/lib/vehicles/catalog-types";
import { BODY_TYPES, CONDITION_LEVELS, FUEL_TYPES, TRANSMISSION_TYPES, type VehicleInput } from "@/types/vehicle";
import type { ListingExtractResult } from "@/types/source";

const emptyForm = {
  listingUrl: "",
  brandSlug: "",
  modelSlug: "",
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
  const [urlStatus, setUrlStatus] = useState<string | null>(null);
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [catalog, setCatalog] = useState<VehicleCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog(): Promise<void> {
      try {
        const response = await fetch("/api/vehicles/catalog");
        if (!response.ok) throw new Error("No se pudo cargar el catálogo de marcas.");
        const data = (await response.json()) as VehicleCatalog;
        if (!cancelled) setCatalog(data);
      } catch (err) {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : "Error al cargar marcas.");
        }
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBrand = useMemo(
    () => catalog?.brands.find((brand) => brand.slug === form.brandSlug),
    [catalog, form.brandSlug],
  );

  const brandOptions = useMemo(
    () =>
      (catalog?.brands ?? []).map((brand) => ({
        value: brand.slug,
        label: brand.name,
      })),
    [catalog],
  );

  const modelOptions = useMemo(
    () =>
      (selectedBrand?.models ?? []).map((model) => ({
        value: model.slug,
        label: model.name,
      })),
    [selectedBrand],
  );

  const identityHint = useMemo(() => {
    const version = form.version.trim();
    if (!version || !selectedBrand) return null;
    const families = detectVersionFamilies(version);
    const mismatch = families.find((family) => !matchesBrandList(selectedBrand.name, family.brands));
    if (mismatch) {
      return `La versión ${version} no parece corresponder con ${selectedBrand.name}.`;
    }
    const implied = inferFuelFromVersion(version);
    if (implied && form.fuel && implied !== form.fuel) {
      return `La versión ${version} sugiere ${implied}, no ${form.fuel}.`;
    }
    return null;
  }, [form.fuel, form.version, selectedBrand]);

  const years = useMemo(() => {
    const max = new Date().getFullYear() + 1;
    return Array.from({ length: max - 1989 }, (_, index) => String(max - index));
  }, []);

  function update(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function applyExtractedVehicle(result: ListingExtractResult) {
    const vehicle = result.vehicle;
    if (!vehicle) return;

    let brandSlug = form.brandSlug;
    let modelSlug = form.modelSlug;
    if (catalog && vehicle.brand && vehicle.model) {
      const brand = catalog.brands.find(
        (b) =>
          b.name.toLowerCase() === vehicle.brand!.toLowerCase() ||
          b.slug === vehicle.brand!.toLowerCase().replace(/\s+/g, "-"),
      );
      if (brand) {
        brandSlug = brand.slug;
        const model = brand.models.find(
          (m) =>
            m.name.toLowerCase() === vehicle.model!.toLowerCase() ||
            m.slug === vehicle.model!.toLowerCase().replace(/\s+/g, "-"),
        );
        if (model) modelSlug = model.slug;
      }
    }

    setForm((current) => ({
      ...current,
      brandSlug,
      modelSlug,
      version: vehicle.version?.trim() || current.version,
      year: vehicle.year != null ? String(vehicle.year) : current.year,
      mileage: vehicle.mileage != null ? String(vehicle.mileage) : current.mileage,
      fuel: vehicle.fuel || current.fuel,
      power: vehicle.power != null ? String(vehicle.power) : current.power,
      advertisedPrice:
        vehicle.advertisedPrice != null ? String(vehicle.advertisedPrice) : current.advertisedPrice,
      location: vehicle.location?.trim() || current.location,
      listingUrl: vehicle.listingUrl?.trim() || current.listingUrl,
    }));
  }

  async function extractFromUrl(rawUrl: string) {
    const url = rawUrl.trim();
    if (!url || !/coches\.net/i.test(url)) {
      setUrlStatus(null);
      return;
    }
    setExtractingUrl(true);
    setUrlStatus("Leyendo anuncio de coches.net…");
    setError(null);
    try {
      const response = await fetch("/api/listings/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = (await response.json()) as ListingExtractResult & { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "No se ha podido leer la URL.");
      }
      if (result.status !== "extracted") {
        setUrlStatus(result.message);
        return;
      }
      applyExtractedVehicle(result);
      setUrlStatus(result.message);
    } catch (err) {
      setUrlStatus(err instanceof Error ? err.message : "No se ha podido leer la URL.");
    } finally {
      setExtractingUrl(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.brandSlug || !form.modelSlug || !form.year || !form.mileage || !form.fuel) {
      setError("Marca, modelo, año de matriculación, kilómetros y combustible son obligatorios.");
      return;
    }
    if (!selectedBrand) {
      setError("Selecciona una marca del catálogo.");
      return;
    }
    const selectedModel = selectedBrand.models.find((model) => model.slug === form.modelSlug);
    if (!selectedModel) {
      setError("Selecciona un modelo del catálogo.");
      return;
    }
    const vehicle: VehicleInput = {
      brand: selectedBrand.name,
      model: selectedModel.name,
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
          <p className="text-sm text-muted-foreground">
            Pega un anuncio de coches.net o rellena lo esencial. Versión y CV afinan el precio.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Faltan datos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {identityHint ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Combinación incoherente</AlertTitle>
            <AlertDescription>{identityHint} Puedes analizar igual, pero no inventaremos ficha técnica.</AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-4">
          <Field
            label="URL del anuncio (coches.net)"
            htmlFor="listingUrl"
            hint="Al pegar el enlace se intentan rellenar marca, modelo, año, km, combustible y precio."
          >
            <div className="relative">
              <Input
                id="listingUrl"
                inputMode="url"
                placeholder="https://www.coches.net/..."
                value={form.listingUrl}
                onChange={(event) => {
                  update("listingUrl", event.target.value);
                  setUrlStatus(null);
                }}
                onBlur={(event) => {
                  void extractFromUrl(event.target.value);
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text");
                  if (pasted) {
                    window.setTimeout(() => {
                      void extractFromUrl(pasted);
                    }, 0);
                  }
                }}
              />
              {extractingUrl ? (
                <LoaderCircleIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </Field>
          {urlStatus ? <p className="mt-1.5 text-xs text-muted-foreground">{urlStatus}</p> : null}
          {catalogError ? (
            <p className="mt-1.5 text-xs text-destructive">{catalogError}</p>
          ) : catalog ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {catalog.brands.length} marcas y{" "}
              {catalog.brands.reduce((sum, brand) => sum + brand.models.length, 0)} modelos (coches.net).
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Marca" htmlFor="brand">
            <CatalogSelect
              id="brand"
              required
              disabled={!catalog || Boolean(catalogError)}
              placeholder={catalog ? "Buscar marca…" : "Cargando marcas…"}
              options={brandOptions}
              value={form.brandSlug}
              onValueChange={(slug) => {
                setForm((current) => ({ ...current, brandSlug: slug, modelSlug: "" }));
              }}
            />
          </Field>
          <Field label="Modelo" htmlFor="model">
            <CatalogSelect
              id="model"
              required
              disabled={!form.brandSlug || modelOptions.length === 0}
              placeholder={form.brandSlug ? "Buscar modelo…" : "Primero elige marca"}
              options={modelOptions}
              value={form.modelSlug}
              onValueChange={(slug) => update("modelSlug", slug)}
            />
          </Field>
          <Field
            label="Versión"
            htmlFor="version"
            hint="Recomendado. Ej. sDrive18d, xDrive25e… Distingue motorizaciones."
          >
            <Input
              id="version"
              placeholder="218d, 1.5 TSI…"
              value={form.version}
              onChange={(event) => update("version", event.target.value)}
            />
          </Field>
          <Field
            label="Potencia (CV)"
            htmlFor="power"
            hint="Recomendado. coches.net la muestra en cada anuncio."
          >
            <Input
              id="power"
              inputMode="numeric"
              placeholder="150"
              value={form.power}
              onChange={(event) => update("power", event.target.value)}
            />
          </Field>
          <Field
            label="Año de matriculación"
            htmlFor="year"
            hint="El mismo dato que usa coches.net en los listados."
          >
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
              Más detalles de compra (opcional)
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <Field
                  label="Provincia del anuncio"
                  htmlFor="location"
                  hint="Del coche que miras tú. No filtra los comparables de coches.net."
                >
                  <Input
                    id="location"
                    placeholder="Madrid"
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                  />
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
                <Field label="Accidentes / reparaciones" htmlFor="accidents">
                  <Input
                    id="accidents"
                    placeholder="Ninguno / golpe leve en 2022…"
                    value={form.accidents}
                    onChange={(event) => update("accidents", event.target.value)}
                  />
                </Field>
                <Field label="ITV" htmlFor="itv">
                  <Input
                    id="itv"
                    placeholder="Pasada hasta 2027 / pendiente…"
                    value={form.itv}
                    onChange={(event) => update("itv", event.target.value)}
                  />
                </Field>
                <Field label="Equipamiento" htmlFor="equipment" className="sm:col-span-2">
                  <Textarea
                    id="equipment"
                    placeholder="Navegador, techo, cámara, asientos calefactados…"
                    value={form.equipment}
                    onChange={(event) => update("equipment", event.target.value)}
                    rows={2}
                  />
                </Field>
                <Field
                  label="Carrocería"
                  htmlFor="bodyType"
                  hint="Poco uso en la comparación con coches.net."
                >
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
                <Field label="Historial / notas" htmlFor="maintenanceHistory" className="sm:col-span-2">
                  <Textarea
                    id="maintenanceHistory"
                    placeholder="Revisiones oficiales, facturas, distribución…"
                    value={form.maintenanceHistory}
                    onChange={(event) => update("maintenanceHistory", event.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button type="submit" size="lg" className="mt-6 h-11 w-full" disabled={isSubmitting || extractingUrl}>
          {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
          Analizar coche
        </Button>
      </section>
    </form>
  );
}
