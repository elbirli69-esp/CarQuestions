import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, SellerQuestion } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { isElectrifiedFuel, isElectricFuel } from "@/lib/vehicles/identity";

const HV_HINT = /bater[ií]a hv|soh|pack|alta tensi[oó]n|heat pump|bomba de calor|octovalve|brake-by-wire|preacondicion/i;
const DIESEL_HINT = /fap|dpf|egr|adblue|inyector|common.?rail|turbo di[eé]sel/i;
const PETROL_HINT = /correa en ba[nñ]o|wet belt|cadena|puretech|ecoboost|gdi/i;

function allowedForFuel(text: string, vehicle: Vehicle): boolean {
  if (!isElectrifiedFuel(vehicle.fuel) && HV_HINT.test(text)) return false;
  if (vehicle.fuel !== "diesel" && DIESEL_HINT.test(text) && !/itv|historial|factura/i.test(text)) return false;
  if (vehicle.fuel === "diesel" && /bomba de calor|heat pump|octovalve/i.test(text)) return false;
  if (vehicle.fuel === "petrol" && HV_HINT.test(text)) return false;
  if (isElectricFuel(vehicle.fuel) && PETROL_HINT.test(text) && !/software|freno/i.test(text)) return false;
  const isSdrive = /\bsdrive/i.test(vehicle.version ?? "") && !/\bxdrive/i.test(vehicle.version ?? "");
  if (isSdrive && /xdrive|transferencia|haldex/i.test(text)) return false;
  return true;
}

function pushUnique(
  list: SellerQuestion[],
  seen: Set<string>,
  item: SellerQuestion,
): void {
  const key = item.question.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ ...item, reason: item.reason ?? item.why });
}

export function buildSellerQuestions(
  vehicle: Vehicle,
  issues: KnownIssue[],
  knowledgeChunks: KnowledgeChunk[] = [],
  options?: { identityValid?: boolean },
): SellerQuestion[] {
  const identityValid = options?.identityValid ?? true;
  const questions: SellerQuestion[] = [];
  const seen = new Set<string>();

  pushUnique(questions, seen, {
    question: "¿Tiene historial completo de mantenimiento y facturas?",
    why: "Permite comprobar que los mantenimientos se han realizado realmente.",
    reason: "Permite comprobar que los mantenimientos se han realizado realmente.",
    priority: "alta",
    category: "historial",
  });
  pushUnique(questions, seen, {
    question: "¿Ha tenido accidentes, golpes estructurales o reparaciones de chapa?",
    why: "Un siniestro no siempre se ve en fotos. Hay que preguntarlo por escrito.",
    priority: "alta",
    category: "siniestros",
  });
  if (!vehicle.itv) {
    pushUnique(questions, seen, {
      question: "¿Hasta cuándo tiene la ITV en vigor y ha pasado alguna con deficiencias?",
      why: "La ITV no garantiza el estado mecánico, pero un rechazo reciente es una señal.",
      priority: "alta",
      category: "documentacion",
    });
  }
  if (vehicle.owners == null) {
    pushUnique(questions, seen, {
      question: "¿Cuántos propietarios ha tenido el vehículo?",
      why: "Afecta a la trazabilidad y, en algunos casos, al precio.",
      priority: "media",
      category: "historial",
    });
  }

  if (isElectrifiedFuel(vehicle.fuel)) {
    pushUnique(questions, seen, {
      question: "¿Cuál es el estado de la batería y hay informe de salud (SOH)?",
      why: "En un eléctrico o híbrido el pack es el coste oculto. Sin cifra, no hay que inventarla.",
      priority: "alta",
      category: "bateria",
    });
  } else {
    pushUnique(questions, seen, {
      question: "¿Cuándo se cambió la distribución (correa o cadena) y con qué kilometraje?",
      why: "Es una de las intervenciones caras más habituales en motores térmicos.",
      priority: "alta",
      category: "mantenimiento",
    });
  }

  if (isElectricFuel(vehicle.fuel)) {
    pushUnique(questions, seen, {
      question: "¿Lleva bomba de calor y se ha comprobado la carga rápida en invierno?",
      why: "Pregunta de segmento EV, no un problema documentado de este modelo concreto.",
      priority: "media",
      category: "bateria",
    });
  }

  if (vehicle.fuel === "diesel") {
    pushUnique(questions, seen, {
      question: "¿El coche ha hecho sobre todo ciudad o carretera? ¿El FAP y la EGR tienen avisos?",
      why: "Los diésel urbanos acumulan más problemas de antipolución.",
      priority: "alta",
      category: "diesel",
    });
  }

  if (vehicle.transmission === "automatic" && !isElectricFuel(vehicle.fuel)) {
    pushUnique(questions, seen, {
      question: "¿Se ha realizado el mantenimiento de la caja automática (aceite y filtro)?",
      why: "Muchas cajas automáticas no son «para toda la vida».",
      priority: "media",
      category: "transmision",
    });
  }

  if (identityValid) {
    for (const chunk of knowledgeChunks) {
      for (const ask of chunk.askSeller ?? []) {
        if (!allowedForFuel(`${ask} ${chunk.title} ${chunk.content}`, vehicle)) continue;
        pushUnique(questions, seen, {
          question: ask,
          why: `${chunk.title}. Fuente: ${chunk.source}`,
          relatedIssue: chunk.title,
          priority: "media",
          category: "modelo",
        });
      }
    }

    for (const issue of issues.slice(0, 3)) {
      if (issue.evidenceLevel === "C" || issue.evidenceLevel === "D") continue;
      if (!allowedForFuel(`${issue.title} ${issue.detail}`, vehicle)) continue;
      pushUnique(questions, seen, {
        question: `Respecto a ${issue.title.toLowerCase()}, ¿se ha revisado o reparado en este coche?`,
        why: issue.detail,
        relatedIssue: issue.title,
        priority: issue.severity === "high" ? "alta" : "media",
        category: "modelo",
      });
    }
  }

  const priorityRank = { alta: 0, media: 1, baja: 2 };
  return questions
    .sort((a, b) => (priorityRank[a.priority ?? "media"] ?? 1) - (priorityRank[b.priority ?? "media"] ?? 1))
    .slice(0, 8);
}
