/** Siglas históricas de matrícula provincial (1971–2000). */
const PROVINCE_BY_CODE: Record<string, string> = {
  A: "Alicante",
  AB: "Albacete",
  AL: "Almería",
  AV: "Ávila",
  B: "Barcelona",
  BA: "Badajoz",
  BI: "Vizcaya",
  BU: "Burgos",
  C: "A Coruña",
  CA: "Cádiz",
  CC: "Cáceres",
  CE: "Ceuta",
  CO: "Córdoba",
  CR: "Ciudad Real",
  CS: "Castellón",
  CU: "Cuenca",
  GC: "Las Palmas",
  GI: "Girona",
  GR: "Granada",
  GU: "Guadalajara",
  H: "Huelva",
  HU: "Huesca",
  J: "Jaén",
  L: "Lleida",
  LE: "León",
  LO: "La Rioja",
  LU: "Lugo",
  M: "Madrid",
  MA: "Málaga",
  ML: "Melilla",
  MU: "Murcia",
  NA: "Navarra",
  O: "Asturias",
  OR: "Ourense",
  P: "Palencia",
  PM: "Illes Balears",
  PO: "Pontevedra",
  S: "Cantabria",
  SA: "Salamanca",
  SE: "Sevilla",
  SG: "Segovia",
  SO: "Soria",
  SS: "Gipuzkoa",
  T: "Tarragona",
  TE: "Teruel",
  TF: "Santa Cruz de Tenerife",
  TO: "Toledo",
  V: "Valencia",
  VA: "Valladolid",
  VI: "Álava",
  Z: "Zaragoza",
  ZA: "Zamora",
};

export function parseProvincialPlate(normalized: string): {
  provinceCode?: string;
  location?: string;
} {
  const match = normalized.match(/^([A-Z]{1,2})(\d{4})([A-Z]{2})$/);
  if (!match) return {};

  const code = match[1];
  const location = PROVINCE_BY_CODE[code];
  if (!location) return { provinceCode: code };

  return { provinceCode: code, location };
}
