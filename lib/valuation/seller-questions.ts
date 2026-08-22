import type { KnowledgeChunk } from "@/types/knowledge";
import type { KnownIssue, SellerQuestion } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

export function buildSellerQuestions(
  vehicle: Vehicle,
  issues: KnownIssue[],
  knowledgeChunks: KnowledgeChunk[] = [],
): SellerQuestion[] {
  const questions: SellerQuestion[] = [
    {
      question: "¿Tiene historial completo de mantenimiento y facturas?",
      why: "Sin papeles es difícil saber si los intervalos se han respetado.",
    },
    {
      question: "¿Cuántos propietarios ha tenido el vehículo?",
      why: "Afecta a la trazabilidad y, en algunos casos, al precio.",
    },
    {
      question: "¿Ha tenido accidentes, golpes estructurales o reparaciones de chapa?",
      why: "Un siniestro no siempre se ve en fotos. Hay que preguntarlo por escrito.",
    },
    {
      question:
        vehicle.fuel === "electric" || vehicle.fuel === "hybrid" || vehicle.fuel === "plugin_hybrid"
          ? "¿Cuál es el estado de la batería y hay informe de salud?"
          : "¿Cuándo se cambió la distribución (correa o cadena) y con qué kilometraje?",
      why: "Es una de las intervenciones caras más habituales según el tipo de motor.",
    },
  ];

  if (vehicle.transmission === "automatic") {
    questions.push({
      question: "¿Se ha realizado el mantenimiento de la caja automática (aceite y filtro)?",
      why: "Muchas cajas automáticas no son 'para toda la vida'. Sin mantenimiento el riesgo sube.",
    });
  }

  if (vehicle.fuel === "diesel") {
    questions.push({
      question: "¿El coche ha hecho sobre todo ciudad o carretera? ¿El FAP y la EGR tienen avisos?",
      why: "Los diésel urbanos acumulan más problemas de antipolución.",
    });
  }

  if (vehicle.fuel === "electric" || vehicle.fuel === "plugin_hybrid") {
    questions.push({
      question: "¿Lleva bomba de calor (heat pump) y preacondiciona la batería antes de cargar rápido?",
      why: "Sin heat pump y sin preconditioning, la autonomía invierno y la curva DC suelen ser peores de lo anunciado.",
    });
    questions.push({
      question: "¿Cómo se sienten los frenos en una frenada fuerte? ¿Hay óxido en discos o avisos de EPB/brake-by-wire?",
      why: "El regenerativo reduce desgaste de pastillas pero los discos oxidan y los sistemas brake-by-wire/EPB fallan si se ignoran.",
    });
  }

  if (vehicle.year > 0 && vehicle.year <= 2005) {
    questions.push({
      question: "¿Hay fotos de bajos/estribos y qué trabajos de óxido o chapa estructural se hicieron?",
      why: "En youngtimers el chasis manda: un cosmético bonito con óxido estructural sale caro.",
    });
  }

  if (/4x4|awd|4wd|quattro|xdrive|4motion|4matic|allgrip|haldex|traction/i.test(`${vehicle.model}`)) {
    questions.push({
      question: "¿Se ha hecho el servicio de Haldex/transferencia/diferenciales y los neumáticos son del mismo tamaño/desgaste?",
      why: "Los AWD fallan caro si se omite el aceite del acoplamiento o si las ruedas tienen radios distintos.",
    });
  }

  const looksCommercial =
    /transit|sprinter|crafter|ducato|boxer|jumper|master|trafic|vivaro|daily|movano|custom|vito/i.test(
      `${vehicle.model} ${vehicle.brand}`,
    );
  if (looksCommercial) {
    questions.push({
      question: "¿Fue de flota/reparto? ¿Qué peso cargaba habitualmente y hay historial de FAP/AdBlue?",
      why: "Las furgonetas ex-flota acumulan sobrecarga, regeneraciones forzadas y desgaste de embrague/eje trasero.",
    });
  }

  if (!vehicle.itv) {
    questions.push({
      question: "¿Hasta cuándo tiene la ITV en vigor y ha pasado alguna con deficiencias?",
      why: "La ITV no garantiza el estado mecánico, pero un rechazo reciente es una señal.",
    });
  }

  const seen = new Set(questions.map((item) => item.question.toLowerCase()));

  for (const chunk of knowledgeChunks) {
    for (const ask of chunk.askSeller ?? []) {
      const key = ask.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push({
        question: ask,
        why: `${chunk.title}. Fuente: ${chunk.source}`,
        relatedIssue: chunk.title,
      });
    }
  }

  for (const issue of issues.slice(0, 3)) {
    const question = `Respecto a ${issue.title.toLowerCase()}, ¿se ha revisado o reparado en este coche?`;
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({
      question,
      why: issue.detail,
      relatedIssue: issue.title,
    });
  }

  return questions.slice(0, 12);
}
