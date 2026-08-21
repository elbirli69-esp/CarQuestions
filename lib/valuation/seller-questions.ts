import type { KnownIssue, SellerQuestion } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

export function buildSellerQuestions(vehicle: Vehicle, issues: KnownIssue[]): SellerQuestion[] {
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
      question: vehicle.fuel === "electric" || vehicle.fuel === "hybrid" || vehicle.fuel === "plugin_hybrid"
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

  if (!vehicle.itv) {
    questions.push({
      question: "¿Hasta cuándo tiene la ITV en vigor y ha pasado alguna con deficiencias?",
      why: "La ITV no garantiza el estado mecánico, pero un rechazo reciente es una señal.",
    });
  }

  for (const issue of issues.slice(0, 3)) {
    questions.push({
      question: `Respecto a ${issue.title.toLowerCase()}, ¿se ha revisado o reparado en este coche?`,
      why: issue.detail,
      relatedIssue: issue.title,
    });
  }

  return questions.slice(0, 8);
}
