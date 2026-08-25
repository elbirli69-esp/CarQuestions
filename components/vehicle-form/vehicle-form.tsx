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
import { PlateLookupSummary } from "@/components/vehicle-form/plate-lookup-summary";
import { CUSTOM_TRIM_SLUG, findTrimByVersionText } from "@/lib/vehicles/trims";
import {
  BODY_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from "@/lib/vehicles/labels";
import type { VehicleCatalog } from "@/lib/vehicles/catalog-types";
import { BODY_TYPES, CONDITION_LEVELS, FUEL_TYPES, TRANSMISSION_TYPES, type VehicleInput } from "@/types/vehicle";
import type { ListingExtractResult, PlateLookupResult, PlateLookupFieldKey, PlateLookupMissingKey } from "@/types/source";
import type { Vehicle } from "@/types/vehicle";

type TrimOptionsPayload = {
  slug: string;
  label: string;
  name: string;
  fuel?: string;
  powerHp?: number;
  transmission?: string;
};

const emptyForm = {
  registrationPlate: "",
  listingUrl: "",
  brandSlug: "",
  modelSlug: "",
  trimSlug: "",
  versionCustom: "",
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
  const [plateStatus, setPlateStatus] = useState<string | null>(null);
  const [plateLookupMeta, setPlateLookupMeta] = useState<{
    filledFields?: PlateLookupFieldKey[];
    missingFields?: PlateLookupMissingKey[];
    sources?: string[];
    message?: string;
  } | null>(null);
  const [plateEnrichment, setPlateEnrichment] = useState<Partial<Vehicle>>({});
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [extractingPlate, setExtractingPlate] = useState(false);
  const [catalog, setCatalog] = useState<VehicleCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [trimOptions, setTrimOptions] = useState<TrimOptionsPayload[]>([]);
  const [trimsLoading, setTrimsLoading] = useState(false);

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

  const years = useMemo(() => {
    const max = new Date().getFullYear() + 1;
    return Array.from({ length: max - 1989 }, (_, index) => String(max - index));
  }, []);

  useEffect(() => {
    if (!form.brandSlug || !form.modelSlug) {
      setTrimOptions([]);
      return;
    }
    let cancelled = false;
    setTrimsLoading(true);
    void fetch(
      `/api/vehicles/trims?brandSlug=${encodeURIComponent(form.brandSlug)}&modelSlug=${encodeURIComponent(form.modelSlug)}`,
    )
      .then((res) => res.json())
      .then((data: { trims?: TrimOptionsPayload[] }) => {
        if (cancelled) return;
        setTrimOptions(data.trims ?? []);
      })
      .catch(() => {
        if (!cancelled) setTrimOptions([]);
      })
      .finally(() => {
        if (!cancelled) setTrimsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.brandSlug, form.modelSlug]);

  useEffect(() => {
    if (!form.brandSlug || !form.modelSlug || trimOptions.length === 0) return;
    if (form.trimSlug && form.trimSlug !== CUSTOM_TRIM_SLUG) return;
    const text = form.versionCustom.trim();
    if (!text) return;
    const match = findTrimByVersionText(form.brandSlug, form.modelSlug, text);
    if (!match) return;
    const trim = trimOptions.find((t) => t.slug === match.slug);
    if (!trim) return;
    setForm((current) => ({
      ...current,
      trimSlug: trim.slug,
      versionCustom: trim.name,
      fuel: trim.fuel || current.fuel,
      power: trim.powerHp != null ? String(trim.powerHp) : current.power,
      transmission: trim.transmission || current.transmission,
    }));
  }, [trimOptions, form.brandSlug, form.modelSlug, form.trimSlug, form.versionCustom]);

  const trimSelectOptions = useMemo(
    () => [
      ...trimOptions.map((trim) => ({ value: trim.slug, label: trim.label })),
      ...(trimOptions.length > 0
        ? [{ value: CUSTOM_TRIM_SLUG, label: "Otra versión (escribir)" }]
        : []),
    ],
    [trimOptions],
  );

  function applyTrimFields(trimSlug: string) {
    const trim = trimOptions.find((t) => t.slug === trimSlug);
    if (!trim || trimSlug === CUSTOM_TRIM_SLUG) return;
    setForm((current) => ({
      ...current,
      trimSlug,
      versionCustom: trim.name,
      fuel: trim.fuel || current.fuel,
      power: trim.powerHp != null ? String(trim.powerHp) : current.power,
      transmission: trim.transmission || current.transmission,
    }));
  }

  function update(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function applyPartialVehicle(vehicle: Partial<Vehicle>) {
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
            m.slug === vehicle.model!.toLowerCase().replace(/\s+/g, "-") ||
            vehicle.model!.toLowerCase().includes(m.name.toLowerCase()) ||
            m.name.toLowerCase().includes(vehicle.model!.toLowerCase().split(/\s+/)[0] ?? ""),
        );
        if (model) modelSlug = model.slug;
      }
    }

    const versionText = vehicle.version?.trim() ?? "";
    let trimSlug = form.trimSlug;
    let versionCustom = form.versionCustom;
    if (versionText) {
      versionCustom = versionText;
      if (brandSlug && modelSlug) {
        const match = findTrimByVersionText(brandSlug, modelSlug, versionText);
        if (match) {
          trimSlug = match.slug;
          versionCustom = match.name;
        } else {
          trimSlug = CUSTOM_TRIM_SLUG;
        }
      } else {
        trimSlug = CUSTOM_TRIM_SLUG;
      }
    }

    setForm((current) => ({
      ...current,
      brandSlug,
      modelSlug,
      trimSlug,
      versionCustom,
      year: vehicle.year != null ? String(vehicle.year) : current.year,
      mileage: vehicle.mileage != null ? String(vehicle.mileage) : current.mileage,
      fuel: vehicle.fuel || current.fuel,
      power: vehicle.power != null ? String(vehicle.power) : current.power,
      transmission: vehicle.transmission || current.transmission,
      bodyType: vehicle.bodyType || current.bodyType,
      advertisedPrice:
        vehicle.advertisedPrice != null ? String(vehicle.advertisedPrice) : current.advertisedPrice,
      location: vehicle.location?.trim() || current.location,
      listingUrl: vehicle.listingUrl?.trim() || current.listingUrl,
      registrationPlate: vehicle.registrationPlate?.trim() || current.registrationPlate,
    }));
  }

  function applyExtractedVehicle(result: ListingExtractResult) {
    if (!result.vehicle) return;
    applyPartialVehicle(result.vehicle);
  }

  async function extractFromUrl(rawUrl: string) {
    const url = rawUrl.trim();
    if (!url || !/(coches\.net|autoscout24)/i.test(url)) {
      setUrlStatus(null);
      return;
    }
    const portal = /autoscout24/i.test(url) ? "AutoScout24" : "coches.net";
    setExtractingUrl(true);
    setUrlStatus(`Leyendo anuncio de ${portal}…`);
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

  async function extractFromPlate(rawPlate: string) {
    const plate = rawPlate.trim();
    if (!plate || plate.length < 4) {
      setPlateStatus(null);
      setPlateLookupMeta(null);
      return;
    }
    setExtractingPlate(true);
    setPlateStatus("Consultando matrícula…");
    setError(null);
    try {
      const response = await fetch("/api/vehicle/by-plate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate }),
      });
      const result = (await response.json()) as PlateLookupResult & { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "No se ha podido consultar la matrícula.");
      }
      if (result.status === "extracted" || result.status === "partial") {
        if (result.vehicle) {
          applyPartialVehicle(result.vehicle);
          setPlateEnrichment({
            vin: result.vehicle.vin,
            engineCode: result.vehicle.engineCode,
          });
        }
        setPlateLookupMeta({
          filledFields: result.filledFields,
          missingFields: result.missingFields,
          sources: result.sources,
          message: result.message,
        });
        setPlateStatus(null);
        return;
      }
      setPlateLookupMeta({
        message: result.message,
        missingFields: result.missingFields,
      });
      setPlateStatus(result.message);
    } catch (err) {
      setPlateStatus(err instanceof Error ? err.message : "No se ha podido consultar la matrícula.");
    } finally {
      setExtractingPlate(false);
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
    const catalogTrim =
      form.trimSlug && form.trimSlug !== CUSTOM_TRIM_SLUG
        ? trimOptions.find((trim) => trim.slug === form.trimSlug)
        : undefined;
    const versionText = catalogTrim?.name ?? form.versionCustom.trim();

    const vehicle: VehicleInput = {
      brand: selectedBrand.name,
      model: selectedModel.name,
      version: versionText || undefined,
      trimSlug:
        form.trimSlug && form.trimSlug !== CUSTOM_TRIM_SLUG ? form.trimSlug : undefined,
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
      registrationPlate: form.registrationPlate.trim() || undefined,
      vin: plateEnrichment.vin?.trim() || undefined,
      engineCode: plateEnrichment.engineCode?.trim() || undefined,
    };
    await onSubmit(vehicle);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <section className="content-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-1">
          <h2 className="font-heading text-lg font-medium">Datos del coche</h2>
          <p className="text-sm text-muted-foreground">
            Pega la matrícula o un anuncio de coches.net / AutoScout24, o rellena lo esencial. Versión y CV
            afinan el precio.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Faltan datos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Matrícula"
            htmlFor="registrationPlate"
            hint="Gratis: estimamos el año (europea) y la provincia (antigua). Marca/modelo: pega la URL del anuncio."
          >
            <div className="relative">
              <Input
                id="registrationPlate"
                autoComplete="off"
                placeholder="1234 BCD o M-1234-AB"
                value={form.registrationPlate}
                onChange={(event) => {
                  update("registrationPlate", event.target.value);
                  setPlateStatus(null);
                  setPlateLookupMeta(null);
                  setPlateEnrichment({});
                }}
                onBlur={(event) => {
                  void extractFromPlate(event.target.value);
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text");
                  if (pasted) {
                    window.setTimeout(() => {
                      void extractFromPlate(pasted);
                    }, 0);
                  }
                }}
              />
              {extractingPlate ? (
                <LoaderCircleIcon
                  className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              ) : null}
            </div>
          </Field>
          {plateStatus ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">{plateStatus}</p>
          ) : null}
          {plateLookupMeta ? (
            <PlateLookupSummary
              filledFields={plateLookupMeta.filledFields}
              missingFields={plateLookupMeta.missingFields}
              sources={plateLookupMeta.sources}
              message={plateLookupMeta.message}
            />
          ) : null}
        </div>

        <div className="mb-4">
          <Field
            label="URL del anuncio (coches.net / AutoScout24)"
            htmlFor="listingUrl"
            hint="Al pegar el enlace se intentan rellenar marca, modelo, año, km, combustible y precio."
          >
            <div className="relative">
              <Input
                id="listingUrl"
                inputMode="url"
                placeholder="https://www.coches.net/... o https://www.autoscout24.es/anuncios/..."
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
                setForm((current) => ({
                  ...current,
                  brandSlug: slug,
                  modelSlug: "",
                  trimSlug: "",
                  versionCustom: "",
                }));
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
              onValueChange={(slug) => {
                setForm((current) => ({
                  ...current,
                  modelSlug: slug,
                  trimSlug: "",
                  versionCustom: "",
                }));
              }}
            />
          </Field>
          <Field
            label="Versión"
            htmlFor="version"
            hint={
              trimOptions.length > 0
                ? "Elige la motorización del catálogo o escribe otra si no aparece."
                : "Recomendado. Ej. versión comercial o código de motor. Debe encajar con la marca."
            }
          >
            {trimOptions.length > 0 ? (
              <div className="flex flex-col gap-2">
                <CatalogSelect
                  id="version"
                  disabled={trimsLoading}
                  placeholder={trimsLoading ? "Cargando versiones…" : "Buscar versión…"}
                  options={trimSelectOptions}
                  value={form.trimSlug}
                  onValueChange={(slug) => {
                    if (slug === CUSTOM_TRIM_SLUG) {
                      setForm((current) => ({
                        ...current,
                        trimSlug: CUSTOM_TRIM_SLUG,
                        versionCustom: "",
                      }));
                      return;
                    }
                    applyTrimFields(slug);
                  }}
                />
                {form.trimSlug === CUSTOM_TRIM_SLUG ? (
                  <Input
                    id="versionCustom"
                    placeholder="Versión o acabado (texto libre)"
                    value={form.versionCustom}
                    onChange={(event) => update("versionCustom", event.target.value)}
                  />
                ) : null}
              </div>
            ) : (
              <Input
                id="version"
                placeholder="Versión o acabado"
                value={form.versionCustom}
                onChange={(event) => update("versionCustom", event.target.value)}
              />
            )}
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
          {isSubmitting ? (
            <>
              <LoaderCircleIcon className="animate-spin" aria-hidden />
              Analizando…
            </>
          ) : (
            "Analizar coche"
          )}
        </Button>
      </section>
    </form>
  );
}
