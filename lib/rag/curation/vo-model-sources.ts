/**
 * Fuentes de curación primarias para el top 100 VO España.
 */
import type { KnowledgeVerificationLevel } from "@/types/knowledge";

export interface VoModelPrimaryCuration {
  rank: number;
  brandSlug: string;
  modelSlug: string;
  chunkId: string;
  verificationLevel: KnowledgeVerificationLevel;
  externalRef: string;
  sourceUrl: string;
}

const SAFETY_GATE = "https://ec.europa.eu/safety-gate-alerts/screen/search";
const ADAC = "https://www.adac.de/rund-ums-fahrzeug/tests/adac-pannenstatistik/";

const OEM = {
  daciaRecall: "https://www.dacia.es/rellamadas.html",
  renaultRecall: "https://www.renault.es/rellamadas.html",
  vwService: "https://www.volkswagen.es/posventa/servicios",
  vwCampaigns: "https://www.volkswagen.es/es/recursos/campanas-de-seguridad.html",
  seatService: "https://www.seat.es/servicios",
  skodaService: "https://www.skoda.es/servicios",
  audiService: "https://www.audi.es/es/web/es/servicios-posventa.html",
  peugeotService: "https://www.peugeot.es/servicios-posventa.html",
  opelService: "https://www.opel.es/servicios-posventa.html",
  toyotaHybrid: "https://www.toyota.es/mantenimiento-y-reparacion/hybrid-health-check",
  lexusService: "https://www.lexusauto.es/servicios-posventa",
  hyundaiRecall: "https://www.hyundai.com/es/es/servicios-al-cliente/campanas-de-seguridad.html",
  hyundaiService: "https://www.hyundai.com/es/es/servicios-al-cliente.html",
  kiaCampaigns: "https://www.kia.com/es/service/campanas-de-seguridad/",
  kiaService: "https://www.kia.com/es/servicio/",
  bmwService: "https://www.bmw.es/es/fastlane/service.html",
  mercedesService: "https://www.mercedes-benz.es/passengercars/services.html",
  hondaService: "https://www.honda.es/cars/services.html",
  mazdaService: "https://www.mazda.es/mazda-experience/servicio/postventa/",
  jeepService: "https://www.jeep.es/servicios-posventa.html",
  fiatService: "https://www.fiat.es/servicios-posventa.html",
  volvoService: "https://www.volvocars.com/es/servicio-mantenimiento/",
  suzukiService: "https://auto.suzuki.es/servicios-posventa",
  mgService: "https://www.mg.es/posventa",
  teslaSupport: "https://www.tesla.com/es_ES/support",
  alfaService: "https://www.alfaromeo.es/servicios-posventa",
  cupraService: "https://www.cupraofficial.es/servicios",
  dsService: "https://www.dsautomobiles.es/servicios-posventa.html",
  renaultService: "https://www.renault.es/servicios.html",
  speakEvLeaf: "https://speakev.com/forums/nissan-leaf.40/",
} as const;

export const VO_CURATION_AT = "2026-08-26T15:30:00.000Z";

export const VO_MODEL_PRIMARY_CURATION: VoModelPrimaryCuration[] = [
  { rank: 1, brandSlug: "dacia", modelSlug: "sandero", chunkId: "dacia-sandero-iii-rust-suspension", verificationLevel: "oem_recall", externalRef: "Dacia Sandero III — rellamadas VIN y Eco-G/óxido", sourceUrl: OEM.daciaRecall },
  { rank: 2, brandSlug: "renault", modelSlug: "clio", chunkId: "clio-tce-egr", verificationLevel: "oem_recall", externalRef: "Renault Clio TCe — campañas EGR (consulta VIN)", sourceUrl: OEM.renaultRecall },
  { rank: 3, brandSlug: "volkswagen", modelSlug: "golf", chunkId: "golf-7-water-pump", verificationLevel: "oem_manual", externalRef: "VW Golf Mk7 EA888 — bomba agua/termostato", sourceUrl: OEM.vwService },
  { rank: 4, brandSlug: "seat", modelSlug: "ibiza", chunkId: "seat-ibiza-arona-tsi", verificationLevel: "oem_manual", externalRef: "SEAT Ibiza TSI — aceite y DSG oficial", sourceUrl: OEM.seatService },
  { rank: 5, brandSlug: "ford", modelSlug: "focus", chunkId: "ford-ecoboost-coolant", verificationLevel: "oem_recall", externalRef: "Ford EcoBoost — campañas refrigerante (Safety Gate)", sourceUrl: SAFETY_GATE },
  { rank: 6, brandSlug: "renault", modelSlug: "megane", chunkId: "renault-dci-turbo", verificationLevel: "oem_recall", externalRef: "Renault Mégane dCi K9K — turbo y FAP", sourceUrl: OEM.renaultRecall },
  { rank: 7, brandSlug: "peugeot", modelSlug: "208", chunkId: "peugeot-208-puretech", verificationLevel: "oem_recall", externalRef: "Peugeot 208 PureTech — campañas correa", sourceUrl: SAFETY_GATE },
  { rank: 8, brandSlug: "opel", modelSlug: "corsa", chunkId: "opel-adam-corsa-timing", verificationLevel: "oem_manual", externalRef: "Opel Corsa — distribución Stellantis", sourceUrl: OEM.opelService },
  { rank: 9, brandSlug: "nissan", modelSlug: "qashqai", chunkId: "nissan-qashqai-dpf-clutch", verificationLevel: "safety_gate_portal", externalRef: "Nissan Qashqai — FAP dCi y embrague", sourceUrl: SAFETY_GATE },
  { rank: 10, brandSlug: "toyota", modelSlug: "yaris", chunkId: "toyota-hybrid-battery-refurb", verificationLevel: "oem_manual", externalRef: "Toyota Yaris Hybrid — Hybrid Health Check", sourceUrl: OEM.toyotaHybrid },
  { rank: 11, brandSlug: "volkswagen", modelSlug: "polo", chunkId: "vag-dq200-dry-clutch", verificationLevel: "oem_manual", externalRef: "VW Polo DSG DQ200 — servicio oficial", sourceUrl: OEM.vwService },
  { rank: 12, brandSlug: "ford", modelSlug: "fiesta", chunkId: "ford-powershift-recall-pattern", verificationLevel: "oem_recall", externalRef: "Ford Fiesta — campañas Powershift/EcoBoost", sourceUrl: SAFETY_GATE },
  { rank: 13, brandSlug: "peugeot", modelSlug: "308", chunkId: "peugeot-308-puretech-belt", verificationLevel: "oem_recall", externalRef: "Peugeot 308 PureTech — alertas correa", sourceUrl: SAFETY_GATE },
  { rank: 14, brandSlug: "citroen", modelSlug: "c3", chunkId: "psa-puretech-wet-belt-detail", verificationLevel: "oem_recall", externalRef: "Citroën C3 PureTech — wet belt", sourceUrl: SAFETY_GATE },
  { rank: 15, brandSlug: "hyundai", modelSlug: "i30", chunkId: "hyundai-kia-gdi-carbon", verificationLevel: "oem_recall", externalRef: "Hyundai i30 T-GDI — campañas motor", sourceUrl: OEM.hyundaiRecall },
  { rank: 16, brandSlug: "seat", modelSlug: "leon", chunkId: "leon-tfsi-oil", verificationLevel: "oem_manual", externalRef: "SEAT León TSI — consumo aceite", sourceUrl: OEM.seatService },
  { rank: 17, brandSlug: "renault", modelSlug: "captur", chunkId: "renault-edc-dct", verificationLevel: "oem_recall", externalRef: "Renault Captur EDC — campañas transmisión", sourceUrl: OEM.renaultRecall },
  { rank: 18, brandSlug: "volkswagen", modelSlug: "passat", chunkId: "vag-ea888-water-pump", verificationLevel: "oem_manual", externalRef: "VW Passat EA888 — refrigeración TSI", sourceUrl: OEM.vwService },
  { rank: 19, brandSlug: "skoda", modelSlug: "octavia", chunkId: "skoda-mqb-octavia-camshaft", verificationLevel: "oem_manual", externalRef: "Škoda Octavia MQB — levas y DSG", sourceUrl: OEM.skodaService },
  { rank: 20, brandSlug: "ford", modelSlug: "kuga", chunkId: "ford-ecoboost-coolant", verificationLevel: "oem_recall", externalRef: "Ford Kuga EcoBoost — refrigerante", sourceUrl: SAFETY_GATE },
  { rank: 21, brandSlug: "toyota", modelSlug: "corolla", chunkId: "toyota-corolla-hybrid-hv-soh", verificationLevel: "oem_manual", externalRef: "Toyota Corolla Hybrid — SOH HV oficial", sourceUrl: OEM.toyotaHybrid },
  { rank: 22, brandSlug: "hyundai", modelSlug: "tucson", chunkId: "hyundai-tucson-phev", verificationLevel: "oem_recall", externalRef: "Hyundai Tucson PHEV — campañas VIN", sourceUrl: OEM.hyundaiRecall },
  { rank: 23, brandSlug: "peugeot", modelSlug: "2008", chunkId: "peugeot-2008-second-gen", verificationLevel: "oem_recall", externalRef: "Peugeot 2008 II — PureTech/BlueHDi", sourceUrl: SAFETY_GATE },
  { rank: 24, brandSlug: "audi", modelSlug: "a3", chunkId: "vag-dq200-dry-clutch", verificationLevel: "oem_manual", externalRef: "Audi A3 — DSG DQ200 oficial", sourceUrl: OEM.audiService },
  { rank: 25, brandSlug: "bmw", modelSlug: "serie-3", chunkId: "bmw-n47-timing-chain", verificationLevel: "safety_gate_portal", externalRef: "BMW Serie 3 N47/B47 — cadena UE", sourceUrl: SAFETY_GATE },
  { rank: 26, brandSlug: "mercedes-benz", modelSlug: "clase-c", chunkId: "mercedes-om651-chain", verificationLevel: "safety_gate_portal", externalRef: "Mercedes Clase C OM651 — cadena", sourceUrl: SAFETY_GATE },
  { rank: 27, brandSlug: "seat", modelSlug: "arona", chunkId: "vw-t-roc-vag-platform", verificationLevel: "oem_manual", externalRef: "SEAT Arona MQB — TSI/DSG", sourceUrl: OEM.seatService },
  { rank: 28, brandSlug: "dacia", modelSlug: "duster", chunkId: "dacia-sandero-iii-rust-suspension", verificationLevel: "oem_recall", externalRef: "Dacia Duster — rellamadas y GLP", sourceUrl: OEM.daciaRecall },
  { rank: 29, brandSlug: "kia", modelSlug: "sportage", chunkId: "kia-sportage-ql-diesel", verificationLevel: "safety_gate_portal", externalRef: "Kia Sportage dCi — FAP", sourceUrl: SAFETY_GATE },
  { rank: 30, brandSlug: "mg", modelSlug: "zs", chunkId: "mg-zs-hybrid-12v-infotainment", verificationLevel: "oem_manual", externalRef: "MG ZS — posventa oficial España", sourceUrl: OEM.mgService },
  { rank: 31, brandSlug: "volkswagen", modelSlug: "t-roc", chunkId: "vw-t-roc-vag-platform", verificationLevel: "oem_manual", externalRef: "VW T-Roc — plataforma VAG", sourceUrl: OEM.vwService },
  { rank: 32, brandSlug: "opel", modelSlug: "astra", chunkId: "opel-1-2-turbo-puretech-shared", verificationLevel: "oem_recall", externalRef: "Opel Astra PureTech 1.2 — campañas correa", sourceUrl: SAFETY_GATE },
  { rank: 33, brandSlug: "peugeot", modelSlug: "3008", chunkId: "psa-1-5-bluehdi", verificationLevel: "safety_gate_portal", externalRef: "Peugeot 3008 BlueHDi — SCR/FAP", sourceUrl: SAFETY_GATE },
  { rank: 34, brandSlug: "citroen", modelSlug: "c4", chunkId: "psa-puretech-wet-belt-detail", verificationLevel: "oem_recall", externalRef: "Citroën C4 PureTech — wet belt", sourceUrl: SAFETY_GATE },
  { rank: 35, brandSlug: "renault", modelSlug: "scenic", chunkId: "renault-dci-turbo", verificationLevel: "oem_recall", externalRef: "Renault Scenic dCi — turbo K9K", sourceUrl: OEM.renaultRecall },
  { rank: 36, brandSlug: "ford", modelSlug: "puma", chunkId: "ford-1-0-ecoboost-wet-belt", verificationLevel: "oem_recall", externalRef: "Ford Puma EcoBoost — campañas", sourceUrl: SAFETY_GATE },
  { rank: 37, brandSlug: "toyota", modelSlug: "rav4", chunkId: "toyota-rav4-hybrid-awd-brakes", verificationLevel: "oem_manual", externalRef: "Toyota RAV4 Hybrid — SOH y frenos", sourceUrl: OEM.toyotaHybrid },
  { rank: 38, brandSlug: "nissan", modelSlug: "juke", chunkId: "nissan-qashqai-j11-cvt", verificationLevel: "reliability_report", externalRef: "Nissan Juke CVT — ADAC/foros Jatco", sourceUrl: ADAC },
  { rank: 39, brandSlug: "kia", modelSlug: "ceed", chunkId: "kia-ceed-1-0-t-gdi", verificationLevel: "oem_manual", externalRef: "Kia Ceed T-GDI — servicio Kia", sourceUrl: OEM.kiaService },
  { rank: 40, brandSlug: "kia", modelSlug: "stonic", chunkId: "kia-stonic-tgdi-dct-urban", verificationLevel: "oem_manual", externalRef: "Kia Stonic DCT — campañas Kia", sourceUrl: OEM.kiaCampaigns },
  { rank: 41, brandSlug: "hyundai", modelSlug: "kona", chunkId: "kia-niro-ev-hybrid-soh", verificationLevel: "oem_manual", externalRef: "Hyundai Kona — HV/EV campañas", sourceUrl: OEM.hyundaiRecall },
  { rank: 42, brandSlug: "toyota", modelSlug: "c-hr", chunkId: "toyota-corolla-hybrid-hv-soh", verificationLevel: "oem_manual", externalRef: "Toyota C-HR Hybrid — SOH HV", sourceUrl: OEM.toyotaHybrid },
  { rank: 43, brandSlug: "toyota", modelSlug: "yaris-cross", chunkId: "toyota-corolla-hybrid-hv-soh", verificationLevel: "oem_manual", externalRef: "Toyota Yaris Cross — SOH HV", sourceUrl: OEM.toyotaHybrid },
  { rank: 44, brandSlug: "audi", modelSlug: "a4", chunkId: "audi-a4-b9-oil-consumption", verificationLevel: "oem_manual", externalRef: "Audi A4 B9 TFSI — consumo aceite", sourceUrl: OEM.audiService },
  { rank: 45, brandSlug: "audi", modelSlug: "q3", chunkId: "audi-q3-q2-dsg-tfsi-issue", verificationLevel: "oem_manual", externalRef: "Audi Q3 — DSG/TFSI/quattro", sourceUrl: OEM.audiService },
  { rank: 46, brandSlug: "bmw", modelSlug: "x1", chunkId: "bmw-n47-timing-chain", verificationLevel: "oem_manual", externalRef: "BMW X1 B47 — cadena y BMW Service", sourceUrl: OEM.bmwService },
  { rank: 47, brandSlug: "bmw", modelSlug: "x3", chunkId: "bmw-n47-timing-chain", verificationLevel: "oem_manual", externalRef: "BMW X3 diésel — cadena N47/B47", sourceUrl: OEM.bmwService },
  { rank: 48, brandSlug: "mercedes-benz", modelSlug: "clase-a", chunkId: "mercedes-a-class-dct", verificationLevel: "oem_manual", externalRef: "Mercedes Clase A DCT — oficial", sourceUrl: OEM.mercedesService },
  { rank: 49, brandSlug: "volkswagen", modelSlug: "tiguan", chunkId: "vag-ea888-water-pump", verificationLevel: "oem_manual", externalRef: "VW Tiguan EA888 — refrigeración", sourceUrl: OEM.vwService },
  { rank: 50, brandSlug: "skoda", modelSlug: "fabia", chunkId: "audi-a1-polo-platform-tsi", verificationLevel: "oem_manual", externalRef: "Škoda Fabia MQB — TSI/DQ200", sourceUrl: OEM.skodaService },
  { rank: 51, brandSlug: "honda", modelSlug: "civic", chunkId: "honda-earthdreams-oil-dilution", verificationLevel: "oem_recall", externalRef: "Honda Civic 1.5 — dilución aceite", sourceUrl: SAFETY_GATE },
  { rank: 52, brandSlug: "honda", modelSlug: "hr-v", chunkId: "honda-earthdreams-oil-dilution", verificationLevel: "oem_manual", externalRef: "Honda HR-V — dilución aceite", sourceUrl: OEM.hondaService },
  { rank: 53, brandSlug: "mazda", modelSlug: "cx-5", chunkId: "mazda-skyactiv-dpf", verificationLevel: "safety_gate_portal", externalRef: "Mazda CX-5 Skyactiv-D — FAP", sourceUrl: SAFETY_GATE },
  { rank: 54, brandSlug: "mazda", modelSlug: "mazda3", chunkId: "mazda-skyactiv-dpf", verificationLevel: "oem_manual", externalRef: "Mazda 3 Skyactiv — manual España", sourceUrl: OEM.mazdaService },
  { rank: 55, brandSlug: "jeep", modelSlug: "renegade", chunkId: "jeep-renegade-1-6-multijet", verificationLevel: "safety_gate_portal", externalRef: "Jeep Renegade Multijet — FAP", sourceUrl: SAFETY_GATE },
  { rank: 56, brandSlug: "fiat", modelSlug: "500", chunkId: "fiat-500-firefly-hybrid", verificationLevel: "oem_manual", externalRef: "Fiat 500 Hybrid — posventa Fiat", sourceUrl: OEM.fiatService },
  { rank: 57, brandSlug: "volvo", modelSlug: "xc40", chunkId: "volvo-spa-electronics", verificationLevel: "oem_manual", externalRef: "Volvo XC40 — electrónica SPA", sourceUrl: OEM.volvoService },
  { rank: 58, brandSlug: "mini", modelSlug: "countryman", chunkId: "mini-cooper-timing-chain", verificationLevel: "oem_manual", externalRef: "MINI Countryman — BMW Service", sourceUrl: OEM.bmwService },
  { rank: 59, brandSlug: "suzuki", modelSlug: "vitara", chunkId: "suzuki-1-4-boosterjet-dct", verificationLevel: "oem_manual", externalRef: "Suzuki Vitara Boosterjet — oficial", sourceUrl: OEM.suzukiService },
  { rank: 60, brandSlug: "dacia", modelSlug: "logan", chunkId: "dacia-sandero-rust", verificationLevel: "oem_recall", externalRef: "Dacia Logan — óxido y rellamadas", sourceUrl: OEM.daciaRecall },
  { rank: 61, brandSlug: "seat", modelSlug: "ateca", chunkId: "seat-cupra-dsg-launch", verificationLevel: "oem_manual", externalRef: "SEAT Ateca — DSG/TSI", sourceUrl: OEM.seatService },
  { rank: 62, brandSlug: "cupra", modelSlug: "formentor", chunkId: "vw-t-roc-vag-platform", verificationLevel: "oem_manual", externalRef: "Cupra Formentor — posventa Cupra", sourceUrl: OEM.cupraService },
  { rank: 63, brandSlug: "renault", modelSlug: "kadjar", chunkId: "renault-dci-turbo", verificationLevel: "oem_recall", externalRef: "Renault Kadjar dCi — turbo/FAP", sourceUrl: OEM.renaultRecall },
  { rank: 64, brandSlug: "nissan", modelSlug: "leaf", chunkId: "nissan-leaf-soh-chademo", verificationLevel: "technical_literature", externalRef: "Nissan Leaf — SOH CHAdeMO (SpeakEV)", sourceUrl: OEM.speakEvLeaf },
  { rank: 65, brandSlug: "renault", modelSlug: "zoe", chunkId: "renault-zoe-battery", verificationLevel: "oem_manual", externalRef: "Renault Zoe — contrato batería/SOH", sourceUrl: OEM.renaultService },
  { rank: 66, brandSlug: "volkswagen", modelSlug: "id3", chunkId: "vw-id3-id4-meb-issue", verificationLevel: "oem_recall", externalRef: "VW ID.3 — campañas MEB/software", sourceUrl: OEM.vwCampaigns },
  { rank: 67, brandSlug: "tesla", modelSlug: "model-3", chunkId: "tesla-suspension-12v", verificationLevel: "oem_manual", externalRef: "Tesla Model 3 — soporte oficial", sourceUrl: OEM.teslaSupport },
  { rank: 68, brandSlug: "volkswagen", modelSlug: "id4", chunkId: "vw-id3-id4-meb-issue", verificationLevel: "oem_recall", externalRef: "VW ID.4 — campañas MEB", sourceUrl: OEM.vwCampaigns },
  { rank: 69, brandSlug: "hyundai", modelSlug: "ioniq-5", chunkId: "kia-hyundai-ev6-ioniq5-iccau", verificationLevel: "oem_recall", externalRef: "Hyundai Ioniq 5 — campaña ICCU", sourceUrl: OEM.hyundaiRecall },
  { rank: 70, brandSlug: "kia", modelSlug: "niro", chunkId: "kia-niro-ev-hybrid-soh", verificationLevel: "oem_manual", externalRef: "Kia Niro — SOH y campañas Kia", sourceUrl: OEM.kiaCampaigns },
  { rank: 71, brandSlug: "kia", modelSlug: "ev6", chunkId: "kia-hyundai-ev6-ioniq5-iccau", verificationLevel: "oem_recall", externalRef: "Kia EV6 — campaña ICCU E-GMP", sourceUrl: OEM.kiaCampaigns },
  { rank: 72, brandSlug: "mg", modelSlug: "mg4", chunkId: "mg4-ev-battery-suspension", verificationLevel: "oem_manual", externalRef: "MG4 EV — SOH y garantía MG", sourceUrl: OEM.mgService },
  { rank: 73, brandSlug: "tesla", modelSlug: "model-y", chunkId: "tesla-suspension-12v", verificationLevel: "oem_manual", externalRef: "Tesla Model Y — soporte Tesla", sourceUrl: OEM.teslaSupport },
  { rank: 74, brandSlug: "peugeot", modelSlug: "5008", chunkId: "psa-bluehdi-adblue-fap", verificationLevel: "safety_gate_portal", externalRef: "Peugeot 5008 BlueHDi — SCR", sourceUrl: SAFETY_GATE },
  { rank: 75, brandSlug: "citroen", modelSlug: "c5-aircross", chunkId: "psa-bluehdi-adblue-fap", verificationLevel: "safety_gate_portal", externalRef: "Citroën C5 Aircross BlueHDi", sourceUrl: SAFETY_GATE },
  { rank: 76, brandSlug: "opel", modelSlug: "mokka", chunkId: "opel-1-2-turbo-puretech-shared", verificationLevel: "oem_recall", externalRef: "Opel Mokka PureTech — campañas", sourceUrl: SAFETY_GATE },
  { rank: 77, brandSlug: "renault", modelSlug: "talisman", chunkId: "renault-talisman-1-6-dci-multilink", verificationLevel: "oem_recall", externalRef: "Renault Talisman dCi — FAP", sourceUrl: OEM.renaultRecall },
  { rank: 78, brandSlug: "skoda", modelSlug: "kodiaq", chunkId: "skoda-kodiaq-tdi-dsg-family", verificationLevel: "oem_manual", externalRef: "Škoda Kodiaq — TDI/DSG/Haldex", sourceUrl: OEM.skodaService },
  { rank: 79, brandSlug: "volkswagen", modelSlug: "touran", chunkId: "skoda-kodiaq-tdi-dsg-family", verificationLevel: "oem_manual", externalRef: "VW Touran — MQB familiar DSG", sourceUrl: OEM.vwService },
  { rank: 80, brandSlug: "audi", modelSlug: "a1", chunkId: "audi-a1-polo-platform-tsi", verificationLevel: "oem_manual", externalRef: "Audi A1 — TSI/DQ200", sourceUrl: OEM.audiService },
  { rank: 81, brandSlug: "bmw", modelSlug: "serie-1", chunkId: "bmw-n47-timing-chain", verificationLevel: "oem_manual", externalRef: "BMW Serie 1 — cadena N47/B47", sourceUrl: OEM.bmwService },
  { rank: 82, brandSlug: "lexus", modelSlug: "nx", chunkId: "toyota-rav4-hybrid-awd-brakes", verificationLevel: "oem_manual", externalRef: "Lexus NX Hybrid — Lexus España", sourceUrl: OEM.lexusService },
  { rank: 83, brandSlug: "toyota", modelSlug: "prius", chunkId: "toyota-hybrid-battery-refurb", verificationLevel: "oem_manual", externalRef: "Toyota Prius — Hybrid Health Check", sourceUrl: OEM.toyotaHybrid },
  { rank: 84, brandSlug: "toyota", modelSlug: "aygo", chunkId: "toyota-aygo-clutch", verificationLevel: "reliability_report", externalRef: "Toyota Aygo — ADAC utilitarios", sourceUrl: ADAC },
  { rank: 85, brandSlug: "nissan", modelSlug: "x-trail", chunkId: "nissan-qashqai-dpf-clutch", verificationLevel: "safety_gate_portal", externalRef: "Nissan X-Trail dCi — FAP", sourceUrl: SAFETY_GATE },
  { rank: 86, brandSlug: "suzuki", modelSlug: "swift", chunkId: "suzuki-1-4-boosterjet-dct", verificationLevel: "oem_manual", externalRef: "Suzuki Swift — Boosterjet/DCT oficial", sourceUrl: OEM.suzukiService },
  { rank: 87, brandSlug: "dacia", modelSlug: "spring", chunkId: "dacia-spring-ev-urban", verificationLevel: "oem_recall", externalRef: "Dacia Spring EV — rellamadas", sourceUrl: OEM.daciaRecall },
  { rank: 88, brandSlug: "jeep", modelSlug: "compass", chunkId: "jeep-compass-trailhawk-dpf", verificationLevel: "safety_gate_portal", externalRef: "Jeep Compass — FAP Multijet", sourceUrl: SAFETY_GATE },
  { rank: 89, brandSlug: "alfa-romeo", modelSlug: "giulietta", chunkId: "alfa-giulietta-multiair", verificationLevel: "oem_manual", externalRef: "Alfa Giulietta MultiAir — oficial", sourceUrl: OEM.alfaService },
  { rank: 90, brandSlug: "volvo", modelSlug: "xc60", chunkId: "volvo-spa-air-suspension", verificationLevel: "oem_manual", externalRef: "Volvo XC60 — suspensión SPA", sourceUrl: OEM.volvoService },
  { rank: 91, brandSlug: "ford", modelSlug: "mondeo", chunkId: "ford-ecoboost-coolant-intrusion", verificationLevel: "oem_recall", externalRef: "Ford Mondeo EcoBoost — refrigerante", sourceUrl: SAFETY_GATE },
  { rank: 92, brandSlug: "citroen", modelSlug: "c4-cactus", chunkId: "peugeot-308-puretech-belt", verificationLevel: "oem_recall", externalRef: "Citroën C4 Cactus PureTech — campañas correa", sourceUrl: SAFETY_GATE },
  { rank: 93, brandSlug: "ds", modelSlug: "ds3-crossback", chunkId: "ds3-puretech-crossback", verificationLevel: "oem_manual", externalRef: "DS 3 Crossback — posventa DS", sourceUrl: OEM.dsService },
  { rank: 94, brandSlug: "hyundai", modelSlug: "bayon", chunkId: "kia-stonic-tgdi-dct-urban", verificationLevel: "oem_manual", externalRef: "Hyundai Bayon — T-GDI urbano", sourceUrl: OEM.hyundaiService },
  { rank: 95, brandSlug: "kia", modelSlug: "picanto", chunkId: "kia-picanto-urban-reliability", verificationLevel: "reliability_report", externalRef: "Kia Picanto — ADAC + Kia servicio", sourceUrl: ADAC },
  { rank: 96, brandSlug: "hyundai", modelSlug: "i20", chunkId: "kia-stonic-tgdi-dct-urban", verificationLevel: "oem_manual", externalRef: "Hyundai i20 — T-GDI/DCT", sourceUrl: OEM.hyundaiService },
  { rank: 97, brandSlug: "mg", modelSlug: "hs", chunkId: "mg-hs-phev", verificationLevel: "oem_manual", externalRef: "MG HS PHEV — posventa MG", sourceUrl: OEM.mgService },
  { rank: 98, brandSlug: "cupra", modelSlug: "born", chunkId: "vw-id3-id4-meb-issue", verificationLevel: "oem_recall", externalRef: "Cupra Born MEB — campañas VW/Cupra", sourceUrl: OEM.vwCampaigns },
  { rank: 99, brandSlug: "audi", modelSlug: "q2", chunkId: "audi-q3-q2-dsg-tfsi-issue", verificationLevel: "oem_manual", externalRef: "Audi Q2 — DSG/TFSI", sourceUrl: OEM.audiService },
  { rank: 100, brandSlug: "skoda", modelSlug: "scala", chunkId: "audi-a1-polo-platform-tsi", verificationLevel: "oem_manual", externalRef: "Škoda Scala — MQB TSI/DQ200", sourceUrl: OEM.skodaService },
];

export function buildVoModelCurationOverlays(): Array<{
  id: string;
  isDemo: false;
  curatedAt: string;
  verificationLevel: KnowledgeVerificationLevel;
  externalRef: string;
  sourceUrl: string;
}> {
  const byChunk = new Map<string, VoModelPrimaryCuration>();
  for (const row of VO_MODEL_PRIMARY_CURATION) {
    byChunk.set(row.chunkId, row);
  }
  return [...byChunk.values()].map((row) => ({
    id: row.chunkId,
    isDemo: false,
    curatedAt: VO_CURATION_AT,
    verificationLevel: row.verificationLevel,
    externalRef: row.externalRef,
    sourceUrl: row.sourceUrl,
  }));
}
