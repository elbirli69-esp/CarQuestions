export const HELP_STORAGE_VERSION = "v2";
export const HELP_STORAGE_PREFIX = `carquestions.help.${HELP_STORAGE_VERSION}`;
export const WELCOME_SEEN_KEY = `${HELP_STORAGE_PREFIX}.welcome.seen`;

export interface HelpStep {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
}

/** Onboarding shown once on first visit (header Ayuda reopens from step 1). */
export const HELP_STEPS: HelpStep[] = [
  {
    id: "welcome",
    title: "Así funciona CarQuestions",
    body: "Copiloto para comprar un coche de segunda mano en España: precio de mercado real, fallos habituales del modelo, preguntas al vendedor y qué revisar antes de pagar.",
  },
  {
    id: "form",
    title: "1. Introduce pocos datos",
    body: "Lo más rápido: pega la URL del anuncio (coches.net o AutoScout24). También puedes usar la matrícula para estimar año y provincia gratis, o elegir marca y modelo del catálogo.",
    bullets: [
      "URL del anuncio: marca, modelo, versión, año, km, precio, combustible, CV, cambio y equipamiento",
      "Matrícula gratis: año estimado y provincia (matrículas antiguas)",
      "Catálogo coches.net: marca y modelo con búsqueda",
      "Versión: desplegable con motorizaciones del catálogo (CV, combustible, años y código motor)",
      "Opcional: estado, libro, propietarios, ITV… mejora preguntas y confianza",
    ],
  },
  {
    id: "identity",
    title: "2. Identidad del vehículo",
    body: "Cruzamos anuncio, catálogo y matrícula para verificar que marca, modelo y versión son coherentes. Si algo no cuadra, verás una alerta antes de confiar en el precio.",
    bullets: [
      "Cadena de evidencia: qué datos vienen del anuncio, catálogo o matrícula",
      "Códigos de motor y caja para emparejar fallos de plataforma compartida",
      "Alerta si la versión no pertenece al modelo elegido",
    ],
  },
  {
    id: "market",
    title: "3. Precio de mercado",
    body: "Buscamos anuncios similares en coches.net y AutoScout24, filtramos por año y combustible, y estimamos con la mediana observada. Sin inventar precios si no hay comparables.",
    bullets: [
      "Veredicto: barato, de mercado o caro",
      "Intervalo orientativo y número de anuncios usados",
      "Alternativas del segmento cuando hay rivales comparables",
    ],
  },
  {
    id: "reliability",
    title: "4. Fiabilidad y riesgos",
    body: "Los fallos habituales salen de un corpus curado (OEM, ADAC, Safety Gate, foros técnicos), no de datos en vivo de DGT o ITV. Incluye problemas del motor concreto y componentes compartidos (cajas DSG, etc.).",
    bullets: [
      "Averías conocidas del modelo y motorización",
      "Componentes compartidos entre marcas cuando conocemos el código",
      "Mantenimiento previsto según kilómetros",
    ],
  },
  {
    id: "results",
    title: "5. Resultados por pestaña",
    body: "Tras analizar, usa las pestañas Resumen, Mercado, Análisis, Comprar y Chat. La primera vez que abras cada una verás una guía breve de lo que incluye.",
  },
  {
    id: "limits",
    title: "Qué no sustituye",
    body: "No es informe de bastidor ni inspección mecánica. No consulta DGT/ITV en tiempo real. Úsalo para negociar, preparar la visita y saber qué preguntar.",
  },
];

export const RESULT_TAB_IDS = ["summary", "market", "detail", "buy", "chat"] as const;
export type ResultTabId = typeof RESULT_TAB_IDS[number];

export const RESULT_TAB_HELP: Record<ResultTabId, HelpStep> = {
  summary: {
    id: "tab-summary",
    title: "Resumen",
    body: "Vista rápida para decidir si merece seguir mirando el coche: identidad verificada, veredicto de compra, tasación y qué datos faltan.",
    bullets: [
      "Identidad: coherencia marca–modelo–versión y origen de cada dato",
      "Veredicto de compra según precio, riesgos y calidad del anuncio",
      "Tasación orientativa frente al precio del anuncio",
      "Datos que faltan: qué aportaría más confianza al análisis",
    ],
  },
  market: {
    id: "tab-market",
    title: "Mercado",
    body: "Aquí ves de dónde sale el precio y los anuncios que hemos usado. Si no hay suficientes comparables, lo indicamos con baja confianza.",
    bullets: [
      "Fuentes consultadas (coches.net, AutoScout24) y notas de búsqueda",
      "Anuncios comparables del mismo modelo con precio y km",
      "Alternativas del segmento para valorar rivales",
      "Sin comparables suficientes: no se inventa un precio de mercado",
    ],
  },
  detail: {
    id: "tab-detail",
    title: "Análisis",
    body: "Profundiza en puntuaciones, calidad del anuncio y fiabilidad del modelo según nuestro corpus curado para España.",
    bullets: [
      "Puntuaciones: precio, fiabilidad, anuncio y riesgo global",
      "Calidad del anuncio: qué falta en la descripción y fotos",
      "Fiabilidad: averías habituales del motor y modelo",
      "Componentes compartidos: fallos de plataforma (motor/caja) cuando aplican",
      "Mantenimiento: revisiones típicas según kilómetros",
    ],
  },
  buy: {
    id: "tab-buy",
    title: "Comprar",
    body: "Prepara la compra: preguntas concretas para el vendedor y checklist de inspección adaptado al combustible del coche.",
    bullets: [
      "Preguntas priorizadas (accidentes, mantenimiento, ITV, propietarios…)",
      "Adaptadas al tipo de motor: diésel, híbrido, eléctrico, etc.",
      "Checklist antes de pagar: prueba, bajos, frenos, documentación",
    ],
  },
  chat: {
    id: "tab-chat",
    title: "Chat",
    body: "Pregunta sobre este coche concreto. El asistente usa el análisis, el mercado y la fiabilidad del modelo — no datos genéricos.",
    bullets: [
      "Ejemplos: «¿Es buen precio?», «¿Qué revisar antes de comprar?»",
      "Respuestas basadas en tu anuncio y comparables observados",
      "Para dudas de mecánica o negociación tras el análisis",
    ],
  },
};

function contextualSeenKey(contextId: string): string {
  return `${HELP_STORAGE_PREFIX}.context.${contextId}.seen`;
}

export function readWelcomeHelpSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function writeWelcomeHelpSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

/** @deprecated Use readWelcomeHelpSeen */
export function readHelpSeen(): boolean {
  return readWelcomeHelpSeen();
}

/** @deprecated Use writeWelcomeHelpSeen */
export function writeHelpSeen(): void {
  writeWelcomeHelpSeen();
}

export function readContextHelpSeen(contextId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(contextualSeenKey(contextId)) === "1";
  } catch {
    return true;
  }
}

export function writeContextHelpSeen(contextId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(contextualSeenKey(contextId), "1");
  } catch {
    // ignore
  }
}

export function resultTabContextId(tabId: ResultTabId): string {
  return `tab.${tabId}`;
}
