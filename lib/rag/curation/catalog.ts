import type { KnowledgeChunk, KnowledgeVerificationLevel } from "@/types/knowledge";
import { chunkAppliesToAllBrands } from "@/lib/rag/knowledge/filters";
import { normalizeKey } from "@/lib/utils/math";

const CURATED_AT = "2026-08-25T14:00:00.000Z";

const DGT_ITV_URL = "https://www.dgt.es/vehiculos/itv/";
const SAFETY_GATE_SEARCH = "https://ec.europa.eu/safety-gate-alerts/screen/search";
const SAFETY_GATE_PORTAL = "https://ec.europa.eu/safety-gate";
const EU_AUTO_ENV_URL =
  "https://ec.europa.eu/growth/sectors/automotive/environment-protection_en";
const ADAC_PANNEN_URL = "https://www.adac.de/rund-ums-fahrzeug/tests/adac-pannenstatistik/";

/** Portales posventa oficiales España (mantenimiento / verificación red). */
const BRAND_SERVICE_URLS: Record<string, string> = {
  bmw: "https://www.bmw.es/es/fastlane/service.html",
  mini: "https://www.bmw.es/es/fastlane/service.html",
  "mercedes-benz": "https://www.mercedes-benz.es/passengercars/services.html",
  mercedes: "https://www.mercedes-benz.es/passengercars/services.html",
  volkswagen: "https://www.volkswagen.es/posventa/servicios",
  vw: "https://www.volkswagen.es/posventa/servicios",
  audi: "https://www.audi.es/es/web/es/servicios-posventa.html",
  seat: "https://www.seat.es/servicios",
  skoda: "https://www.skoda.es/servicios",
  cupra: "https://www.cupraofficial.es/servicios",
  ford: "https://www.ford.es/soporte/servicio/",
  toyota: "https://www.toyota.es/mantenimiento-y-reparacion",
  lexus: "https://www.lexusauto.es/servicios-posventa",
  renault: "https://www.renault.es/servicios.html",
  dacia: "https://www.dacia.es/servicios-posventa.html",
  peugeot: "https://www.peugeot.es/servicios-posventa.html",
  citroen: "https://www.citroen.es/servicios-posventa.html",
  citroën: "https://www.citroen.es/servicios-posventa.html",
  opel: "https://www.opel.es/servicios-posventa.html",
  hyundai: "https://www.hyundai.com/es/es/servicios-al-cliente.html",
  kia: "https://www.kia.com/es/servicio/",
  nissan: "https://es.nissan.es/servicio-al-cliente.html",
  mazda: "https://www.mazda.es/mazda-experience/servicio/postventa/",
  suzuki: "https://auto.suzuki.es/servicios-posventa",
  mg: "https://www.mg.es/posventa",
  tesla: "https://www.tesla.com/es_ES/support",
  volvo: "https://www.volvocars.com/es/servicio-mantenimiento/",
  porsche: "https://www.porsche.com/spain/serviceaccess/",
  "alfa romeo": "https://www.alfaromeo.es/servicios-posventa",
  alfa: "https://www.alfaromeo.es/servicios-posventa",
  fiat: "https://www.fiat.es/servicios-posventa.html",
  jeep: "https://www.jeep.es/servicios-posventa.html",
  mitsubishi: "https://www.mitsubishi-motors.es/servicios-posventa",
  honda: "https://www.honda.es/cars/services.html",
  subaru: "https://www.subaru.es/servicio-postventa",
  "land rover": "https://www.landrover.es/servicios-posventa/index.html",
  landrover: "https://www.landrover.es/servicios-posventa/index.html",
  jaguar: "https://www.jaguar.es/servicios-posventa/index.html",
  ds: "https://www.dsautomobiles.es/servicios-posventa.html",
  smart: "https://www.smart.com/es/es/service/",
  byd: "https://www.byd.com/es/service",
};

const VAG_BRANDS = new Set(
  ["volkswagen", "vw", "audi", "seat", "skoda", "cupra"].map((b) => normalizeKey(b)),
);

function primaryBrand(chunk: KnowledgeChunk): string | undefined {
  for (const raw of chunk.brands) {
    if (raw.trim() === "*") continue;
    const key = normalizeKey(raw);
    if (BRAND_SERVICE_URLS[key]) return key;
    if (VAG_BRANDS.has(key)) return "volkswagen";
  }
  return undefined;
}

function brandServiceUrl(chunk: KnowledgeChunk): string | undefined {
  const brand = primaryBrand(chunk);
  if (!brand) return undefined;
  return BRAND_SERVICE_URLS[brand];
}

function hasEmissionsScope(chunk: KnowledgeChunk): boolean {
  const tagHit = chunk.tags?.some((t) => /fap|dpf|adblue|scr|egr|emis|nox|antipol/i.test(t));
  const fuelHit = chunk.fuels?.includes("diesel");
  const idHit = /fap|dpf|adblue|scr|egr|emis|antipol/i.test(chunk.id);
  return Boolean(tagHit || (fuelHit && idHit) || idHit);
}

function overlay(
  chunk: KnowledgeChunk,
  level: KnowledgeVerificationLevel,
  sourceUrl: string,
  externalRef: string,
): Partial<KnowledgeChunk> {
  return {
    id: chunk.id,
    isDemo: false,
    curatedAt: CURATED_AT,
    verificationLevel: level,
    externalRef,
    sourceUrl,
  };
}

/**
 * Curación automática por tipo/fuente para chunks aún demo.
 * Los overlays manuales en curation.json tienen prioridad (se aplican antes).
 */
export function buildCatalogCurationOverlay(chunk: KnowledgeChunk): Partial<KnowledgeChunk> | null {
  if (!chunk.isDemo) return null;

  if (chunk.type === "maintenance" && !chunkAppliesToAllBrands(chunk)) {
    const url = brandServiceUrl(chunk);
    if (!url) return null;
    const brand = primaryBrand(chunk) ?? "fabricante";
    return overlay(
      chunk,
      "oem_manual",
      url,
      `Mantenimiento oficial ${brand} - intervalos y historial red Espana`,
    );
  }

  if (chunk.type === "maintenance" && chunkAppliesToAllBrands(chunk)) {
    const evScope = /ev|thermal|battery|plugin|electric|regen|friction-brake/i.test(
      chunk.id + chunk.title + (chunk.fuels?.join("") ?? ""),
    );
    if (evScope) {
      return overlay(
        chunk,
        "regulatory",
        EU_AUTO_ENV_URL,
        `Normativa UE / mantenimiento EV - ${chunk.title}`,
      );
    }
    return overlay(
      chunk,
      "reliability_report",
      ADAC_PANNEN_URL,
      `ADAC / mantenimiento universal - ${chunk.title}`,
    );
  }

  if (chunk.type === "inspection" && chunkAppliesToAllBrands(chunk)) {
    return overlay(
      chunk,
      "regulatory",
      DGT_ITV_URL,
      "DGT - inspeccion tecnica de vehiculos (ITV) Espana",
    );
  }

  if (chunk.type === "inspection" && !chunkAppliesToAllBrands(chunk)) {
    const url = brandServiceUrl(chunk);
    if (url) {
      return overlay(
        chunk,
        "oem_manual",
        url,
        `Inspeccion precompra - verificar historial en red ${primaryBrand(chunk) ?? "OEM"} Espana`,
      );
    }
    return overlay(
      chunk,
      "regulatory",
      DGT_ITV_URL,
      "DGT ITV + checklist inspección precompra adaptado a mercado español",
    );
  }

  if (chunk.type === "issue" && hasEmissionsScope(chunk)) {
    return overlay(
      chunk,
      "safety_gate_portal",
      SAFETY_GATE_SEARCH,
      `Safety Gate - alertas/recalls antipolucion: ${chunk.title}`,
    );
  }

  if (chunk.id.startsWith("playbook-")) {
    if (hasEmissionsScope(chunk) || /fap|dpf|adblue|scr|egr/i.test(chunk.id)) {
      return overlay(
        chunk,
        "safety_gate_portal",
        SAFETY_GATE_SEARCH,
        `Safety Gate - playbook emisiones diesel: ${chunk.title}`,
      );
    }
    if (/hybrid|hvb|battery|bateria|phev|plugin/i.test(chunk.id + chunk.title)) {
      const url = BRAND_SERVICE_URLS.toyota;
      return overlay(
        chunk,
        "oem_manual",
        url,
        "Procedimiento hibrido/PHEV - Toyota Hybrid Health Check (referencia sector)",
      );
    }
    if (/prebuy|itv|inspeccion/i.test(chunk.id)) {
      return overlay(chunk, "regulatory", DGT_ITV_URL, "DGT - protocolo inspeccion tecnica y precompra");
    }
    if (/wet-belt|puretech|correa|timing|chain|distribuc/i.test(chunk.id + chunk.title)) {
      return overlay(
        chunk,
        "safety_gate_portal",
        SAFETY_GATE_SEARCH,
        "Safety Gate - distribucion y correa: " + chunk.title,
      );
    }
    return overlay(
      chunk,
      "reliability_report",
      ADAC_PANNEN_URL,
      `ADAC Pannenstatistik - sintoma/causa (${chunk.title})`,
    );
  }

  if (chunk.id.startsWith("obd-") || chunk.id.startsWith("emis-")) {
    return overlay(
      chunk,
      "regulatory",
      EU_AUTO_ENV_URL,
      `Normativa UE emisiones/OBD - ${chunk.title}`,
    );
  }

  if (chunk.id.startsWith("sys-") || chunk.id.startsWith("safety-")) {
    if (/airbag|recall|vin/i.test(chunk.id)) {
      return overlay(chunk, "safety_gate_portal", SAFETY_GATE_PORTAL, "Safety Gate - " + chunk.title);
    }
    return overlay(
      chunk,
      "regulatory",
      DGT_ITV_URL,
      `ITV / sistemas seguridad - ${chunk.title}`,
    );
  }

  if (chunk.type === "issue") {
    const url = brandServiceUrl(chunk);
    if (url) {
      return overlay(
        chunk,
        "oem_manual",
        url,
        `Patron documentado - verificar campanas/historial red ${primaryBrand(chunk) ?? "OEM"}: ${chunk.title}`,
      );
    }
    return overlay(
      chunk,
      "reliability_report",
      ADAC_PANNEN_URL,
      `Patron fiabilidad ADAC/taller - ${chunk.title}`,
    );
  }

  return null;
}

export function buildCatalogCurationOverlays(chunks: KnowledgeChunk[]): Partial<KnowledgeChunk>[] {
  const overlays: Partial<KnowledgeChunk>[] = [];
  for (const chunk of chunks) {
    if (!chunk.isDemo) continue;
    const overlayRow = buildCatalogCurationOverlay(chunk);
    if (overlayRow) overlays.push(overlayRow);
  }
  return overlays;
}
