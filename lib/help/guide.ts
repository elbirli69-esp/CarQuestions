export const HELP_STORAGE_KEY = "carquestions.help.v1.seen";

export interface HelpStep {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
}

export const HELP_STEPS: HelpStep[] = [
  {
    id: "welcome",
    title: "Así funciona CarQuestions",
    body: "Te ayuda a decidir si un coche de segunda mano merece la visita: si el precio tiene sentido, qué riesgos hay, qué falta saber y qué preguntar. Si no hay evidencia, lo dice.",
  },
  {
    id: "form",
    title: "1. Rellena lo esencial",
    body: "Con marca, modelo, año de matriculación, kilómetros y combustible ya podemos buscar comparables. Pega la URL de un anuncio de coches.net: intentamos leer la ficha completa (descripción y equipamiento) y rellenar el formulario. Versión, potencia (CV) y precio del anuncio afinan mucho el resultado.",
    bullets: [
      "Marca y modelo del catálogo coches.net (búsqueda con filtro, no texto libre)",
      "Atajo: pega la URL del anuncio de coches.net arriba del formulario",
      "Recomendado: versión, CV y precio del anuncio",
      "Opcional: estado, libro, propietarios… para ajustar y preparar preguntas",
    ],
  },
  {
    id: "market",
    title: "2. Precio de mercado",
    body: "Buscamos anuncios similares en el mercado español (coches.net cuando está disponible), filtramos por año y combustible, y estimamos el valor con la mediana de esos precios. Luego lo comparamos con el precio del anuncio.",
    bullets: [
      "Veredicto: barato, de mercado o caro",
      "Intervalo orientativo (bajo–alto)",
      "Si no hay anuncios, verás «sin mercado comparable», no un precio inventado",
    ],
  },
  {
    id: "results",
    title: "3. Resultados y chat",
    body: "Tras analizar verás valoración, anuncios similares, puntuaciones, fiabilidad del modelo, preguntas para el vendedor y un chat para dudar sobre ese coche concreto.",
  },
  {
    id: "limits",
    title: "Qué no sustituye",
    body: "No es un informe de bastidor ni una inspección mecánica. No consulta DGT/ITV en tiempo real. Úsalo como apoyo para negociar y preparar la visita al coche.",
  },
];

export function readHelpSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HELP_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function writeHelpSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HELP_STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}
