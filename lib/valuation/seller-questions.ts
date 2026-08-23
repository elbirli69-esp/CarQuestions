import type { KnowledgeChunk } from "@/types/knowledge";
import type {
  KnownIssue,
  SellerQuestion,
  SellerQuestionCategory,
  SellerQuestionPriority,
} from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

interface RankedQuestion extends SellerQuestion {
  priority: SellerQuestionPriority;
  category: SellerQuestionCategory;
  rank: number;
}

const PRIORITY_RANK: Record<SellerQuestionPriority, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

function q(
  question: string,
  why: string,
  priority: SellerQuestionPriority,
  category: SellerQuestionCategory,
  rank: number,
  relatedIssue?: string,
): RankedQuestion {
  return { question, why, reason: why, priority, category, rank, relatedIssue };
}

function isEv(fuel: Vehicle["fuel"]): boolean {
  return fuel === "electric";
}

function isPhev(fuel: Vehicle["fuel"]): boolean {
  return fuel === "plugin_hybrid";
}

function isHybrid(fuel: Vehicle["fuel"]): boolean {
  return fuel === "hybrid" || fuel === "plugin_hybrid";
}

function mentionsAwd(vehicle: Vehicle): boolean {
  const blob = `${vehicle.model} ${vehicle.version ?? ""}`;
  return /4x4|awd|4wd|quattro|xdrive|4motion|4matic|allgrip|haldex|traction/i.test(blob);
}

/**
 * Build a ranked list of 5–8 seller questions.
 * Fuel-irrelevant questions (HV battery, heat pump on diesel/petrol) are excluded.
 */
export function buildSellerQuestions(
  vehicle: Vehicle,
  issues: KnownIssue[],
  knowledgeChunks: KnowledgeChunk[] = [],
  options?: { blockModelSpecific?: boolean },
): SellerQuestion[] {
  const blockModel = options?.blockModelSpecific ?? false;
  const questions: RankedQuestion[] = [
    q(
      "¿Tiene historial completo de mantenimiento y facturas?",
      "Permite comprobar que los mantenimientos se han realizado realmente.",
      "alta",
      "documentacion",
      10,
    ),
    q(
      "¿Ha tenido accidentes, golpes estructurales o reparaciones de chapa?",
      "Un siniestro no siempre se ve en fotos. Conviene dejar constancia por escrito.",
      "alta",
      "historial",
      20,
    ),
    q(
      "¿Cuántos propietarios ha tenido el vehículo?",
      "Afecta a la trazabilidad y, en algunos casos, al precio negociable.",
      "media",
      "historial",
      30,
    ),
    q(
      "¿Ha sufrido inundación, filtraciones graves o declarado pérdida total?",
      "Flood y pérdida total dejan fallos eléctricos/estructurales difíciles de detectar a ojo.",
      "alta",
      "historial",
      25,
    ),
  ];

  if (!vehicle.itv) {
    questions.push(
      q(
        "¿Hasta cuándo tiene la ITV en vigor y ha pasado alguna con deficiencias?",
        "La ITV no garantiza el estado mecánico, pero un rechazo reciente es una señal.",
        "alta",
        "legal",
        35,
      ),
    );
  }

  // With broken identity, only documentation/legal questions — no fuel/model tech
  if (blockModel) {
    return questions
      .filter((item) => item.category === "documentacion" || item.category === "historial" || item.category === "legal")
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.rank - b.rank)
      .slice(0, 6)
      .map(({ question, why, reason, priority, category, relatedIssue }) => ({
        question,
        why,
        reason,
        priority,
        category,
        relatedIssue,
      }));
  }

  if (isEv(vehicle.fuel) || isPhev(vehicle.fuel)) {
    questions.push(
      q(
        "¿Cuál es el estado de salud de la batería (SOH) y hay informe?",
        "La batería de alta tensión es el componente más caro; sin SOH la compra es a ciegas.",
        "alta",
        "electrico",
        15,
      ),
      q(
        "¿Lleva bomba de calor (heat pump) y preacondiciona la batería antes de cargar rápido?",
        "Sin heat pump y sin preconditioning, autonomía en invierno y curva DC suelen degradarse.",
        "media",
        "electrico",
        40,
      ),
    );
  } else if (isHybrid(vehicle.fuel)) {
    questions.push(
      q(
        "¿Hay avisos del sistema híbrido y se ha revisado la batería de tracción?",
        "En híbridos la batería y la electrónica de potencia son puntos caros.",
        "alta",
        "electrico",
        18,
      ),
    );
  } else {
    // Conventional ICE — timing belt/chain, never HV / heat pump
    questions.push(
      q(
        "¿Cuándo se cambió la distribución (correa o cadena) y con qué kilometraje?",
        "Es una de las intervenciones caras más habituales en motores térmicos.",
        "alta",
        "mecanica",
        15,
      ),
    );
  }

  if (vehicle.fuel === "diesel") {
    questions.push(
      q(
        "¿El coche ha hecho sobre todo ciudad o carretera? ¿FAP/EGR tienen avisos?",
        "Los diésel urbanos acumulan más problemas de antipolución.",
        "alta",
        "mecanica",
        22,
      ),
    );
  }

  if (vehicle.transmission === "automatic") {
    questions.push(
      q(
        "¿Se ha realizado el mantenimiento de la caja automática (aceite y filtro)?",
        "Muchas automáticas no son «para toda la vida»; sin mantenimiento el riesgo sube.",
        "media",
        "mecanica",
        45,
      ),
    );
  }

  if (mentionsAwd(vehicle)) {
    questions.push(
      q(
        "¿Se ha hecho el servicio de Haldex/transferencia/diferenciales y los neumáticos son parejos?",
        "Los AWD fallan caro si se omite el aceite del acoplamiento o si las ruedas difieren.",
        "media",
        "mecanica",
        50,
      ),
    );
  }

  if (vehicle.year > 0 && vehicle.year <= 2005) {
    questions.push(
      q(
        "¿Hay fotos de bajos/estribos y qué trabajos de óxido se hicieron?",
        "En youngtimers el chasis manda: cosmética buena con óxido estructural sale caro.",
        "media",
        "mecanica",
        55,
      ),
    );
  }

  const seen = new Set(questions.map((item) => item.question.toLowerCase()));

  if (!blockModel) {
    for (const chunk of knowledgeChunks) {
      // Only model-specific askSeller prompts
      if (!chunk.models || chunk.models.length === 0) continue;
      if (chunk.brands.some((b) => b.trim() === "*")) continue;
      for (const ask of chunk.askSeller ?? []) {
        const key = ask.toLowerCase();
        if (seen.has(key)) continue;
        if (isIrrelevantForFuel(ask, vehicle.fuel)) continue;
        seen.add(key);
        questions.push(
          q(ask, `${chunk.title}. Fuente: ${chunk.source}`, "media", "modelo", 60, chunk.title),
        );
      }
    }

    for (const issue of issues.filter((i) => i.evidenceLevel === "A" || i.evidenceLevel === "B").slice(0, 3)) {
      const question = `Respecto a ${issue.title.toLowerCase()}, ¿se ha revisado o reparado en este coche?`;
      const key = question.toLowerCase();
      if (seen.has(key)) continue;
      if (isIrrelevantForFuel(question, vehicle.fuel)) continue;
      seen.add(key);
      questions.push(q(question, issue.detail, "alta", "modelo", 12, issue.title));
    }
  }

  return questions
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.rank - b.rank)
    .slice(0, 8)
    .map(({ question, why, reason, priority, category, relatedIssue }) => ({
      question,
      why,
      reason,
      priority,
      category,
      relatedIssue,
    }));
}

function isIrrelevantForFuel(text: string, fuel: Vehicle["fuel"]): boolean {
  const t = text.toLowerCase();
  const evOnly =
    /bater[ií]a\s*(hv|de alta)|soh|heat\s?pump|bomba de calor|precondicion|carga\s*r[aá]pida|brake-by-wire|octovalve/i.test(
      t,
    );
  const dieselOnly = /\bfap\b|\begr\b|adblue|inyectores\s*di[eé]sel/i.test(t);

  if (evOnly && fuel !== "electric" && fuel !== "plugin_hybrid" && fuel !== "hybrid") {
    return true;
  }
  if (dieselOnly && fuel !== "diesel") return true;
  // Heat pump specifically not for non-plug-in
  if (/bomba de calor|heat\s?pump/i.test(t) && fuel !== "electric" && fuel !== "plugin_hybrid") {
    return true;
  }
  return false;
}
