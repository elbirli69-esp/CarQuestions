/**
 * Genera packs de conocimiento técnico curado (foros, manuales, recalls públicos, patrones ADAC/TÜV).
 * No scrapea: sintetiza patrones públicos conocidos en chunks atómicos problema→solución.
 *
 * Uso: npx tsx scripts/generate-knowledge-packs.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { KnowledgeChunk } from "../types/knowledge";

type Draft = Omit<KnowledgeChunk, "isDemo"> & { isDemo?: boolean };

const ALL = ["*"];
const VAG = ["volkswagen", "vw", "seat", "skoda", "audi", "cupra"];
const PSA = ["peugeot", "citroen", "citroën", "ds", "opel", "vauxhall"];
const BMW = ["bmw", "mini"];
const MERC = ["mercedes", "mercedes-benz", "mercedes benz"];
const TOYOTA = ["toyota", "lexus"];
const HYUNDAI = ["hyundai", "kia"];
const RENAULT = ["renault", "dacia"];
const FORD = ["ford"];
const STELLANTIS_IT = ["fiat", "abarth", "alfa romeo", "jeep"];

function chunk(draft: Draft): KnowledgeChunk {
  return { isDemo: true, ...draft };
}

function pack(id: string, title: string, chunks: KnowledgeChunk[]) {
  return {
    version: 1,
    id,
    title,
    updatedAt: new Date().toISOString(),
    methodology:
      "Resúmenes curados a partir de patrones recurrentes en foros técnicos (BMWFAQ, VAG/Cupra, ClubToyota, PureTech/BlueHDi communities), manuales de mantenimiento, recalls públicos (Safety Gate/NHTSA) e informes de fiabilidad (ADAC/TÜV). No son diagnósticos de un bastidor concreto.",
    chunks,
  };
}

const symptomPlaybooks: KnowledgeChunk[] = [
  chunk({
    id: "playbook-cold-rattle-timing",
    type: "issue",
    brands: ALL,
    title: "Traqueteo metálico al arrancar en frío → distribución",
    content:
      "Un traqueteo metálico de 2-5 segundos al arrancar en frío suele apuntar a cadena/tensores/guías o, en correa húmeda, a holgura anómala. Causa: desgaste por intervalos de aceite largos o aceite incorrecto. Solución típica: diagnóstico de sincronización (desfase árboles), inspección de tensores y, si procede, kit completo de distribución. No confundir con inyector o turbo.",
    severity: "high",
    appliesWhen: "Ruido metálico breve solo en frío",
    source: "Patrón transversal foros técnicos + guías de taller independientes",
    tags: ["ruido", "cadena", "correa", "distribucion", "frio", "sintoma"],
    symptoms: [
      "Traqueteo 2-5 s al arrancar en frío que desaparece al calentar",
      "Códigos de desfase de árboles de levas",
      "Pérdida de potencia si el desfase avanza",
    ],
    askSeller: [
      "¿Se ha cambiado cadena/correa/tensores? ¿Factura y km?",
      "¿Hay ruido metálico en frío que desaparezca en caliente?",
    ],
    inspectSteps: [
      "Arranque en frío con capó abierto",
      "Lectura OBD de sincronización de levas",
      "Revisar historial de aceite (intervalo y viscosidad)",
    ],
    estimatedCostEur: { min: 600, max: 2800 },
    typicalKmFrom: 100000,
    typicalKmTo: 220000,
  }),
  chunk({
    id: "playbook-dpf-clog-urban",
    type: "issue",
    brands: ALL,
    fuels: ["diesel"],
    yearFrom: 2009,
    yearTo: 2025,
    title: "Aviso FAP/DPF y pérdida de potencia en uso urbano",
    content:
      "En diésel Euro 5/6 con trayectos cortos, el FAP no regenera bien y se colmata. Síntomas: aviso DPF, modo degradado, consumo alto, olor a azufre. Causas: ciudad exclusiva, EGR sucia, sensores de presión defectuosos. Soluciones: regeneración forzada documentada, limpieza profesional, o sustitución si está dañado; nunca aceptar FAP vaciado/reprogramado (ITV/emisiones).",
    severity: "medium",
    appliesWhen: "Diésel urbano o con regeneraciones fallidas",
    source: "Patrones recurrentes foros diésel + checklists precompra Euro 5/6",
    tags: ["fap", "dpf", "urbano", "regeneracion", "sintoma"],
    symptoms: [
      "Testigo FAP/DPF o modo limp-home",
      "Consumo elevado y olor a azufre",
      "Regeneraciones frecuentes o interrumpidas",
    ],
    askSeller: [
      "¿Historial de regeneraciones forzadas o limpiezas de FAP?",
      "¿Uso principal ciudad o carretera?",
    ],
    inspectSteps: [
      "Leer presión diferencial del FAP en vivo",
      "Comprobar que no hay borrados de software antipolución",
      "Probar ruta de 20-30 min a régimen para ver regeneración",
    ],
    estimatedCostEur: { min: 250, max: 2200 },
    typicalKmFrom: 80000,
    typicalKmTo: 200000,
  }),
  chunk({
    id: "playbook-egr-carbon",
    type: "issue",
    brands: ALL,
    fuels: ["diesel", "petrol"],
    yearFrom: 2005,
    yearTo: 2024,
    title: "Tirones / ralentí irregular por EGR carbonizada",
    content:
      "La válvula EGR carbonizada provoca tirones, humo, ralentí inestable y códigos P0401-P0404. Causa: gases recirculados + trayectos cortos. Solución: limpieza ultrasónica o sustitución de EGR/cooler; revisar también admisión. En gasolina GDI el carbonizado de admisión es un problema paralelo (admite limpieza por nueces/química).",
    severity: "medium",
    source: "Diagnóstico habitual talleres + foros de mecánica diésel/GDI",
    tags: ["egr", "carbonilla", "tirones", "ralenti"],
    symptoms: ["Tirones a baja carga", "Ralentí irregular", "Códigos EGR / flujo insuficiente"],
    askSeller: ["¿Se ha limpiado o sustituido la EGR? ¿Factura?"],
    inspectSteps: ["Escáner: posición EGR y flujo", "Inspección visual cooler EGR si accesible"],
    estimatedCostEur: { min: 180, max: 900 },
  }),
  chunk({
    id: "playbook-dmf-vibration",
    type: "issue",
    brands: ALL,
    fuels: ["diesel", "petrol"],
    yearFrom: 2005,
    yearTo: 2022,
    title: "Vibración al ralentí / arranque en cuesta → volante bimasa",
    content:
      "Vibraciones al ralentí con A/C, resonancia al soltar el embrague o ruido de 'cascabel' al apagar suelen indicar DMF (volante bimasa) fatigado. Causa: km altos, ciudad, estilo agresivo. Solución: kit embrague+bimasa+rodamiento; evitar solo el disco. Coste alto; negociar precio si hay síntomas claros.",
    severity: "medium",
    source: "Patrón foros VAG/BMW/PSA y talleres de transmisión",
    tags: ["bimasa", "dmf", "embrague", "vibracion"],
    symptoms: [
      "Vibración al ralentí con marcha en punto muerto",
      "Ruido al apagar el motor",
      "Tirones en arrancadas",
    ],
    askSeller: ["¿Cuándo se cambió embrague/bimasa?", "¿Hay vibración al ralentí con A/C?"],
    inspectSteps: [
      "Prueba en cuesta y ralentí con A/C",
      "Inspección taller: holgura angular del DMF si procede",
    ],
    estimatedCostEur: { min: 700, max: 1600 },
    typicalKmFrom: 120000,
    typicalKmTo: 250000,
  }),
  chunk({
    id: "playbook-auto-gearbox-shudder",
    type: "issue",
    brands: ALL,
    title: "Tirones / patinaje en automático → aceite y mechatronic",
    content:
      "Tirones al subir marchas, patinaje o 'shudder' en caliente apuntan a aceite degradado, filtro obstruido o mechatronic/TC fallando. Muchas cajas 'sealed for life' no lo son. Solución: cambio de aceite+filtro con procedimiento correcto; si persiste, diagnosis de embragues/mechatronic. Pedir factura de servicio de caja.",
    severity: "high",
    source: "Buenas prácticas talleres de transmisión ZF/Aisin/Getrag + foros DSG/EAT",
    tags: ["automatico", "aceite", "mechatronic", "patinaje"],
    symptoms: ["Tirones al cambiar", "Patinaje en fuerte aceleración", "Códigos de transmisión"],
    askSeller: ["¿Cambio de aceite/filtro de caja? ¿Km y especificación?"],
    inspectSteps: [
      "Prueba en caliente con cambios 1-6",
      "Lectura de temperaturas y códigos de caja",
      "Comprobar color/olor del aceite si hay varilla/tapón",
    ],
    estimatedCostEur: { min: 250, max: 3500 },
    maintenanceInterval: "Servicio de caja habitual 60.000-100.000 km según fabricante",
  }),
  chunk({
    id: "playbook-coolant-loss-no-leak",
    type: "issue",
    brands: ALL,
    title: "Pérdida de refrigerante sin fuga visible",
    content:
      "Bajar refrigerante sin charco puede ser: fuga interna (junta de culata), radiador de calorímetro, bomba de agua por evaporación, o (en EcoBoost/algunos TSI) intrusion a cilindros. Síntomas: humo blanco, emulsión en aceite, burbujas en vaso. Solución: prueba de presión, análisis CO2 en circuito, endoscopia; no comprar sin diagnóstico.",
    severity: "high",
    source: "Protocolos de diagnosis refrigeración + casos EcoBoost/EA888 en foros",
    tags: ["refrigerante", "culata", "fuga", "sobrecalentamiento"],
    symptoms: [
      "Nivel de refrigerante que baja sin mancha",
      "Humo blanco al arrancar",
      "Mayonesa en tapón de aceite",
    ],
    askSeller: ["¿Ha perdido refrigerante? ¿Se ha abierto el motor?"],
    inspectSteps: [
      "Prueba de presión del circuito",
      "Test de combustión en vaso de expansión",
      "Inspección de aceite y bujías/endoscopio",
    ],
    estimatedCostEur: { min: 400, max: 4500 },
  }),
  chunk({
    id: "playbook-oil-consumption",
    type: "issue",
    brands: ALL,
    fuels: ["petrol", "diesel"],
    title: "Consumo de aceite elevado: causas y umbrales",
    content:
      "Consumo >0,5 l/1000 km en gasolina turbo moderna o diésel con muchos km merece investigación: segmentos, PCV/separador, turbo, guías de válvula o software. Soluciones van de actualización de software/PCV a rectificado. Pedir consumo documentado y facturas de relleno.",
    severity: "medium",
    source: "Umbrales habituales fabricantes + foros EA888/N20/PureTech",
    tags: ["aceite", "consumo", "pcv", "turbo"],
    symptoms: ["Bajada de nivel entre revisiones", "Humo azul en deceleración", "Olor a quemado"],
    askSeller: ["¿Cuántos litros añade entre revisiones?", "¿Hay campaña de consumo de aceite?"],
    inspectSteps: ["Comprobar nivel en frío/caliente", "Prueba de carretera y humos", "Códigos PCV/turbo"],
    estimatedCostEur: { min: 200, max: 3500 },
  }),
  chunk({
    id: "playbook-adblue-scr-faults",
    type: "issue",
    brands: ALL,
    fuels: ["diesel"],
    yearFrom: 2014,
    yearTo: 2025,
    title: "Fallos AdBlue/SCR: cristalización y limitadores",
    content:
      "Avisos AdBlue, calidad incorrecta o inminente no-arranque suelen deberse a cristalización en inyector SCR, bomba, depósito o sensor NOx. Soluciones: calidad AdBlue ISO 22241, limpieza/sustitución de componentes SCR, actualización software. Evitar aditivos milagro; comprobar que no hay emuladores.",
    severity: "medium",
    source: "Casuística BlueHDi/OM/BMW SCR + manuales urea",
    tags: ["adblue", "scr", "nox", "urea"],
    symptoms: ["Aviso AdBlue calidad/nivel", "Cuenta atrás de km hasta no arrancar", "Códigos NOx/SCR"],
    askSeller: ["¿Problemas de AdBlue? ¿Reparaciones SCR con factura?"],
    inspectSteps: ["Inspección de cristalización en líneas", "Lectura sensores NOx", "Verificar nivel y fecha AdBlue"],
    estimatedCostEur: { min: 150, max: 1800 },
  }),
  chunk({
    id: "playbook-turbo-whine-smoke",
    type: "issue",
    brands: ALL,
    fuels: ["diesel", "petrol"],
    title: "Silbido de turbo / humo azul-gris bajo carga",
    content:
      "Silbido creciente, pérdida de presión de soplado o humo bajo carga apuntan a turbo desgastado, wastegate/actuator o fugas en manguitos. Solución: medir boost, revisar holgura axial/radial, cambiar turbo con kit de aceite/tubos; nunca solo el cartucho sin limpiar el circuito.",
    severity: "high",
    source: "Diagnóstico turbo talleres + foros TDI/TFSI/dCi",
    tags: ["turbo", "humo", "boost", "wastegate"],
    symptoms: ["Silbido agudo al acelerar", "Humo bajo carga", "Falta de potencia en alto régimen"],
    askSeller: ["¿Se ha cambiado el turbo? ¿Por qué motivo?"],
    inspectSteps: ["Escuchar silbido en carga", "Inspección manguitos y aceite en intercooler", "Datos de boost OBD"],
    estimatedCostEur: { min: 600, max: 2200 },
  }),
  chunk({
    id: "playbook-hybrid-battery-soh",
    type: "issue",
    brands: ALL,
    fuels: ["hybrid", "plugin_hybrid", "electric"],
    title: "Pérdida de autonomía / SOH bajo en híbridos y EV",
    content:
      "Autonomía real muy por debajo de la homologada, ventiladores de batería ruidosos o códigos HV apuntan a degradación de módulo. Pedir informe SOH, historial de cargas rápidas (EV) y garantía restante. Soluciones: reacondicionado de módulos (híbridos Toyota/Honda) o pack completo; coste elevado en EV.",
    severity: "high",
    source: "Guías compraventa EV/híbrido + comunidades Prius/Leaf/Zoe/Tesla",
    tags: ["bateria", "soh", "hibrido", "ev", "autonomia"],
    symptoms: ["Autonomía muy baja", "Modo EV limitado", "Avisos sistema híbrido/HV"],
    askSeller: ["¿Informe SOH o capacidad restante?", "¿Garantía de batería vigente?"],
    inspectSteps: ["Lectura SOH con herramienta adecuada", "Prueba de autonomía en ruta mixta", "Inspección refrigeración de batería"],
    estimatedCostEur: { min: 800, max: 12000 },
  }),
  chunk({
    id: "playbook-ac-weak-cooling",
    type: "maintenance",
    brands: ALL,
    title: "Aire acondicionado flojo: gas, condensador, compresor",
    content:
      "Frío insuficiente suele ser carga de gas baja (fuga), condensador obstruido o compresor débil. Solución: prueba de estanqueidad, recarga con aceite correcto, tintado UV. En precompra, probar A/C 10 minutos en parado y en marcha.",
    source: "Checklist climatización talleres",
    tags: ["aire", "climatizador", "compresor"],
    maintenanceInterval: "Revisión A/C cada 2 años o si enfría mal",
    symptoms: ["Aire tibio", "Compresor no embraga", "Olor a humedad"],
    askSeller: ["¿Cuándo se recargó el A/C?", "¿Hay fugas conocidas?"],
    inspectSteps: ["Medir temperaturas bocas de aire", "Inspección visual condensador", "Buscar fugas con UV"],
    estimatedCostEur: { min: 80, max: 900 },
  }),
  chunk({
    id: "playbook-suspension-knocks",
    type: "inspection",
    brands: ALL,
    title: "Golpes en suspensión: bieletas, silentblocks, amortiguadores",
    content:
      "Golpes en badenes o dirección floja: bieletas estabilizadoras, silentblocks de trapecio o amortiguadores vencidos. Revisar en elevador, prueba de balancín y desgaste irregular de neumáticos. Coste bajo-medio pero habitual en coches >120.000 km.",
    source: "Checklist precompra suspensión",
    tags: ["suspension", "bieletas", "amortiguadores"],
    symptoms: ["Cloc-cloc en badenes", "Dirección imprecisa", "Neumáticos irregulares"],
    askSeller: ["¿Se han cambiado amortiguadores/bieletas?"],
    inspectSteps: ["Inspección en elevador", "Prueba de carretera con badenes", "Medir holguras"],
    estimatedCostEur: { min: 80, max: 700 },
  }),
  chunk({
    id: "playbook-injector-misfire",
    type: "issue",
    brands: ALL,
    fuels: ["diesel", "petrol"],
    title: "Fallo de encendido / cilindrada irregular → inyectores",
    content:
      "Temblor, codes P030x, humo o consumo irregular pueden ser inyector(es) sucios o fallando, bobinas (gasolina) o compresión. En common-rail diésel: balance de cilindros y retorno de inyectores. Solución: limpieza, regeneración o sustitución codificada; no mezclar marcas sin recodificar.",
    severity: "medium",
    source: "Protocolos diagnosis common-rail + foros TDI/HDi/dCi",
    tags: ["inyector", "misfire", "common rail"],
    symptoms: ["Temblor al ralentí", "Códigos misfire", "Humo irregular"],
    askSeller: ["¿Se han cambiado inyectores/bobinas? ¿Codificados?"],
    inspectSteps: ["Balance de cilindros OBD", "Prueba de retorno diésel", "Inspección bobinas/bujías gasolina"],
    estimatedCostEur: { min: 200, max: 1600 },
  }),
  chunk({
    id: "playbook-prebuy-general",
    type: "inspection",
    brands: ALL,
    title: "Checklist precompra universal (mecánica + electrónica)",
    content:
      "Orden recomendado: 1) historial/facturas y kilometraje coherente, 2) arranque en frío, 3) fugas aceite/refrigerante, 4) prueba 20-30 min mixta, 5) OBD sin códigos tapados, 6) frenos/neumáticos/suspensión, 7) electrónica (ventanas, sensores, A/C), 8) ITV y recalls por bastidor. Llevar a taller de confianza antes de pagar.",
    source: "Checklist agregada foros compraventa + guías de inspección independientes",
    tags: ["precompra", "checklist", "inspeccion", "obd"],
    askSeller: [
      "¿Puedo llevarlo a mi taller antes de pagar?",
      "¿Hay códigos borrados recientemente?",
      "¿Libro de mantenimiento completo?",
    ],
    inspectSteps: [
      "Arranque en frío y escucha",
      "Ruta mixta 20-30 minutos",
      "Lectura OBD completa",
      "Inspección elevador: fugas, silentblocks, frenos",
    ],
  }),
  chunk({
    id: "playbook-wet-belt-risk",
    type: "issue",
    brands: [...PSA, ...FORD, "volkswagen", "vw"],
    fuels: ["petrol"],
    yearFrom: 2012,
    yearTo: 2023,
    title: "Correa en baño de aceite (wet belt): riesgo y prevención",
    content:
      "Algunos PureTech/EcoBoost y otros llevan correa de distribución en baño de aceite. El aceite degradado hincha/rompe la correa y obstruye la bomba de aceite → fallo de motor. Prevención: aceite correcto y cambios cortos (10-15.000 km/1 año), inspección endoscópica de correa, kit preventivo. Preguntar siempre el código de motor.",
    severity: "high",
    source: "Casuística PureTech/EcoBoost foros + boletines técnicos públicos",
    tags: ["wet belt", "correa", "aceite", "puretech", "ecoboost"],
    symptoms: ["Ruido de distribución", "Baja presión de aceite", "Virutas/restos en carter"],
    askSeller: ["¿Código de motor exacto?", "¿Intervalo real de aceite y especificación?", "¿Inspección/cambio de correa húmeda?"],
    inspectSteps: ["Confirmar si es wet belt", "Endoscopia de correa", "Revisar facturas de aceite"],
    estimatedCostEur: { min: 800, max: 3500 },
    typicalKmFrom: 60000,
    typicalKmTo: 150000,
  }),
];

const vagPack: KnowledgeChunk[] = [
  chunk({
    id: "vag-ea888-gen3-oil-pcv",
    type: "issue",
    brands: VAG,
    fuels: ["petrol"],
    yearFrom: 2012,
    yearTo: 2019,
    motorCodes: ["EA888", "CHHB", "CJXB", "DJHA"],
    models: ["golf", "passat", "leon", "octavia", "a3", "a4", "tt", "tiguán", "tiguan"],
    title: "EA888 Gen3: consumo de aceite y PCV/separador",
    content:
      "El EA888 Gen3 (1.8/2.0 TSI) acumula quejas de consumo de aceite y fallos del separador PCV/placa de presión. Síntomas: bajada de nivel, silbido, códigos. Soluciones: actualizar PCV/tapa, control de consumo, en casos graves segmentos. Verificar campañas y facturas de tapa de balancines/PCV.",
    severity: "medium",
    source: "Foros VAG-COM / GolfMK7 / AudiSport + TSBs EA888",
    sourceUrl: "https://www.golfmk7.com/",
    tags: ["ea888", "tsi", "aceite", "pcv"],
    symptoms: ["Consumo de aceite", "Silbido en frío", "Códigos PCV"],
    askSeller: ["¿Consumo de aceite documentado?", "¿Cambio de PCV/tapa?"],
    inspectSteps: ["Nivel de aceite", "Escuchar PCV", "Histórico de rellenos"],
    estimatedCostEur: { min: 250, max: 2800 },
    reliabilityScore: 72,
  }),
  chunk({
    id: "vag-dq250-dq381-service",
    type: "maintenance",
    brands: VAG,
    yearFrom: 2013,
    yearTo: 2024,
    title: "DSG DQ250/DQ381: servicio de aceite y filtro",
    content:
      "Las DSG de baño de aceite (DQ250/DQ381) necesitan cambio de aceite y filtro; no son 'para toda la vida'. Intervalo típico 60.000 km. Tirones o cambios bruscos tras omitir el servicio son frecuentes. Pedir factura con especificación VW correcta.",
    maintenanceInterval: "Aceite+filtro DSG ~60.000 km",
    source: "Manuales VW/Audi DSG + talleres especializados DSG",
    tags: ["dsg", "dq250", "dq381", "aceite"],
    askSeller: ["¿Último servicio DSG con factura?"],
    inspectSteps: ["Prueba de cambios en caliente", "Códigos mechatronic"],
    estimatedCostEur: { min: 280, max: 450 },
    reliabilityScore: 78,
  }),
  chunk({
    id: "vag-dq200-dry-clutch",
    type: "issue",
    brands: VAG,
    yearFrom: 2010,
    yearTo: 2019,
    models: ["golf", "polo", "leon", "ibiza", "octavia", "fabia", "a3"],
    title: "DSG DQ200 (seco): embragues y mechatronic",
    content:
      "La DQ200 de 7 marchas en seco tuvo lotes problemáticos: tirones, pérdida de marchas, mechatronic. Hubo campañas. Solución: actualización software, mechatronic o embragues. Evitar si el historial no documenta reparaciones; probar en atasco y cuesta.",
    severity: "high",
    source: "Campañas VW/SEAT/Škoda DQ200 + foros VAG",
    tags: ["dq200", "dsg", "mechatronic"],
    symptoms: ["Tirones a baja velocidad", "Pérdida de marchas", "Modo emergencia caja"],
    askSeller: ["¿Campañas DQ200 aplicadas?", "¿Mechatronic/embragues sustituidos?"],
    inspectSteps: ["Prueba urbana lenta", "Lectura fallos caja", "Historial de campañas por VIN"],
    estimatedCostEur: { min: 800, max: 2500 },
    reliabilityScore: 68,
  }),
  chunk({
    id: "vag-tdi-injector-rail",
    type: "issue",
    brands: VAG,
    fuels: ["diesel"],
    yearFrom: 2008,
    yearTo: 2018,
    title: "TDI: inyectores y bomba de alta presión",
    content:
      "En TDI con muchos km aparecen inyectores con mal retorno, ruidos de tick y falta de potencia. La bomba HPFP puede contaminar el rail si falla. Solución: medición de retorno, sustitución codificada, limpieza de rail si hay limaduras. Pedir historial de inyectores.",
    severity: "medium",
    source: "Foros TDIClub / VAG diésel + protocolos Bosch common-rail",
    tags: ["tdi", "inyector", "hpfp"],
    symptoms: ["Tick de inyector", "Arranque difícil en caliente", "Humos irregulares"],
    estimatedCostEur: { min: 350, max: 1800 },
    reliabilityScore: 74,
  }),
  chunk({
    id: "vag-haldex-awd-service",
    type: "maintenance",
    brands: VAG,
    models: ["golf", "tiguan", "ateca", "octavia", "superb", "s3", "tt"],
    yearFrom: 2012,
    yearTo: 2024,
    title: "Haldex AWD: cambio de aceite del acoplamiento",
    content:
      "El Haldex necesita servicio de aceite (y a menudo filtro) cada ~30-60.000 km según generación. Sin servicio: ruidos, falta de tracción, bomba fallida. Preguntar en 4Motion/4Drive/quattro Haldex.",
    maintenanceInterval: "Aceite Haldex ~30.000-60.000 km según gen.",
    source: "Manuales Haldex Gen 4/5 + foros AWD VAG",
    tags: ["haldex", "4motion", "awd"],
    estimatedCostEur: { min: 120, max: 350 },
  }),
  chunk({
    id: "audi-timing-chain-banks",
    type: "issue",
    brands: ["audi", "volkswagen", "vw"],
    fuels: ["petrol"],
    yearFrom: 2008,
    yearTo: 2016,
    motorCodes: ["CAEB", "CDN", "CREC"],
    title: "Cadenas laterales Audi/VW 2.0 TFSI generaciones previas",
    content:
      "Algunos 2.0 TFSI previos a Gen3 sufrieron estiramiento de cadena y tensores. Ruido en frío y códigos de correlación. Solución kit cadena completo; verificar si ya se hizo.",
    severity: "high",
    source: "AudiSport / VW Vortex + TSBs cadena TFSI",
    tags: ["cadena", "tfsi", "audi"],
    estimatedCostEur: { min: 900, max: 2500 },
    reliabilityScore: 70,
  }),
];

const bmwPack: KnowledgeChunk[] = [
  chunk({
    id: "bmw-n63-tu-oil-cooling",
    type: "issue",
    brands: BMW,
    fuels: ["petrol"],
    yearFrom: 2012,
    yearTo: 2018,
    motorCodes: ["N63", "N63TU"],
    models: ["serie 5", "serie 7", "serie 8", "x5", "x6", "650"],
    title: "BMW N63/N63TU: consumo de aceite y enfriamiento",
    content:
      "El V8 biturbo N63 tuvo consumo de aceite, fallos de válvulas PCV y sobrecalentamiento de catalizadores en primeras revisiones. N63TU mejoró pero sigue exigiendo mantenimiento impecable. Pedir historial de campañas y consumo.",
    severity: "high",
    source: "BMWFAQ / Bimmerpost + campañas N63 públicas",
    sourceUrl: "https://www.bmwfaq.org/",
    tags: ["n63", "v8", "aceite"],
    estimatedCostEur: { min: 500, max: 5000 },
    reliabilityScore: 66,
  }),
  chunk({
    id: "bmw-zf8hp-service",
    type: "maintenance",
    brands: [...BMW, ...MERC, "audi", "jaguar", "land rover", "alfa romeo"],
    yearFrom: 2010,
    yearTo: 2025,
    title: "ZF 8HP: servicio de aceite aunque digan 'lifetime'",
    content:
      "La ZF 8HP es fiable pero el aceite se degrada. Talleres especialistas recomiendan cambio ~80-100.000 km o 8 años. Tirones leves en caliente mejoran tras servicio. Usar aceite ZF Lifeguard correcto.",
    maintenanceInterval: "Aceite ZF 8HP ~80.000-100.000 km",
    source: "ZF Aftermarket + foros BMWFAQ/JaguarForum",
    tags: ["zf", "8hp", "automatico"],
    estimatedCostEur: { min: 350, max: 650 },
    reliabilityScore: 86,
  }),
  chunk({
    id: "bmw-b48-b58-maintenance",
    type: "maintenance",
    brands: BMW,
    fuels: ["petrol"],
    yearFrom: 2016,
    yearTo: 2025,
    motorCodes: ["B48", "B58"],
    title: "BMW B48/B58: mantenimiento preventivo recomendado",
    content:
      "B48/B58 son más robustos que N20/N55, pero conviene: aceite de calidad a intervalos realistas, vigilancia de fugas de tapa de balancines, termostato/bomba de agua eléctrica y, en B58, inspección de chargepipe si hay aftermarket. Evitar intervals excesivos.",
    maintenanceInterval: "Aceite 10.000-15.000 km uso mixto",
    source: "BMWFAQ B48/B58 ownership threads + guías Indie",
    tags: ["b48", "b58", "mantenimiento"],
    reliabilityScore: 84,
  }),
  chunk({
    id: "bmw-transfer-case-atc",
    type: "issue",
    brands: BMW,
    models: ["x1", "x3", "x5", "serie 3", "serie 5"],
    yearFrom: 2007,
    yearTo: 2018,
    title: "Caja de transferencia ATC: ruidos y vibraciones xDrive",
    content:
      "En xDrive, ruidos al girar o vibraciones pueden ser actuador/cadena de la caja de transferencia ATC. Solución: reprogramación, aceite o sustitución del actuador/unidad. Probar círculos lentos y escuchar.",
    severity: "medium",
    source: "BMWFAQ xDrive / ATC failure patterns",
    tags: ["xdrive", "atc", "transfer"],
    estimatedCostEur: { min: 400, max: 2200 },
    reliabilityScore: 74,
  }),
  chunk({
    id: "mini-vanos-timing",
    type: "issue",
    brands: ["mini"],
    fuels: ["petrol"],
    yearFrom: 2007,
    yearTo: 2016,
    title: "MINI: VANOS y cadena en motores Prince",
    content:
      "MINI Cooper/S de esa época pueden sufrir ruido de cadena y fallos VANOS (solenoides, sellos). Síntomas: rattly cold start, pérdida de potencia. Solución kit cadena + VANOS según diagnóstico.",
    severity: "high",
    source: "North American MINI forums + BMWFAQ MINI",
    tags: ["mini", "vanos", "cadena"],
    estimatedCostEur: { min: 700, max: 2200 },
    reliabilityScore: 70,
  }),
];

const psaPack: KnowledgeChunk[] = [
  chunk({
    id: "psa-puretech-wet-belt-detail",
    type: "issue",
    brands: PSA,
    fuels: ["petrol"],
    yearFrom: 2014,
    yearTo: 2022,
    motorCodes: ["EB2", "EB2DT", "PureTech"],
    models: ["208", "2008", "308", "3008", "c3", "c4", "corsa", "crossland"],
    title: "PureTech 1.2: correa en baño de aceite y bomba",
    content:
      "El 1.2 PureTech con correa húmeda es el caso más citado en foros PSA: la correa se descompone, obstruye el filtro/bomba de aceite y puede destruir el motor. Solución preventiva: cambios de aceite cortos, inspección, sustitución de correa por kit actualizado. Tras rotura: motor completo a menudo. Negociar precio o exigir inspección.",
    severity: "high",
    source: "Foros Peugeot-Citroën / PureTech owners + boletines PSA",
    tags: ["puretech", "wet belt", "aceite"],
    symptoms: ["Ruido de distribución", "Presión de aceite baja", "Testigo aceite"],
    askSeller: ["¿Inspección/cambio de correa PureTech documentado?", "¿Intervalo de aceite real?"],
    inspectSteps: ["Endoscopia correa", "Analizar carter/filtro por residuos", "Confirmar campaña aplicada"],
    estimatedCostEur: { min: 900, max: 4500 },
    typicalKmFrom: 60000,
    typicalKmTo: 140000,
    reliabilityScore: 62,
  }),
  chunk({
    id: "psa-bluehdi-adblue-fap",
    type: "issue",
    brands: PSA,
    fuels: ["diesel"],
    yearFrom: 2014,
    yearTo: 2023,
    models: ["308", "3008", "5008", "c4", "c5", "grandland", "astra"],
    title: "BlueHDi: AdBlue, FAP y sensor de presión",
    content:
      "BlueHDi combina FAP+SCR. Fallos habituales: calidad AdBlue, cristalización, sensores, FAP colmatado en ciudad. Puede llegar a inmovilizar. Pedir historial limpio y regeneraciones; evitar coches solo urbanos sin factura SCR.",
    severity: "medium",
    source: "Foros BlueHDi / ClubPeugeot + talleres PSA",
    tags: ["bluehdi", "adblue", "fap"],
    estimatedCostEur: { min: 200, max: 2000 },
    reliabilityScore: 72,
  }),
  chunk({
    id: "psa-eat8-service",
    type: "maintenance",
    brands: [...PSA, ...RENAULT],
    yearFrom: 2017,
    yearTo: 2025,
    title: "EAT8 / Aisin: servicio y adaptación",
    content:
      "La EAT8 (Aisin) es generalmente sólida si se respeta el aceite correcto y adaptaciones tras servicio. Tirones leves tras cambio de aceite se corrigen con aprendizaje. Pedir especificación exacta del fluido.",
    maintenanceInterval: "Según manual; muchos especialistas a 80-100.000 km",
    source: "Manuales PSA EAT8 + foros 3008/508",
    tags: ["eat8", "aisin", "automatico"],
    reliabilityScore: 82,
  }),
  chunk({
    id: "opel-1-2-turbo-puretech-shared",
    type: "issue",
    brands: ["opel", "vauxhall"],
    fuels: ["petrol"],
    yearFrom: 2019,
    yearTo: 2023,
    models: ["corsa", "mokka", "crossland", "grandland"],
    title: "Opel 1.2 turbo post-PSA: mismos riesgos PureTech",
    content:
      "Tras la integración PSA, varios Opel 1.2 turbo comparten arquitectura PureTech. Aplicar las mismas precauciones de correa húmeda e intervalos de aceite. Verificar código motor en ficha técnica.",
    severity: "high",
    source: "Foros Opel / PureTech cross-brand",
    tags: ["opel", "puretech", "1.2"],
    reliabilityScore: 64,
  }),
];

const toyotaHondaPack: KnowledgeChunk[] = [
  chunk({
    id: "toyota-hybrid-inverter-coolant",
    type: "maintenance",
    brands: TOYOTA,
    fuels: ["hybrid", "plugin_hybrid"],
    yearFrom: 2010,
    yearTo: 2025,
    title: "Híbridos Toyota: líquido del inversor y batería",
    content:
      "Además del refrigerante de motor, el circuito del inversor debe mantenerse. Nivel bajo o contaminación puede dañar el inverter. Revisar también el ventilador de la batería HV (polvo en Prius/Auris/Corolla). Fiabilidad alta si el mantenimiento HV está al día.",
    maintenanceInterval: "Revisar refrigerante inverter según manual; limpiar ventilador HV en ITV/revisiones",
    source: "ClubToyota / PriusChat + manuales Toyota Hybrid",
    tags: ["hibrido", "inverter", "hvb"],
    reliabilityScore: 90,
  }),
  chunk({
    id: "toyota-hybrid-battery-refurb",
    type: "issue",
    brands: TOYOTA,
    fuels: ["hybrid"],
    yearFrom: 2004,
    yearTo: 2016,
    models: ["prius", "auris", "yaris", "ct 200h"],
    title: "Batería HV NiMH envejecida: síntomas y reacondicionado",
    content:
      "En híbridos NiMH antiguos: autonomía EV corta, motor térmico más presente, códigos de bloque. Solución habitual: reacondicionado de módulos o pack de intercambio. Coste inferior a EV modernos. Pedir SOH o prueba de ruta.",
    severity: "medium",
    source: "PriusChat / ClubToyota battery threads",
    tags: ["hvb", "nimh", "prius"],
    estimatedCostEur: { min: 800, max: 2500 },
    reliabilityScore: 85,
  }),
  chunk({
    id: "honda-earthdreams-oil-dilution",
    type: "issue",
    brands: ["honda"],
    fuels: ["petrol", "hybrid"],
    yearFrom: 2015,
    yearTo: 2022,
    models: ["civic", "cr-v", "hr-v", "accord"],
    title: "Honda 1.5T Earth Dreams: dilución de aceite en frío",
    content:
      "El 1.5 turbo Earth Dreams en climas fríos/uso corto puede diluir aceite con gasolina (nivel sube, olor a gasolina). Actualizaciones de software y cambios de aceite más frecuentes mitigan. Verificar boletines y hábito de uso.",
    severity: "medium",
    source: "Honda-Tech / Civic Forum + TSBs dilución 1.5T",
    tags: ["honda", "dilucion", "1.5t"],
    estimatedCostEur: { min: 100, max: 800 },
    reliabilityScore: 78,
  }),
  chunk({
    id: "honda-cvt-maintenance",
    type: "maintenance",
    brands: ["honda", "nissan", "mitsubishi"],
    yearFrom: 2012,
    yearTo: 2024,
    title: "CVT: fluido específico y síntomas de desgaste",
    content:
      "Las CVT exigen fluido específico y cambios periódicos pese a 'lifetime'. Tirones, ruidos de motor de goma o patinaje indican desgaste de correa/poleas. Servicio preventivo barato frente a sustitución completa.",
    maintenanceInterval: "Fluido CVT ~40.000-80.000 km según fabricante",
    source: "Foros Honda/Nissan CVT + guías de transmisión",
    tags: ["cvt", "fluido"],
    estimatedCostEur: { min: 180, max: 400 },
  }),
];

const mercedesFordPack: KnowledgeChunk[] = [
  chunk({
    id: "mercedes-om654-om651-dpf",
    type: "issue",
    brands: MERC,
    fuels: ["diesel"],
    yearFrom: 2012,
    yearTo: 2022,
    motorCodes: ["OM651", "OM654"],
    title: "Mercedes OM651/OM654: cadena, EGR cooler y FAP",
    content:
      "OM651: vigilancia de cadena y cooler EGR (fugas). OM654 mejora pero FAP/AdBlue siguen críticos en ciudad. Pedir historial Star Diagnosis y facturas de distribución/EGR.",
    severity: "medium",
    source: "BenzWorld / MercedesForum + talleres independientes MB",
    tags: ["om651", "om654", "egr", "cadena"],
    estimatedCostEur: { min: 400, max: 2800 },
    reliabilityScore: 76,
  }),
  chunk({
    id: "mercedes-7229-conductor-plate",
    type: "issue",
    brands: MERC,
    yearFrom: 2004,
    yearTo: 2015,
    title: "Caja 722.9: conductor plate y aceite",
    content:
      "La 7G-Tronic 722.9 puede fallar por conductor plate/velocímetros y aceite quemado. Síntomas: modos de emergencia, cambios erráticos. Solución: kit conductor plate + aceite/filtro; a veces mechatronic.",
    severity: "high",
    source: "BenzWorld 722.9 sticky threads",
    tags: ["722.9", "7gtronic"],
    estimatedCostEur: { min: 600, max: 2500 },
    reliabilityScore: 72,
  }),
  chunk({
    id: "ford-ecoboost-coolant-intrusion",
    type: "issue",
    brands: FORD,
    fuels: ["petrol"],
    yearFrom: 2010,
    yearTo: 2019,
    motorCodes: ["EcoBoost", "2.0 EB"],
    models: ["focus", "mondeo", "kuga", "escape", "edge", "fiesta"],
    title: "EcoBoost: intrusion de refrigerante (juntas/block)",
    content:
      "Algunos EcoBoost 1.5/1.6/2.0 tuvieron problemas de refrigerante al cilindro por junta/cast. Síntomas: pérdida de refrigerante sin fuga, misfire, humo blanco. Verificar campañas y pruebas de presión/CO2. Riesgo alto de reparación mayor.",
    severity: "high",
    source: "Ford EcoBoost forums + acciones de servicio públicas",
    tags: ["ecoboost", "refrigerante", "culata"],
    estimatedCostEur: { min: 1500, max: 5000 },
    reliabilityScore: 64,
  }),
  chunk({
    id: "ford-powershift-dct-history",
    type: "issue",
    brands: FORD,
    yearFrom: 2011,
    yearTo: 2018,
    models: ["focus", "fiesta", "kuga", "ecosport"],
    title: "PowerShift DPS6: historial de fallos y litigios",
    content:
      "La PowerShift de embrague seco tuvo vibraciones, tirones y fallos tempranos; hubo extensiones de garantía/litigios en varios mercados. Evitar sin historial de reparaciones mayores; preferir manual o convertidor moderno.",
    severity: "high",
    source: "Quejas públicas PowerShift + foros FocusMk3",
    tags: ["powershift", "dps6", "dct"],
    estimatedCostEur: { min: 1000, max: 3500 },
    reliabilityScore: 58,
  }),
  chunk({
    id: "renault-edc-dct",
    type: "issue",
    brands: RENAULT,
    yearFrom: 2012,
    yearTo: 2020,
    models: ["clio", "megane", "captur", "scenic"],
    title: "EDC Renault: embragues y actuadores",
    content:
      "Cajas EDC (doble embrague) pueden mostrar tirones y desgaste prematuro de embragues/actuadores, sobre todo en ciudad. Pedir facturas de EDC y probar atascos. Alternativa: manual o EAT en generaciones posteriores.",
    severity: "medium",
    source: "Foros Renault / Clio4 / Mégane",
    tags: ["edc", "dct", "renault"],
    estimatedCostEur: { min: 800, max: 2200 },
    reliabilityScore: 70,
  }),
  chunk({
    id: "renault-dci-timing-belt",
    type: "maintenance",
    brands: RENAULT,
    fuels: ["diesel"],
    yearFrom: 2010,
    yearTo: 2020,
    title: "dCi: correa de distribución e inyección",
    content:
      "Confirmar intervalo de correa (km y años) en dCi; un kit a tiempo evita rotura cara. Vigilar también turbo e inyectores en alto km. Historial de correa es negociador clave.",
    maintenanceInterval: "Correa según motor: típico 6 años / 100-160.000 km",
    source: "Manuales Renault dCi + foros diesel",
    tags: ["dci", "correa"],
    estimatedCostEur: { min: 450, max: 900 },
  }),
];

const hyundaiKiaOthers: KnowledgeChunk[] = [
  chunk({
    id: "hyundai-kia-theta2-engine",
    type: "issue",
    brands: HYUNDAI,
    fuels: ["petrol"],
    yearFrom: 2011,
    yearTo: 2019,
    motorCodes: ["Theta II", "G4KH", "G4KJ"],
    models: ["sonata", "optima", "sportage", "tucson", "santa fe"],
    title: "Theta II: desgaste de muñones y recalls",
    content:
      "El Theta II tuvo problemas de lubricación/muñones en algunos mercados con recalls y extensiones de garantía. Buscar historial de motor sustituido, ruidos de golpeteo y campañas aplicadas al VIN.",
    severity: "high",
    source: "Recalls NHTSA/Safety Gate + foros Hyundai/Kia",
    tags: ["theta", "recall", "motor"],
    estimatedCostEur: { min: 2000, max: 7000 },
    reliabilityScore: 65,
  }),
  chunk({
    id: "hyundai-kia-dct-7",
    type: "issue",
    brands: HYUNDAI,
    yearFrom: 2015,
    yearTo: 2022,
    title: "DCT 7 marchas Hyundai/Kia: software y embragues",
    content:
      "La DCT de 7 relaciones recibió actualizaciones de software por tirones y sensaciones de patinaje. Comprobar actualizaciones y historial; probar salida en cuesta y modo manual.",
    severity: "medium",
    source: "Foros Kia/Hyundai DCT + boletines de software",
    tags: ["dct", "hyundai", "kia"],
    estimatedCostEur: { min: 0, max: 2000 },
    reliabilityScore: 74,
  }),
  chunk({
    id: "landrover-ingenium-timing-belt",
    type: "issue",
    brands: ["land rover", "jaguar"],
    fuels: ["diesel", "petrol"],
    yearFrom: 2015,
    yearTo: 2022,
    motorCodes: ["Ingenium"],
    title: "Ingenium: correa húmeda / cadena y consumo de aceite",
    content:
      "Los Ingenium acumularon quejas de consumo de aceite, problemas de distribución (según versión correa/cadena) y fiabilidad variable. Exigir historial Jaguar Land Rover completo y presupuesto de posibles intervenciones grandes.",
    severity: "high",
    source: "Forum JLR / Ingenium ownership reports",
    tags: ["ingenium", "land rover", "jaguar"],
    estimatedCostEur: { min: 800, max: 4000 },
    reliabilityScore: 64,
  }),
  chunk({
    id: "volvo-drive-e-oil",
    type: "maintenance",
    brands: ["volvo"],
    yearFrom: 2014,
    yearTo: 2023,
    motorCodes: ["Drive-E", "VEA"],
    title: "Volvo Drive-E: aceite correcto y correa auxiliar",
    content:
      "Motores Drive-E (VEA) son sensibles a la especificación de aceite y en algunas versiones a la correa de accesorios en baño de aceite. Respetar viscosidad Volvo y revisiones; preguntar por campañas de correa auxiliar.",
    maintenanceInterval: "Aceite según Long Life Volvo; no alargar en uso severo",
    source: "Volvo Forums / VIDA service notes públicas",
    tags: ["volvo", "drive-e", "aceite"],
    reliabilityScore: 80,
  }),
  chunk({
    id: "mazda-skyactiv-carbon",
    type: "issue",
    brands: ["mazda"],
    fuels: ["petrol"],
    yearFrom: 2012,
    yearTo: 2021,
    title: "Skyactiv-G: carbonilla y mantenimiento de bujías/bobinas",
    content:
      "Skyactiv-G puede acumular carbonilla en admisión (inyección directa) y fallos de bobinas/bujías. Limpieza periódica y bujías a intervalo corto mejoran el comportamiento. Diésel Skyactiv: vigilar FAP en ciudad.",
    severity: "low",
    source: "Mazda3 Revolution / Skyactiv forums",
    tags: ["skyactiv", "carbonilla"],
    estimatedCostEur: { min: 150, max: 600 },
    reliabilityScore: 84,
  }),
  chunk({
    id: "nissan-vr38-qr25-timing",
    type: "issue",
    brands: ["nissan"],
    yearFrom: 2007,
    yearTo: 2018,
    models: ["qashqai", "x-trail", "juke", "altima", "pathfinder"],
    title: "Nissan: CVT Jatco y mantenimiento crítico",
    content:
      "Muchos Nissan con CVT Jatco sufren sobrecalentamiento y fallo si se omite el fluido o se remolca mal. Servicio de fluido+filtro y radiador CVT son preventivos clave. Sintomas: patinaje, overheat warning.",
    severity: "high",
    source: "Nicoclub / Qashqai owners CVT threads",
    tags: ["nissan", "cvt", "jatco"],
    estimatedCostEur: { min: 200, max: 4500 },
    reliabilityScore: 68,
  }),
  chunk({
    id: "fiat-multijet-dpf",
    type: "issue",
    brands: STELLANTIS_IT,
    fuels: ["diesel"],
    yearFrom: 2010,
    yearTo: 2020,
    title: "Multijet: FAP, EGR y sensor diferencial",
    content:
      "Los Multijet comparten problemática FAP/EGR típica del diésel urbano italiano/español. Sensores de presión diferenciales fallan y generan avisos falsos. Diagnosis antes de cambiar FAP completo.",
    severity: "medium",
    source: "ForoFiat / AlfaOwner Multijet",
    tags: ["multijet", "fap", "egr"],
    estimatedCostEur: { min: 150, max: 1400 },
    reliabilityScore: 74,
  }),
  chunk({
    id: "jeep-gearbox-928",
    type: "issue",
    brands: ["jeep", "alfa romeo"],
    yearFrom: 2014,
    yearTo: 2021,
    models: ["renegade", "compass", "giulietta", "stelvio", "giulia"],
    title: "Cajas ZF/Alfa-Jeep: tirones y software",
    content:
      "Algunas combinaciones Jeep/Alfa con automáticos mostraron tirones corregibles por software y aceite. Verificar actualizaciones de centralita de caja y estado del fluido.",
    severity: "low",
    source: "Alfa Romeo Giulia Forum / Jeep Compass forums",
    tags: ["jeep", "alfa", "automatico"],
    reliabilityScore: 76,
  }),
];

const papersAndStats: KnowledgeChunk[] = [
  chunk({
    id: "paper-adac-breakdown-patterns",
    type: "inspection",
    brands: ALL,
    title: "Patrones ADAC: qué falla más según edad/km",
    content:
      "Los informes ADAC de averías destacan baterías de 12V, arranque, electrónica de gestión, FAP/AdBlue en diésel y fallos de motor por falta de mantenimiento. Aplicación práctica: en coches >8 años priorizar batería, alternador, sensores y estado antipolución antes que estética.",
    source: "Síntesis de patrones ADAC Breakdown Statistics (informes públicos anuales)",
    sourceUrl: "https://www.adac.de/",
    tags: ["adac", "estadistica", "averias", "paper"],
  }),
  chunk({
    id: "paper-tuv-report-weak-points",
    type: "inspection",
    brands: ALL,
    title: "Informe TÜV: puntos débiles recurrentes en ITV",
    content:
      "Los reportes TÜV señalan con frecuencia alumbrado, frenos desgastados, fugas de aceite, ejes/suspensión y emisiones. En precompra española/ITV: faros, discos/pastillas, silentblocks y lectura de opacidad/OBD emisiones.",
    source: "Síntesis TÜV Report (publicaciones anuales)",
    sourceUrl: "https://www.tuv.com/",
    tags: ["tuv", "itv", "inspeccion", "paper"],
  }),
  chunk({
    id: "paper-dpf-regeneration-science",
    type: "issue",
    brands: ALL,
    fuels: ["diesel"],
    yearFrom: 2009,
    yearTo: 2025,
    title: "FAP: física de la regeneración y por qué falla en ciudad",
    content:
      "La regeneración oxida hollín a >550°C con post-inyección. Trayectos <15 min impiden completar el ciclo: hollín → sobrecarga → daño del filtro o dilución de aceite. Solución de uso: trayecto mensual a régimen; de taller: regeneración forzada o limpieza; no vaciar el filtro.",
    severity: "medium",
    source: "Literatura técnica post-tratamiento diésel (manuales Bosch/Delphi + papers SAE de DPF)",
    tags: ["fap", "dpf", "regeneracion", "paper", "sae"],
  }),
  chunk({
    id: "paper-liion-degradation-ev",
    type: "issue",
    brands: ALL,
    fuels: ["electric", "plugin_hybrid"],
    title: "Degradación Li-ion: temperatura, SoC y DC fast charge",
    content:
      "La literatura de baterías muestra que calor, SoC alto prolongado y DC fast charge frecuentes aceleran pérdida de capacidad. Para compraventa: pedir SOH, historial de cargas, refrigeración líquida vs aire, y garantía restante. Una degradación 2-3%/año es habitual; >20% total merece negociación.",
    severity: "medium",
    source: "Síntesis papers degradación Li-ion automoción (SAE/IEEE) + guías ACEA EV",
    tags: ["ev", "bateria", "soh", "paper"],
  }),
  chunk({
    id: "paper-timing-chain-wear",
    type: "issue",
    brands: ALL,
    title: "Desgaste de cadena: aceite, intervalo y tensores hidráulicos",
    content:
      "Estudios y TSBs coinciden: intervalos de aceite largos + baja viscosidad + tensores hidráulicos = elongación prematura. Detección: ruido frío, correlación levas-cigüeñal. Mitigación: aceite correcto, intervalos realistas, kit completo (cadena, guías, tensores, VVT si aplica).",
    severity: "high",
    source: "TSBs multi-marca + literatura desgaste distribución",
    tags: ["cadena", "aceite", "tensor", "paper"],
  }),
  chunk({
    id: "recall-method-vin-check",
    type: "recall",
    brands: ALL,
    title: "Cómo verificar recalls oficiales por bastidor",
    content:
      "Antes de comprar: consultar Safety Gate (UE), web del fabricante por VIN, y en España el historial de la marca. Un recall no aplicado es riesgo de seguridad y argumento de negociación. CarQuestions no consulta VIN en tiempo real: hazlo en fuentes oficiales.",
    severity: "high",
    source: "Safety Gate UE / portales de recalls de fabricantes",
    sourceUrl: "https://ec.europa.eu/safety-gate",
    tags: ["recall", "vin", "seguridad"],
  }),
];

const moreModels: KnowledgeChunk[] = [
  chunk({
    id: "seat-cupra-ea888-brake",
    type: "maintenance",
    brands: ["seat", "cupra"],
    yearFrom: 2018,
    yearTo: 2025,
    title: "SEAT/Cupra: frenos, DSG y revisiones deportivas",
    content:
      "Uso deportivo acelera pastillas/discos y aceite DSG. Pedir intervalos reales, no solo los del ordenador. Revisar estado de neumáticos semi-slick de origen si aplica.",
    source: "Foros Cupra / SEAT León",
    tags: ["cupra", "frenos", "dsg"],
    estimatedCostEur: { min: 300, max: 900 },
  }),
  chunk({
    id: "skoda-octavia-liberty",
    type: "inspection",
    brands: ["skoda"],
    models: ["octavia", "superb", "kodiaq"],
    yearFrom: 2013,
    yearTo: 2024,
    title: "Škoda Octavia/Superb: puntos de inspección VAG",
    content:
      "Aplicar checklist VAG: DSG servicio, FAP en TDI, bomba de agua/termostato en TSI, Haldex en 4x4. Octavia suele ser buena compra si el historial DSG/TDI está completo.",
    source: "Škoda Forum / OctaviaClub",
    tags: ["skoda", "octavia", "inspeccion"],
  }),
  chunk({
    id: "vw-id-thermal-battery",
    type: "issue",
    brands: ["volkswagen", "vw", "cupra", "skoda", "audi"],
    fuels: ["electric"],
    yearFrom: 2020,
    yearTo: 2025,
    models: ["id.3", "id.4", "id.5", "born", "enyaq", "q4"],
    title: "MEB/ID: gestión térmica y software de batería",
    content:
      "Plataforma MEB: vigilar actualizaciones de software de carga/batería, historial de DC fast, y posibles campañas de gestión térmica. Pedir informe de salud y potencia de carga sostenida.",
    severity: "medium",
    source: "Foros ID. / SpeakEV + notas de servicio VW MEB",
    tags: ["meb", "id3", "id4", "bateria"],
    reliabilityScore: 80,
  }),
  chunk({
    id: "tesla-suspension-12v",
    type: "issue",
    brands: ["tesla"],
    fuels: ["electric"],
    yearFrom: 2018,
    yearTo: 2024,
    models: ["model 3", "model y", "model s", "model x"],
    title: "Tesla: batería 12V, brazos de suspensión y alineación",
    content:
      "Fallos frecuentes de propiedad: batería 12V (síntomas electrónicos raros), brazos/silentblocks traseros y alineación. Pedir historial de servicio Tesla y revisar ruidos de suspensión en badenes.",
    severity: "medium",
    source: "Tesla Motors Club / foros Model 3",
    tags: ["tesla", "12v", "suspension"],
    estimatedCostEur: { min: 150, max: 1200 },
    reliabilityScore: 78,
  }),
  chunk({
    id: "dacia-duster-timing",
    type: "maintenance",
    brands: ["dacia", "renault"],
    models: ["duster", "sandero", "logan"],
    yearFrom: 2012,
    yearTo: 2023,
    title: "Dacia: correa, óxido y mantenimiento low-cost",
    content:
      "Buen valor si la correa está hecha y se acepta acabado simple. Vigilar óxido en bajos, estado de dirección/suspensión y, en GLP, estanqueidad. Historial de correa es crítico.",
    maintenanceInterval: "Correa según motor; no alargar años",
    source: "Foros Dacia / Duster",
    tags: ["dacia", "correa", "oxido"],
    reliabilityScore: 80,
  }),
  chunk({
    id: "suzuki-vitara-mild-hybrid",
    type: "maintenance",
    brands: ["suzuki"],
    models: ["vitara", "s-cross", "swift"],
    yearFrom: 2015,
    yearTo: 2024,
    title: "Suzuki: cadena, mild-hybrid y 4x4 AllGrip",
    content:
      "Motores Suzuki suelen usar cadena; fiabilidad buena con aceite correcto. En mild-hybrid revisar sistema ISG. AllGrip: probar modos y escuchar ruidos de transmisión.",
    source: "Suzuki Forums / Vitara owners",
    tags: ["suzuki", "allgrip", "cadena"],
    reliabilityScore: 86,
  }),
  chunk({
    id: "mitsubishi-outlander-phev-cells",
    type: "issue",
    brands: ["mitsubishi"],
    fuels: ["plugin_hybrid"],
    yearFrom: 2014,
    yearTo: 2021,
    models: ["outlander"],
    title: "Outlander PHEV: batería y bomba de calor",
    content:
      "PHEV Outlander: degradación de celdas y fallos de bomba de calor/climatización afectan autonomía EV. Pedir SOH y historial de garantías de batería.",
    severity: "medium",
    source: "Outlander PHEV Forum",
    tags: ["phev", "outlander", "bateria"],
    estimatedCostEur: { min: 1000, max: 8000 },
    reliabilityScore: 72,
  }),
  chunk({
    id: "generic-brake-fluid-2y",
    type: "maintenance",
    brands: ALL,
    title: "Líquido de frenos cada 2 años",
    content:
      "El líquido de frenos es higroscópico: absorbe agua y baja el punto de ebullición. Cambio cada 2 años independientemente del km. En precompra: color oscuro = negociar servicio.",
    maintenanceInterval: "Líquido de frenos cada 2 años",
    source: "Manuales multi-marca + buenas prácticas de taller",
    tags: ["frenos", "liquido", "mantenimiento"],
    estimatedCostEur: { min: 50, max: 120 },
  }),
  chunk({
    id: "generic-spark-plugs-turbo",
    type: "maintenance",
    brands: ALL,
    fuels: ["petrol", "hybrid"],
    title: "Bujías en turbo de inyección directa",
    content:
      "En gasolina turbo GDI las bujías y bobinas sufren más. Intervalos cortos (30-60.000 km) previenen misfires. Pedir última sustitución en Focus/Golf/PureTech/EcoBoost/Skyactiv.",
    maintenanceInterval: "Bujías 30.000-60.000 km en turbo GDI según fabricante",
    source: "Manuales GDI + foros de misfire turbo",
    tags: ["bujias", "gdi", "turbo"],
    estimatedCostEur: { min: 80, max: 250 },
  }),
  chunk({
    id: "generic-timing-belt-years",
    type: "maintenance",
    brands: ALL,
    title: "Correa de distribución: km Y años",
    content:
      "La correa envejece por tiempo aunque haya pocos km. Siempre verificar el límite en años del fabricante (a menudo 5-10). Un coche de bajo km pero 9 años puede llevar correa vencida.",
    maintenanceInterval: "Respetar el primero que se cumpla: km o años",
    source: "Manuales de distribución multi-marca",
    tags: ["correa", "años", "distribucion"],
  }),
];

function writePack(file: string, data: ReturnType<typeof pack>) {
  const dir = join(process.cwd(), "data", "knowledge", "packs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Wrote ${file}: ${data.chunks.length} chunks`);
}

function main() {
  writePack("01-symptom-playbooks.json", pack("symptom-playbooks", "Playbooks síntoma→solución", symptomPlaybooks));
  writePack("02-vag-group.json", pack("vag-group", "Grupo VAG técnico", vagPack));
  writePack("03-bmw-mini.json", pack("bmw-mini", "BMW / MINI técnico", bmwPack));
  writePack("04-psa-stellantis.json", pack("psa-stellantis", "PSA / Stellantis gasolina-diésel", psaPack));
  writePack("05-toyota-honda.json", pack("toyota-honda", "Toyota / Honda híbridos y GDI", toyotaHondaPack));
  writePack("06-mercedes-ford-renault.json", pack("mercedes-ford-renault", "Mercedes / Ford / Renault", mercedesFordPack));
  writePack("07-hyundai-jlr-others.json", pack("hyundai-jlr-others", "Hyundai-Kia / JLR / otros", hyundaiKiaOthers));
  writePack("08-papers-stats-recalls.json", pack("papers-stats", "Papers, ADAC/TÜV y recalls", papersAndStats));
  writePack("09-model-notes.json", pack("model-notes", "Notas por modelo y genéricos", moreModels));

  const total =
    symptomPlaybooks.length +
    vagPack.length +
    bmwPack.length +
    psaPack.length +
    toyotaHondaPack.length +
    mercedesFordPack.length +
    hyundaiKiaOthers.length +
    papersAndStats.length +
    moreModels.length;
  console.log(`Total new pack chunks: ${total}`);
}

main();
