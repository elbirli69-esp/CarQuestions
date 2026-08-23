import type { FuelType, Vehicle } from "@/types/vehicle";

export type ChecklistPhase =
  | "antes_de_ir"
  | "en_frio"
  | "prueba"
  | "en_caliente"
  | "antes_de_pagar";

export interface ChecklistItem {
  phase: ChecklistPhase;
  item: string;
  reason: string;
  fuelSpecific?: boolean;
}

export interface InspectionChecklist {
  phases: Array<{
    id: ChecklistPhase;
    title: string;
    items: ChecklistItem[];
  }>;
}

const PHASE_TITLES: Record<ChecklistPhase, string> = {
  antes_de_ir: "Antes de ir",
  en_frio: "En frío",
  prueba: "Durante la prueba",
  en_caliente: "En caliente",
  antes_de_pagar: "Antes de pagar",
};

function isElectrified(fuel: FuelType): boolean {
  return fuel === "electric" || fuel === "plugin_hybrid" || fuel === "hybrid";
}

function isEvOrPhev(fuel: FuelType): boolean {
  return fuel === "electric" || fuel === "plugin_hybrid";
}

export function buildInspectionChecklist(vehicle: Vehicle): InspectionChecklist {
  const items: ChecklistItem[] = [
    {
      phase: "antes_de_ir",
      item: "Pedir VIN / bastidor y contrastarlo con la documentación",
      reason: "Evita coches clonados o con identidad distinta a la del anuncio.",
    },
    {
      phase: "antes_de_ir",
      item: "Pedir historial de mantenimiento e ITV",
      reason: "Sin papeles no hay trazabilidad fiable.",
    },
    {
      phase: "antes_de_ir",
      item: "Preguntar por accidentes, cargas y reserva de dominio",
      reason: "Un coche embargado o siniestrado cambia la compra.",
    },
    {
      phase: "en_frio",
      item: "Arranque en frío: ruidos, humo y testigos",
      reason: "Muchos fallos solo aparecen al arrancar en frío.",
    },
    {
      phase: "en_frio",
      item: "Ralentí estable sin vibraciones extrañas",
      reason: "Inestabilidad puede indicar inyección, soportes o sensores.",
    },
    {
      phase: "prueba",
      item: "Cambio de marchas / transmisiones suaves",
      reason: "Tirones o patinaje son caros de reparar.",
    },
    {
      phase: "prueba",
      item: "Frenos, dirección y suspensión en baches",
      reason: "Detecta holguras, ruidos y fatiga de tren delantero.",
    },
    {
      phase: "prueba",
      item: "Vibraciones a distinta velocidad",
      reason: "Pueden delatar equilibrado, cardanes o neumáticos.",
    },
    {
      phase: "en_caliente",
      item: "Temperatura estable y ventiladores normales",
      reason: "Sobrecalentamiento o termostato defectuoso son críticos.",
    },
    {
      phase: "en_caliente",
      item: "Buscar fugas bajo el coche tras la prueba",
      reason: "Aceite, refrigerante o transmisión dejan rastro en caliente.",
    },
    {
      phase: "antes_de_pagar",
      item: "Contrastar VIN de chasis, luna y documentación",
      reason: "Deben coincidir al 100 %.",
    },
    {
      phase: "antes_de_pagar",
      item: "Contrato, garantía y forma de pago claras",
      reason: "Evita ambigüedades legales después de la entrega.",
    },
  ];

  if (vehicle.fuel === "diesel") {
    items.push(
      {
        phase: "antes_de_ir",
        item: "Preguntar uso ciudad vs carretera y regeneraciones FAP",
        reason: "Diésel urbano acumula problemas de antipolución.",
        fuelSpecific: true,
      },
      {
        phase: "en_caliente",
        item: "Comprobar humo excesivo y ruidos de turbo",
        reason: "Turbo y EGR/FAP son puntos caros en diésel.",
        fuelSpecific: true,
      },
    );
  }

  if (vehicle.fuel === "petrol" || vehicle.fuel === "hybrid") {
    items.push({
      phase: "antes_de_ir",
      item: "Preguntar por distribución (correa/cadena) y última intervención",
      reason: "Rotura de distribución puede destruir el motor.",
      fuelSpecific: true,
    });
  }

  if (isEvOrPhev(vehicle.fuel)) {
    items.push(
      {
        phase: "antes_de_ir",
        item: "Pedir informe de salud de batería (SOH) si existe",
        reason: "La batería HV es el componente más caro del coche.",
        fuelSpecific: true,
      },
      {
        phase: "prueba",
        item: "Probar carga (AC/DC si es posible) y regeneración",
        reason: "Fallos de carga o regeneración invalidan la compra eléctrica.",
        fuelSpecific: true,
      },
      {
        phase: "en_caliente",
        item: "Comprobar refrigeración de batería / ruidos de bomba",
        reason: "Sistemas térmicos defectuosos degradan autonomía y potencia.",
        fuelSpecific: true,
      },
    );
  }

  if (isElectrified(vehicle.fuel) && vehicle.fuel === "hybrid") {
    items.push({
      phase: "prueba",
      item: "Transiciones motor térmico ↔ eléctrico sin tirones",
      reason: "El sistema híbrido debe acoplar con suavidad.",
      fuelSpecific: true,
    });
  }

  if (vehicle.transmission === "automatic") {
    items.push({
      phase: "prueba",
      item: "Cambios automáticos sin patinaje ni golpes",
      reason: "Reparar una automática suele ser muy caro.",
      fuelSpecific: false,
    });
  }

  if (vehicle.year <= 2008) {
    items.push({
      phase: "antes_de_ir",
      item: "Pedir fotos de bajos y preguntar por óxido estructural",
      reason: "En coches antiguos el chasis manda sobre la estética.",
    });
  }

  const byPhase = (Object.keys(PHASE_TITLES) as ChecklistPhase[]).map((id) => ({
    id,
    title: PHASE_TITLES[id],
    items: items.filter((item) => item.phase === id),
  }));

  return { phases: byPhase.filter((p) => p.items.length > 0) };
}
