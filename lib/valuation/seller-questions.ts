import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, SellerQuestion, SellerQuestionCategory, SellerQuestionPriority } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { classifyChunkEvidence, isModelSpecificEvidence } from "@/lib/vehicles/evidence";

const PRIORITY_ORDER: Record<SellerQuestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function isEvRelevant(vehicle: Vehicle): boolean {
  return ["electric", "hybrid", "plugin_hybrid"].includes(vehicle.fuel);
}

function isDieselRelevant(vehicle: Vehicle): boolean {
  return vehicle.fuel === "diesel";
}

function categorize(question: string): SellerQuestionCategory {
  const q = question.toLowerCase();
  if (/bater|soh|hv|carga|heat pump|bomba de calor|preacondicion/.test(q)) return "electric";
  if (/fap|egr|adblue|distribuci|cadena|correa|aceite|caja|embrague/.test(q)) return "mechanical";
  if (/itv|factura|historial|propietario|vin|bastidor|document/.test(q)) return "documentation";
  if (/golpe|chapa|óxido|oxido|inund|siniestro|accidente/.test(q)) return "body";
  if (/precio|negoci|mercado/.test(q)) return "market";
  return "model_specific";
}

function isQuestionRelevantForVehicle(question: string, vehicle: Vehicle): boolean {
  const q = question.toLowerCase();
  if (!isEvRelevant(vehicle)) {
    if (/bater[ií]a hv|soh|bomba de calor|heat pump|brake-by-wire|octovalve|preacondicion|dc r[aá]pid/.test(q)) {
      return false;
    }
  }
  if (!isDieselRelevant(vehicle)) {
    if (/\bfap\b|\begr\b|adblue|regeneraci[oó]n forzada/.test(q)) {
      return false;
    }
  }
  if (vehicle.fuel === "electric" && /\bdistribuci[oó]n\b|\bcorrea\b|\bcadena\b/.test(q) && !/hibrid/.test(q)) {
    return false;
  }
  return true;
}

export function buildSellerQuestions(
  vehicle: Vehicle,
  issues: KnownIssue[],
  knowledgeChunks: KnowledgeChunk[] = [],
): SellerQuestion[] {
  const questions: SellerQuestion[] = [
    {
      question: "¿Tiene historial completo de mantenimiento y facturas?",
      why: "Sin papeles es difícil saber si los intervalos se han respetado.",
      priority: "high",
      category: "documentation",
    },
    {
      question: "¿Cuántos propietarios ha tenido el vehículo?",
      why: "Afecta a la trazabilidad y, en algunos casos, al precio.",
      priority: "high",
      category: "documentation",
    },
    {
      question: "¿Ha tenido accidentes, golpes estructurales o reparaciones de chapa?",
      why: "Un siniestro no siempre se ve en fotos. Hay que preguntarlo por escrito.",
      priority: "high",
      category: "body",
    },
    {
      question: "¿Ha sufrido inundación, filtraciones graves o declarado pérdida total / write-off?",
      why: "Flood y pérdida total dejan fallos eléctricos y estructurales que un lavado no borra.",
      priority: "high",
      category: "body",
    },
  ];

  if (isEvRelevant(vehicle)) {
    questions.push({
      question: "¿Cuál es el estado de la batería y hay informe de salud (SOH)?",
      why: "En eléctricos e híbridos enchufables, la batería condiciona el valor y la autonomía real.",
      priority: "high",
      category: "electric",
    });
  } else {
    questions.push({
      question: "¿Cuándo se cambió la distribución (correa o cadena) y con qué kilometraje?",
      why: "Es una de las intervenciones caras más habituales según el tipo de motor.",
      priority: "high",
      category: "mechanical",
    });
  }

  if (vehicle.transmission === "automatic") {
    questions.push({
      question: "¿Se ha realizado el mantenimiento de la caja automática (aceite y filtro)?",
      why: "Muchas cajas automáticas no son 'para toda la vida'. Sin mantenimiento el riesgo sube.",
      priority: "medium",
      category: "mechanical",
    });
  }

  if (isDieselRelevant(vehicle)) {
    questions.push({
      question: "¿El coche ha hecho sobre todo ciudad o carretera? ¿El FAP y la EGR tienen avisos?",
      why: "Los diésel urbanos acumulan más problemas de antipolución.",
      priority: "medium",
      category: "mechanical",
    });
  }

  if (vehicle.fuel === "electric" || vehicle.fuel === "plugin_hybrid") {
    questions.push({
      question: "¿Lleva bomba de calor y preacondiciona la batería antes de cargar rápido?",
      why: "Sin heat pump y sin preconditioning, la autonomía en invierno y la curva DC suelen ser peores.",
      priority: "medium",
      category: "electric",
    });
  }

  if (vehicle.year > 0 && vehicle.year <= 2005) {
    questions.push({
      question: "¿Hay fotos de bajos/estribos y qué trabajos de óxido o chapa estructural se hicieron?",
      why: "En youngtimers el chasis manda: un cosmético bonito con óxido estructural sale caro.",
      priority: "medium",
      category: "body",
    });
  }

  if (!vehicle.itv) {
    questions.push({
      question: "¿Hasta cuándo tiene la ITV en vigor y ha pasado alguna con deficiencias?",
      why: "La ITV no garantiza el estado mecánico, pero un rechazo reciente es una señal.",
      priority: "medium",
      category: "documentation",
    });
  }

  const seen = new Set(questions.map((item) => item.question.toLowerCase()));

  for (const chunk of knowledgeChunks) {
    const evidence = classifyChunkEvidence(chunk, vehicle);
    if (!isModelSpecificEvidence(evidence.level)) continue;

    for (const ask of chunk.askSeller ?? []) {
      if (!isQuestionRelevantForVehicle(ask, vehicle)) continue;
      const key = ask.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push({
        question: ask,
        why: `${chunk.title}. Fuente: ${chunk.source}`,
        relatedIssue: chunk.title,
        priority: "medium",
        category: categorize(ask),
        evidenceLevel: evidence.level,
      });
    }
  }

  for (const issue of issues.filter((i) => i.evidenceLevel && isModelSpecificEvidence(i.evidenceLevel)).slice(0, 3)) {
    const question = `Respecto a ${issue.title.toLowerCase()}, ¿se ha revisado o reparado en este coche?`;
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({
      question,
      why: issue.detail,
      relatedIssue: issue.title,
      priority: issue.severity === "high" ? "high" : "medium",
      category: "model_specific",
      evidenceLevel: issue.evidenceLevel,
    });
  }

  return questions
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? "low"] - PRIORITY_ORDER[b.priority ?? "low"])
    .slice(0, 8);
}
