import type { QuestionCategory, QuestionPriority, SellerQuestion } from "@/types/analysis";
import type { EvidenceLevel } from "@/types/evidence";
import type { VehicleIdentity } from "@/types/identity";
import type { TechnicalKnowledge } from "@/types/technical";
import type { Vehicle } from "@/types/vehicle";
import { currentYear } from "@/lib/utils/format";
import {
  hasCombustionEngine,
  hasHighVoltageBattery,
  isPluggable,
} from "@/lib/vehicles/identity/taxonomy";

const MAX_QUESTIONS = 8;

interface Candidate {
  id: string;
  question: string;
  reason: string;
  priority: QuestionPriority;
  category: QuestionCategory;
  evidenceLevel: EvidenceLevel;
  source?: string;
  /** Orden interno dentro de la misma prioridad. */
  weight: number;
}

const PRIORITY_RANK: Record<QuestionPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Preguntas universales que aplican a cualquier compraventa entre particulares.
 * Son de nivel D (inferencia propia) porque no proceden del corpus técnico:
 * son buenas prácticas de compra, no patrones de avería.
 */
function baseQuestions(vehicle: Vehicle): Candidate[] {
  const items: Candidate[] = [
    {
      id: "history",
      question: "¿Tiene historial completo de mantenimiento y facturas a nombre de quién?",
      reason:
        "Permite comprobar que las revisiones se hicieron de verdad y cuadrar el kilometraje con las fechas.",
      priority: "high",
      category: "historial",
      evidenceLevel: "D",
      weight: 100,
    },
    {
      id: "accidents",
      question: "¿Ha tenido accidentes, golpes estructurales o repintados? ¿Puedes ponerlo por escrito?",
      reason:
        "Un siniestro estructural no siempre se ve en fotos y condiciona seguridad y valor de reventa.",
      priority: "high",
      category: "carroceria",
      evidenceLevel: "D",
      weight: 95,
    },
    {
      id: "vin-report",
      question: "¿Me pasas el número de bastidor (VIN) para pedir el informe de la DGT?",
      reason:
        "El informe revela cargas, embargos, bajas temporales y kilometraje registrado en ITV. Cuesta unos euros y evita sorpresas.",
      priority: "high",
      category: "documentacion",
      evidenceLevel: "D",
      weight: 92,
    },
  ];

  if (!vehicle.itv) {
    items.push({
      id: "itv",
      question: "¿Hasta cuándo tiene la ITV en vigor y ha salido alguna con defectos?",
      reason:
        "La ITV no garantiza el estado mecánico, pero un rechazo reciente o una caducidad próxima son señales y coste inmediato.",
      priority: "high",
      category: "documentacion",
      evidenceLevel: "D",
      weight: 88,
    });
  }

  if (!vehicle.owners) {
    items.push({
      id: "owners",
      question: "¿Cuántos propietarios ha tenido y para qué se usaba el coche?",
      reason: "Afecta a la trazabilidad, y un ex-flota o ex-VTC tiene un desgaste distinto al mismo kilometraje.",
      priority: "medium",
      category: "uso",
      evidenceLevel: "D",
      weight: 70,
    });
  }

  items.push({
    id: "flood",
    question: "¿Ha sufrido inundación, filtraciones graves o se declaró siniestro total?",
    reason:
      "El agua deja corrosión en conectores y centralitas que aparece meses después y no se ve en una prueba corta.",
    priority: "medium",
    category: "carroceria",
    evidenceLevel: "D",
    weight: 66,
  });

  if (vehicle.advertisedPrice) {
    items.push({
      id: "negotiation",
      question: "¿Cuánto tiempo lleva el anuncio publicado y hay margen sobre el precio?",
      reason: "Un anuncio con muchos días en el portal suele tener recorrido de negociación.",
      priority: "low",
      category: "precio",
      evidenceLevel: "D",
      weight: 40,
    });
  }

  return items;
}

/**
 * Preguntas dependientes del tren motriz.
 *
 * Aquí estaba uno de los fallos más visibles: se preguntaba por bomba de calor
 * y batería HV a coches de gasolina, y por distribución a eléctricos. Cada
 * bloque se activa solo si el componente existe en ese vehículo.
 */
function powertrainQuestions(identity: VehicleIdentity, vehicle: Vehicle): Candidate[] {
  const items: Candidate[] = [];
  const powertrain = identity.canonical.powertrain.value;
  const age = Math.max(0, currentYear() - vehicle.year);

  if (hasCombustionEngine(powertrain)) {
    items.push({
      id: "timing",
      question: "¿Cuándo se cambió la distribución (correa o cadena) y con qué kilometraje?",
      reason:
        "Es la intervención cara más habitual en un motor térmico y su rotura suele significar motor nuevo.",
      priority: "high",
      category: "mecanica",
      evidenceLevel: "D",
      weight: 90,
    });
  }

  if (powertrain === "ice" && vehicle.fuel === "diesel") {
    items.push({
      id: "dpf",
      question: "¿El coche ha hecho sobre todo ciudad o carretera? ¿Ha dado avisos de FAP, EGR o AdBlue?",
      reason:
        "Un diésel de uso urbano acumula regeneraciones incompletas; el FAP y la EGR son reparaciones de cuatro cifras.",
      priority: "high",
      category: "mecanica",
      evidenceLevel: "D",
      weight: 86,
    });
  }

  if (hasHighVoltageBattery(powertrain)) {
    items.push({
      id: "battery-soh",
      question: "¿Hay informe de salud de la batería (SOH) y sigue vigente la garantía del fabricante?",
      reason:
        "La batería es el componente más caro del coche. El SOH y los años de garantía restantes cambian por completo lo que vale.",
      priority: "high",
      category: "electrificacion",
      evidenceLevel: "D",
      weight: 94,
    });
  }

  if (isPluggable(powertrain)) {
    items.push({
      id: "charging",
      question: "¿Qué autonomía real hace en invierno y a qué potencia carga en corriente continua?",
      reason:
        "La autonomía homologada y la real se separan mucho en frío. La curva de carga condiciona los viajes largos.",
      priority: "medium",
      category: "electrificacion",
      evidenceLevel: "D",
      weight: 72,
    });
    items.push({
      id: "brake-corrosion",
      question: "¿Los discos de freno tienen óxido o se han rectificado alguna vez?",
      reason:
        "Con frenada regenerativa las pastillas casi no se gastan, pero los discos se oxidan por falta de uso.",
      priority: "low",
      category: "mecanica",
      evidenceLevel: "D",
      weight: 44,
    });
  }

  if (vehicle.transmission === "automatic" || vehicle.transmission === "semi_automatic") {
    if (hasCombustionEngine(powertrain)) {
      items.push({
        id: "gearbox-service",
        question: "¿Se ha hecho el cambio de aceite y filtro de la caja automática?",
        reason:
          "Muchos fabricantes la declaran 'de por vida' y no lo es. Una caja sin servicio a partir de 100.000 km es un riesgo caro.",
        priority: "medium",
        category: "mecanica",
        evidenceLevel: "D",
        weight: 74,
      });
    }
  }

  if (identity.canonical.drive.value === "awd") {
    items.push({
      id: "awd-service",
      question: "¿Se ha cambiado el aceite del acoplamiento/transferencia y los cuatro neumáticos son iguales?",
      reason:
        "En tracción total, mezclar neumáticos con desgaste distinto o saltarse el aceite del acoplamiento arruina el sistema.",
      priority: "medium",
      category: "mecanica",
      evidenceLevel: "D",
      weight: 68,
    });
  }

  if (age >= 18) {
    items.push({
      id: "corrosion",
      question: "¿Puedes enviarme fotos de los bajos y estribos? ¿Qué trabajos de óxido se han hecho?",
      reason: "En un coche de esta edad el estado del chasis pesa más que el motor y la reparación no compensa.",
      priority: "high",
      category: "carroceria",
      evidenceLevel: "D",
      weight: 84,
    });
  }

  if (identity.canonical.bodyClass.value === "lcv") {
    items.push({
      id: "fleet-use",
      question: "¿Fue vehículo de reparto o flota? ¿Qué carga llevaba habitualmente?",
      reason:
        "Las comerciales ex-flota acumulan sobrecarga, embrague y eje trasero castigados y regeneraciones forzadas.",
      priority: "high",
      category: "uso",
      evidenceLevel: "D",
      weight: 82,
    });
  }

  return items;
}

/** Preguntas nacidas de hallazgos documentados de nivel A o B. */
function knowledgeQuestions(knowledge: TechnicalKnowledge): Candidate[] {
  const items: Candidate[] = [];
  const findings = [...knowledge.modelSpecific, ...knowledge.platformShared];

  for (const finding of findings) {
    const isModelSpecific = finding.evidence.level === "A";
    items.push({
      id: `finding-${finding.id}`,
      question: `Sobre ${finding.title.toLowerCase()}: ¿se ha revisado o reparado en este coche? ¿Hay factura?`,
      reason: isModelSpecific
        ? `Es un patrón documentado de este modelo y motorización. ${finding.appliesWhen}`
        : `Es un patrón de la marca o de mecánica compartida, no confirmado en esta versión. ${finding.appliesWhen}`,
      priority: finding.severity === "high" ? "high" : isModelSpecific ? "medium" : "low",
      category: "mecanica",
      evidenceLevel: finding.evidence.level,
      source: finding.evidence.source,
      weight:
        (finding.severity === "high" ? 96 : finding.severity === "medium" ? 76 : 56) +
        (isModelSpecific ? 4 : 0),
    });
  }

  return items;
}

/** Dos preguntas parecidas no aportan: se descartan por solape de tokens. */
function isDuplicate(candidate: Candidate, accepted: Candidate[]): boolean {
  const normalize = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 3),
    );

  const tokens = normalize(candidate.question);
  if (tokens.size === 0) return false;

  return accepted.some((item) => {
    const other = normalize(item.question);
    let shared = 0;
    for (const token of tokens) if (other.has(token)) shared += 1;
    return shared / Math.min(tokens.size, other.size) >= 0.6;
  });
}

/**
 * Ranking de preguntas al vendedor (FASE 12).
 *
 * Devuelve como mucho 8 preguntas, ordenadas por prioridad real, sin duplicados
 * y sin preguntas imposibles para el tren motriz del coche.
 */
export function buildSellerQuestions(
  identity: VehicleIdentity,
  vehicle: Vehicle,
  knowledge: TechnicalKnowledge,
): SellerQuestion[] {
  if (!identity.safeForTechnicalKnowledge) {
    return [
      {
        id: "fix-identity",
        question: "¿Puedes confirmarme la versión exacta, el motor y el combustible tal y como figuran en la ficha técnica?",
        reason:
          "Los datos que has introducido se contradicen entre sí. Hasta aclararlos, cualquier otra pregunta iría dirigida a un coche que no existe.",
        priority: "high",
        category: "documentacion",
        evidenceLevel: "D",
      },
    ];
  }

  const candidates = [
    ...knowledgeQuestions(knowledge),
    ...baseQuestions(vehicle),
    ...powertrainQuestions(identity, vehicle),
  ];

  candidates.sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return b.weight - a.weight;
  });

  const accepted: Candidate[] = [];
  for (const candidate of candidates) {
    if (accepted.length >= MAX_QUESTIONS) break;
    if (accepted.some((item) => item.id === candidate.id)) continue;
    if (isDuplicate(candidate, accepted)) continue;
    accepted.push(candidate);
  }

  return accepted.map(({ weight: _weight, ...question }) => question);
}
