import type {
  InspectionChecklist,
  InspectionItem,
  InspectionStage,
  InspectionStageGroup,
} from "@/types/analysis";
import type { VehicleIdentity } from "@/types/identity";
import type { TechnicalKnowledge } from "@/types/technical";
import type { Vehicle } from "@/types/vehicle";
import { currentYear } from "@/lib/utils/format";
import {
  hasCombustionEngine,
  hasHighVoltageBattery,
  isPluggable,
} from "@/lib/vehicles/identity/taxonomy";

const STAGE_META: Record<InspectionStage, { label: string; description: string }> = {
  before_visit: {
    label: "Antes de ir",
    description: "Lo que puedes resolver desde casa y te ahorra el viaje si algo no cuadra.",
  },
  cold: {
    label: "Con el motor frío",
    description: "Pide que no lo arranque antes de que llegues: en frío se oye lo que en caliente se disimula.",
  },
  test_drive: {
    label: "Durante la prueba",
    description: "Al menos 20 minutos, con tramo de ciudad y de vía rápida.",
  },
  hot: {
    label: "Con el motor caliente",
    description: "Justo al terminar la prueba, con el coche parado y el capó abierto.",
  },
  before_paying: {
    label: "Antes de pagar",
    description: "Nada de esto es opcional, por muy bien que haya ido la prueba.",
  },
};

const STAGE_ORDER: InspectionStage[] = [
  "before_visit",
  "cold",
  "test_drive",
  "hot",
  "before_paying",
];

type Draft = InspectionItem & { stage: InspectionStage };

function beforeVisit(vehicle: Vehicle): Draft[] {
  return [
    {
      stage: "before_visit",
      id: "vin",
      text: "Pide el VIN y saca el informe de la DGT.",
      why: "Confirma titularidad, cargas, embargos, bajas y el kilometraje registrado en cada ITV.",
      critical: true,
      evidenceLevel: "D",
    },
    {
      stage: "before_visit",
      id: "docs",
      text: "Comprueba que ficha técnica y permiso de circulación coinciden con el anuncio.",
      why: "Una discrepancia en versión, potencia o fecha de matriculación cambia el precio y a veces el seguro.",
      critical: true,
      evidenceLevel: "D",
    },
    {
      stage: "before_visit",
      id: "service-history",
      text: "Pide fotos del libro de mantenimiento o de las facturas.",
      why: "Es la forma más barata de descartar un coche antes de gastar el desplazamiento.",
      critical: false,
      evidenceLevel: "D",
    },
    {
      stage: "before_visit",
      id: "itv-history",
      text: vehicle.itv
        ? "Contrasta la fecha de ITV que te han dado con el informe."
        : "Pregunta la fecha de la próxima ITV y si alguna salió desfavorable.",
      why: "Una ITV a punto de caducar en un coche con defectos conocidos es coste inmediato.",
      critical: false,
      evidenceLevel: "D",
    },
  ];
}

function coldStage(identity: VehicleIdentity): Draft[] {
  const powertrain = identity.canonical.powertrain.value;
  const items: Draft[] = [
    {
      stage: "cold",
      id: "dash-lights",
      text: "Con el contacto dado y sin arrancar, comprueba que se encienden todos los testigos y luego se apagan.",
      why: "Un testigo que no llega a encenderse suele significar bombilla quitada para ocultar una avería.",
      critical: true,
      evidenceLevel: "D",
    },
  ];

  if (hasCombustionEngine(powertrain)) {
    items.push(
      {
        stage: "cold",
        id: "cold-start",
        text: "Arranca en frío y escucha los primeros 30 segundos.",
        why: "Traqueteos metálicos, taqués o humo azul al arranque son los síntomas que mejor delatan desgaste interno.",
        critical: true,
        evidenceLevel: "D",
      },
      {
        stage: "cold",
        id: "cold-smoke",
        text: "Mira el escape al arrancar: humo blanco denso, azul o negro.",
        why: "Blanco puede ser refrigerante, azul aceite y negro exceso de combustible. Los tres son caros.",
        critical: true,
        evidenceLevel: "D",
      },
      {
        stage: "cold",
        id: "idle",
        text: "Deja el motor al ralentí un par de minutos y observa si oscila o vibra.",
        why: "Un ralentí inestable en frío apunta a inyección, admisión o soportes de motor.",
        critical: false,
        evidenceLevel: "D",
      },
      {
        stage: "cold",
        id: "fluids",
        text: "Revisa nivel y aspecto del aceite y del refrigerante antes de arrancar.",
        why: "Aceite lechoso o refrigerante con posos son señales de junta de culata.",
        critical: true,
        evidenceLevel: "D",
      },
    );
  }

  if (hasHighVoltageBattery(powertrain)) {
    items.push({
      stage: "cold",
      id: "soc-start",
      text: "Anota el porcentaje de batería y la autonomía estimada antes de salir.",
      why: "Comparar consumo real contra autonomía prometida durante la prueba es la única medida honesta que puedes hacer tú.",
      critical: true,
      evidenceLevel: "D",
    });
  }

  return items;
}

function testDrive(identity: VehicleIdentity): Draft[] {
  const powertrain = identity.canonical.powertrain.value;
  const items: Draft[] = [
    {
      stage: "test_drive",
      id: "brakes",
      text: "Frena fuerte en un sitio seguro: no debe tirar hacia un lado ni vibrar el pedal.",
      why: "Vibración es disco alabeado; tirón lateral es pinza agarrotada o suspensión.",
      critical: true,
      evidenceLevel: "D",
    },
    {
      stage: "test_drive",
      id: "steering",
      text: "Suelta suavemente el volante en recta y comprueba que no se va.",
      why: "Delata alineación mal hecha o geometría tocada por un golpe.",
      critical: false,
      evidenceLevel: "D",
    },
    {
      stage: "test_drive",
      id: "suspension",
      text: "Pasa por badenes y escucha golpeteos secos.",
      why: "Amortiguadores y silentblocks son baratos por separado y caros todos juntos.",
      critical: false,
      evidenceLevel: "D",
    },
    {
      stage: "test_drive",
      id: "electronics",
      text: "Prueba climatizador, elevalunas, cámaras, sensores y pantalla.",
      why: "La electrónica de confort es de lo más caro de reparar y lo primero que el vendedor da por normal.",
      critical: false,
      evidenceLevel: "D",
    },
  ];

  if (hasCombustionEngine(powertrain)) {
    items.push(
      {
        stage: "test_drive",
        id: "gearbox",
        text: "Comprueba los cambios en subida y en retención, y que no patine al acelerar a fondo.",
        why: "Tirones o revoluciones que suben sin empujar indican embrague o convertidor gastados.",
        critical: true,
        evidenceLevel: "D",
      },
      {
        stage: "test_drive",
        id: "temperature",
        text: "Vigila que la temperatura de motor se estabilice y no suba en atascos.",
        why: "El sobrecalentamiento en parado suele ser electroventilador o termostato.",
        critical: true,
        evidenceLevel: "D",
      },
    );
  }

  if (powertrain === "ice" || powertrain === "phev" || powertrain === "hybrid") {
    items.push({
      stage: "test_drive",
      id: "highway",
      text: "Haz al menos 10 minutos de vía rápida a régimen sostenido.",
      why: "Es la única forma de que un FAP regenere y de que aparezcan fallos que en ciudad no salen.",
      critical: false,
      evidenceLevel: "D",
    });
  }

  if (hasHighVoltageBattery(powertrain)) {
    items.push({
      stage: "test_drive",
      id: "regen",
      text: "Prueba la frenada regenerativa y comprueba que no aparecen avisos de potencia limitada.",
      why: "Un aviso de potencia reducida en aceleración fuerte apunta a batería o refrigeración del sistema.",
      critical: true,
      evidenceLevel: "D",
    });
  }

  return items;
}

function hotStage(identity: VehicleIdentity): Draft[] {
  const powertrain = identity.canonical.powertrain.value;
  const items: Draft[] = [];

  if (hasCombustionEngine(powertrain)) {
    items.push(
      {
        stage: "hot",
        id: "hot-restart",
        text: "Apaga y vuelve a arrancar en caliente.",
        why: "Un arranque perezoso en caliente delata bomba de alta presión, inyectores o batería al límite.",
        critical: true,
        evidenceLevel: "D",
      },
      {
        stage: "hot",
        id: "leaks",
        text: "Con el capó abierto, busca goteos y manchas frescas en el bloque y bajo el coche.",
        why: "Muchas fugas solo se manifiestan con el motor caliente y a presión.",
        critical: true,
        evidenceLevel: "D",
      },
      {
        stage: "hot",
        id: "fans",
        text: "Espera a que salten los ventiladores y comprueba que la temperatura baja.",
        why: "Si no saltan o la aguja sigue subiendo, hay problema de refrigeración.",
        critical: true,
        evidenceLevel: "D",
      },
    );
  } else {
    items.push({
      stage: "hot",
      id: "thermal",
      text: "Al terminar, escucha el circuito térmico y el compresor con el coche parado.",
      why: "En eléctricos, la gestión térmica (bomba de calor, válvulas, compresor) es de las reparaciones más caras.",
      critical: true,
      evidenceLevel: "D",
    });
  }

  if (isPluggable(powertrain)) {
    items.push({
      stage: "hot",
      id: "charge-test",
      text: "Si puedes, enchúfalo aunque sea unos minutos en un poste público.",
      why: "Comprobar que acepta carga y a qué potencia descarta fallos del cargador de a bordo.",
      critical: false,
      evidenceLevel: "D",
    });
  }

  return items;
}

function beforePaying(): Draft[] {
  return [
    {
      stage: "before_paying",
      id: "vin-match",
      text: "Contrasta el VIN grabado en el coche con el de la documentación.",
      why: "Si no coinciden, no sigas adelante bajo ningún concepto.",
      critical: true,
      evidenceLevel: "D",
    },
    {
      stage: "before_paying",
      id: "encumbrance",
      text: "Confirma que no hay reserva de dominio, financiación pendiente ni embargos.",
      why: "Una carga viaja con el coche, no con el vendedor: la heredarías tú.",
      critical: true,
      evidenceLevel: "D",
    },
    {
      stage: "before_paying",
      id: "contract",
      text: "Firma contrato de compraventa con kilometraje, estado declarado y fecha.",
      why: "Es tu única prueba si luego aparece un vicio oculto o el kilometraje no era el que decía.",
      critical: true,
      evidenceLevel: "D",
    },
    {
      stage: "before_paying",
      id: "warranty",
      text: "Aclara por escrito la garantía: legal si es profesional, y qué cubre exactamente.",
      why: "La venta entre particulares no lleva garantía comercial; la de un profesional sí y por ley.",
      critical: false,
      evidenceLevel: "D",
    },
    {
      stage: "before_paying",
      id: "pre-purchase",
      text: "Si el coche te convence, págale una inspección precompra a un taller independiente.",
      why: "Cuesta bastante menos que la primera avería que evita y es el mejor argumento de negociación.",
      critical: false,
      evidenceLevel: "D",
    },
  ];
}

/** Comprobaciones nacidas de hallazgos documentados de nivel A o B. */
function knowledgeItems(knowledge: TechnicalKnowledge): Draft[] {
  const findings = [...knowledge.modelSpecific, ...knowledge.platformShared];
  return findings.slice(0, 4).map((finding, index) => ({
    stage: finding.severity === "high" ? "cold" : "test_drive",
    id: `finding-${finding.id}-${index}`,
    text: `Comprueba específicamente: ${finding.title}.`,
    why:
      finding.evidence.level === "A"
        ? `Patrón documentado de este modelo y motor. ${finding.symptoms.length > 0 ? `Síntomas: ${finding.symptoms.slice(0, 3).join("; ")}.` : ""} Fuente: ${finding.evidence.source}.`
        : `Patrón de la marca o de mecánica compartida, no confirmado en esta versión. Fuente: ${finding.evidence.source}.`,
    critical: finding.severity === "high",
    evidenceLevel: finding.evidence.level,
  }));
}

/**
 * Checklist de inspección por fases (FASE 13), adaptada al tren motriz,
 * la edad y los hallazgos documentados del vehículo.
 */
export function buildInspectionChecklist(
  identity: VehicleIdentity,
  vehicle: Vehicle,
  knowledge: TechnicalKnowledge,
): InspectionChecklist {
  if (!identity.safeForTechnicalKnowledge) {
    return {
      stages: [
        {
          stage: "before_visit",
          ...STAGE_META.before_visit,
          items: [
            {
              id: "resolve-identity",
              text: "Pide la ficha técnica y confirma versión, motor y combustible reales.",
              why: "Los datos actuales se contradicen. Una checklist adaptada a un coche equivocado sería peor que ninguna.",
              critical: true,
              evidenceLevel: "D",
            },
          ],
        },
      ],
      note: "Cuando los datos del vehículo sean coherentes generaremos la checklist completa por fases.",
    };
  }

  const age = Math.max(0, currentYear() - vehicle.year);
  const drafts = [
    ...beforeVisit(vehicle),
    ...coldStage(identity),
    ...testDrive(identity),
    ...hotStage(identity),
    ...beforePaying(),
    ...knowledgeItems(knowledge),
  ];

  if (age >= 15) {
    drafts.push({
      stage: "before_visit",
      id: "rust",
      text: "Pide fotos de bajos, pasos de rueda y estribos antes de desplazarte.",
      why: "En un coche de esta edad el óxido estructural es lo que decide si merece la pena, no el motor.",
      critical: true,
      evidenceLevel: "D",
    });
  }

  const stages: InspectionStageGroup[] = STAGE_ORDER.map((stage) => ({
    stage,
    ...STAGE_META[stage],
    items: drafts
      .filter((item) => item.stage === stage)
      .sort((a, b) => Number(b.critical) - Number(a.critical))
      .map(({ stage: _stage, ...item }) => item),
  })).filter((group) => group.items.length > 0);

  return {
    stages,
    note: "La checklist se adapta al tren motriz y a la edad del coche. Los puntos marcados como críticos son los que no deberías saltarte.",
  };
}
