import type { Drivetrain, PowertrainClass } from "@/types/identity";
import type { FuelType } from "@/types/vehicle";

/**
 * Nomenclaturas de versión propias de cada fabricante.
 *
 * Sirven para dos cosas:
 *  1. detectar que una versión no pertenece a la marca declarada
 *     (p. ej. "sDrive18d" es de BMW, no de Ebro);
 *  2. deducir combustible o tracción cuando el usuario no los aporta,
 *     y detectar contradicciones cuando sí lo hace.
 *
 * `brands` usa claves normalizadas (ver normalizeBrandKey).
 */
export interface TrimSignal {
  id: string;
  pattern: RegExp;
  /** Marcas (o grupos) que usan esta nomenclatura. Vacío = transversal. */
  brands: string[];
  fuel?: FuelType[];
  powertrain?: PowertrainClass[];
  drive?: Drivetrain;
  /**
   * true solo si la denominación es inequívocamente propia de esas marcas.
   * Las genéricas (GDI, MPI, GTI, V8…) informan del combustible pero nunca
   * bloquean por "marca equivocada": las usan varios fabricantes.
   */
  exclusive: boolean;
  /** Texto legible de la convención, para explicar el conflicto. */
  label: string;
}

const VAG = ["volkswagen", "audi", "seat", "cupra", "skoda"];
const PSA = ["peugeot", "citroen", "ds", "opel", "vauxhall"];
const RENAULT_ALLIANCE = ["renault", "dacia", "nissan", "alpine"];
const FCA = ["fiat", "alfa romeo", "jeep", "lancia", "abarth"];
const HYUNDAI_KIA = ["hyundai", "kia", "genesis"];
const TOYOTA_GROUP = ["toyota", "lexus"];
const JLR = ["land rover", "range rover", "jaguar"];

export const TRIM_SIGNALS: TrimSignal[] = [
  // --- BMW / MINI ---
  {
    id: "bmw-drive-diesel",
    pattern: /\b[sx]drive\s?\d{2}\s?d\b/i,
    brands: ["bmw"],
    exclusive: true,
    fuel: ["diesel"],
    label: "sDrive/xDrive ##d (BMW, diésel)",
  },
  {
    id: "bmw-drive-petrol",
    pattern: /\b[sx]drive\s?\d{2}\s?i\b/i,
    brands: ["bmw"],
    exclusive: true,
    fuel: ["petrol"],
    label: "sDrive/xDrive ##i (BMW, gasolina)",
  },
  {
    id: "bmw-drive-phev",
    pattern: /\b[sx]drive\s?\d{2}\s?e\b/i,
    brands: ["bmw"],
    exclusive: true,
    fuel: ["plugin_hybrid"],
    label: "sDrive/xDrive ##e (BMW, híbrido enchufable)",
  },
  {
    id: "bmw-xdrive",
    pattern: /\bxdrive\b/i,
    brands: ["bmw"],
    exclusive: true,
    drive: "awd",
    label: "xDrive (BMW, tracción total)",
  },
  {
    id: "bmw-sdrive",
    pattern: /\bsdrive\b/i,
    brands: ["bmw"],
    exclusive: true,
    drive: "rwd",
    label: "sDrive (BMW, tracción a un solo eje)",
  },
  {
    id: "mini-all4",
    pattern: /\ball4\b/i,
    brands: ["mini"],
    exclusive: true,
    drive: "awd",
    label: "ALL4 (MINI, tracción total)",
  },
  {
    id: "mini-cooper-d",
    pattern: /\bcooper\s?s?d\b/i,
    brands: ["mini"],
    exclusive: false,
    fuel: ["diesel"],
    label: "Cooper D / Cooper SD (MINI, diésel)",
  },

  // --- Grupo VAG ---
  {
    id: "vag-tdi",
    pattern: /\btdi\b/i,
    brands: VAG,
    exclusive: true,
    fuel: ["diesel"],
    label: "TDI (Grupo VAG, diésel)",
  },
  {
    id: "vag-tsi",
    pattern: /\b(tsi|tfsi|etsi)\b/i,
    brands: VAG,
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "TSI/TFSI (Grupo VAG, gasolina)",
  },
  {
    id: "vag-gtd",
    pattern: /\bgtd\b/i,
    brands: ["volkswagen"],
    exclusive: true,
    fuel: ["diesel"],
    label: "GTD (Volkswagen, diésel)",
  },
  {
    id: "vag-gti",
    pattern: /\bgti\b/i,
    brands: ["volkswagen", "seat", "peugeot"],
    exclusive: false,
    fuel: ["petrol"],
    label: "GTI (gasolina deportivo)",
  },
  {
    id: "vw-4motion",
    pattern: /\b4motion\b/i,
    brands: ["volkswagen"],
    exclusive: true,
    drive: "awd",
    label: "4MOTION (Volkswagen, tracción total)",
  },
  {
    id: "audi-quattro",
    pattern: /\bquattro\b/i,
    brands: ["audi"],
    exclusive: true,
    drive: "awd",
    label: "quattro (Audi, tracción total)",
  },
  {
    id: "audi-etron",
    pattern: /\be-?tron\b/i,
    brands: ["audi"],
    exclusive: true,
    powertrain: ["bev", "phev"],
    label: "e-tron (Audi, electrificado)",
  },
  {
    id: "vw-id",
    pattern: /\bid\.?\s?[3457]\b/i,
    brands: ["volkswagen"],
    exclusive: true,
    fuel: ["electric"],
    label: "ID.x (Volkswagen, eléctrico)",
  },

  // --- Mercedes ---
  {
    id: "mb-cdi",
    pattern: /\b(cdi|bluetec|bluetec)\b/i,
    brands: ["mercedes-benz"],
    exclusive: true,
    fuel: ["diesel"],
    label: "CDI/BlueTEC (Mercedes-Benz, diésel)",
  },
  {
    id: "mb-4matic",
    pattern: /\b4matic\b/i,
    brands: ["mercedes-benz"],
    exclusive: true,
    drive: "awd",
    label: "4MATIC (Mercedes-Benz, tracción total)",
  },
  {
    id: "mb-eq",
    pattern: /\beq[abcesv]\b/i,
    brands: ["mercedes-benz"],
    exclusive: true,
    fuel: ["electric"],
    label: "EQx (Mercedes-Benz, eléctrico)",
  },

  // --- Alianza Renault-Nissan / Dacia ---
  {
    id: "renault-dci",
    pattern: /\bdci\b/i,
    brands: RENAULT_ALLIANCE,
    exclusive: true,
    fuel: ["diesel"],
    label: "dCi (Renault/Dacia/Nissan, diésel)",
  },
  {
    id: "renault-tce",
    pattern: /\btce\b/i,
    brands: RENAULT_ALLIANCE,
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "TCe (Renault/Dacia, gasolina)",
  },
  {
    id: "renault-etech",
    pattern: /\be-?tech\b/i,
    brands: ["renault", "dacia"],
    exclusive: true,
    powertrain: ["hybrid", "phev", "bev"],
    label: "E-Tech (Renault, electrificado)",
  },
  {
    id: "nissan-dig",
    pattern: /\bdig-?t\b/i,
    brands: ["nissan"],
    exclusive: true,
    fuel: ["petrol"],
    label: "DIG-T (Nissan, gasolina)",
  },

  // --- Stellantis / PSA / Opel ---
  {
    id: "psa-hdi",
    pattern: /\b(blue\s?hdi|hdi|e-?hdi)\b/i,
    brands: PSA,
    exclusive: true,
    fuel: ["diesel"],
    label: "HDi/BlueHDi (Stellantis-PSA, diésel)",
  },
  {
    id: "psa-puretech",
    pattern: /\bpuretech\b/i,
    brands: PSA,
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "PureTech (Stellantis-PSA, gasolina)",
  },
  {
    id: "psa-thp",
    pattern: /\bthp\b/i,
    brands: PSA,
    exclusive: true,
    fuel: ["petrol"],
    label: "THP (PSA, gasolina)",
  },
  {
    id: "opel-cdti",
    pattern: /\bcdti\b/i,
    brands: ["opel", "vauxhall"],
    exclusive: true,
    fuel: ["diesel"],
    label: "CDTi (Opel, diésel)",
  },

  // --- Ford ---
  {
    id: "ford-tdci",
    pattern: /\b(tdci|ecoblue)\b/i,
    brands: ["ford"],
    exclusive: true,
    fuel: ["diesel"],
    label: "TDCi/EcoBlue (Ford, diésel)",
  },
  {
    id: "ford-ecoboost",
    pattern: /\becoboost\b/i,
    brands: ["ford"],
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "EcoBoost (Ford, gasolina)",
  },

  // --- Toyota / Lexus ---
  {
    id: "toyota-d4d",
    pattern: /\bd-?4-?d\b/i,
    brands: TOYOTA_GROUP,
    exclusive: true,
    fuel: ["diesel"],
    label: "D-4D (Toyota/Lexus, diésel)",
  },
  {
    id: "toyota-vvti",
    pattern: /\b(vvt-?i|dual\s?vvt-?i)\b/i,
    brands: TOYOTA_GROUP,
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "VVT-i (Toyota/Lexus, gasolina)",
  },

  // --- Hyundai / Kia ---
  {
    id: "hk-crdi",
    pattern: /\bcrdi\b/i,
    brands: HYUNDAI_KIA,
    exclusive: true,
    fuel: ["diesel"],
    label: "CRDi (Hyundai/Kia, diésel)",
  },
  {
    id: "hk-tgdi",
    pattern: /\b(t-?gdi|mpi)\b/i,
    brands: HYUNDAI_KIA,
    exclusive: false,
    fuel: ["petrol", "hybrid"],
    label: "T-GDI/MPI (Hyundai/Kia, gasolina)",
  },

  // --- FCA / Stellantis italiano ---
  {
    id: "fca-multijet",
    pattern: /\b(multijet|jtdm?|mjt)\b/i,
    brands: FCA,
    exclusive: true,
    fuel: ["diesel"],
    label: "Multijet/JTD (Grupo FCA, diésel)",
  },
  {
    id: "fca-multiair",
    pattern: /\b(multiair|t-?jet|twinair|firefly)\b/i,
    brands: FCA,
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "MultiAir/TwinAir/Firefly (Grupo FCA, gasolina)",
  },

  // --- Mazda / Honda / Suzuki / Mitsubishi / Subaru ---
  {
    id: "mazda-skyactiv-d",
    pattern: /\bskyactiv-?d\b/i,
    brands: ["mazda"],
    exclusive: true,
    fuel: ["diesel"],
    label: "Skyactiv-D (Mazda, diésel)",
  },
  {
    id: "mazda-skyactiv-g",
    pattern: /\bskyactiv-?[gx]\b/i,
    brands: ["mazda"],
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "Skyactiv-G/X (Mazda, gasolina)",
  },
  {
    id: "honda-idtec",
    pattern: /\bi-?dtec\b/i,
    brands: ["honda"],
    exclusive: true,
    fuel: ["diesel"],
    label: "i-DTEC (Honda, diésel)",
  },
  {
    id: "honda-vtec",
    pattern: /\bi?-?vtec\b/i,
    brands: ["honda"],
    exclusive: true,
    fuel: ["petrol", "hybrid"],
    label: "VTEC (Honda, gasolina)",
  },
  {
    id: "honda-ehev",
    pattern: /\be:?hev\b/i,
    brands: ["honda"],
    exclusive: true,
    powertrain: ["hybrid"],
    label: "e:HEV (Honda, híbrido)",
  },
  {
    id: "suzuki-ddis",
    pattern: /\bddis\b/i,
    brands: ["suzuki"],
    exclusive: true,
    fuel: ["diesel"],
    label: "DDiS (Suzuki, diésel)",
  },
  {
    id: "suzuki-allgrip",
    pattern: /\ballgrip\b/i,
    brands: ["suzuki"],
    exclusive: true,
    drive: "awd",
    label: "AllGrip (Suzuki, tracción total)",
  },
  {
    id: "mitsubishi-did",
    pattern: /\bdi-?d\b/i,
    brands: ["mitsubishi"],
    exclusive: true,
    fuel: ["diesel"],
    label: "DI-D (Mitsubishi, diésel)",
  },

  // --- Volvo ---
  {
    id: "volvo-diesel",
    pattern: /\bd[2345]\b/i,
    brands: ["volvo"],
    exclusive: false,
    fuel: ["diesel"],
    label: "D2–D5 (Volvo, diésel)",
  },
  {
    id: "volvo-petrol",
    pattern: /\bt[2345]\b/i,
    brands: ["volvo"],
    exclusive: false,
    fuel: ["petrol", "hybrid"],
    label: "T2–T5 (Volvo, gasolina)",
  },
  {
    id: "volvo-phev",
    pattern: /\b(t[68]|recharge)\b/i,
    brands: ["volvo", "polestar"],
    exclusive: false,
    powertrain: ["phev", "bev", "hybrid"],
    label: "T6/T8/Recharge (Volvo, electrificado)",
  },

  // --- JLR ---
  {
    id: "jlr-diesel",
    pattern: /\b([ts]d4|sd6|d1[5678]0|d200|d250|d300)\b/i,
    brands: JLR,
    exclusive: false,
    fuel: ["diesel"],
    label: "TD4/SD4/D### (JLR, diésel)",
  },
  {
    id: "jlr-petrol",
    pattern: /\b(si4|p2[05]0|p300|p400)\b/i,
    brands: JLR,
    exclusive: false,
    fuel: ["petrol", "hybrid"],
    label: "Si4/P### (JLR, gasolina)",
  },

  // --- Tesla y eléctricos puros ---
  {
    id: "tesla-variants",
    pattern: /\b(long\s?range|standard\s?range|plaid|performance\s?awd)\b/i,
    brands: ["tesla"],
    exclusive: true,
    fuel: ["electric"],
    label: "Long Range / Standard Range / Plaid (Tesla, eléctrico)",
  },
];

/** Sufijos genéricos de combustible que no identifican marca pero sí energía. */
export const GENERIC_FUEL_SIGNALS: Array<{
  id: string;
  pattern: RegExp;
  fuel: FuelType[];
  label: string;
}> = [
  { id: "generic-diesel", pattern: /\b(diesel|diésel|gasoil|gasóleo)\b/i, fuel: ["diesel"], label: "diésel" },
  {
    id: "generic-petrol",
    pattern: /\b(gasolina|petrol|benzina)\b/i,
    fuel: ["petrol"],
    label: "gasolina",
  },
  {
    id: "generic-electric",
    pattern: /\b(el[eé]ctrico|electric|ev|bev|kwh)\b/i,
    fuel: ["electric"],
    label: "eléctrico",
  },
  {
    id: "generic-phev",
    pattern: /\b(phev|enchufable|plug-?in)\b/i,
    fuel: ["plugin_hybrid"],
    label: "híbrido enchufable",
  },
  {
    id: "generic-hybrid",
    pattern: /\b(h[ií]brido|hybrid|hev|hsd)\b/i,
    fuel: ["hybrid", "plugin_hybrid"],
    label: "híbrido",
  },
  { id: "generic-lpg", pattern: /\b(glp|lpg|autogas)\b/i, fuel: ["lpg"], label: "GLP" },
  { id: "generic-cng", pattern: /\b(gnc|cng|tgi|ecofuel)\b/i, fuel: ["cng"], label: "GNC" },
];

/** Cilindradas y arquitecturas declaradas explícitamente en la versión. */
export const ENGINE_LAYOUT_PATTERN = /\b(v6|v8|v10|v12|w12|boxer|flat-?6)\b/i;
