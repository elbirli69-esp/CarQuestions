import type {
  InspectionChecklistPhase,
  ListingAnalysis,
  ListingQualityFactor,
  PriceVerdict,
} from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

function priceLabel(verdict: PriceVerdict, originObserved: boolean): string {
  if (!originObserved) return "Sin mercado";
  if (verdict === "muy_barato" || verdict === "barato") return "Bueno";
  if (verdict === "precio_de_mercado" || verdict === "sin_precio") return "Normal";
  return "Alto";
}

function buildQualityFactors(vehicle: Vehicle): ListingQualityFactor[] {
  const factors: ListingQualityFactor[] = [
    {
      id: "price",
      label: "Precio",
      score: vehicle.advertisedPrice ? 100 : null,
      maxScore: 100,
      status: vehicle.advertisedPrice ? "ok" : "missing",
      note: vehicle.advertisedPrice ? "Precio indicado." : "Sin precio: no se puede evaluar si es caro o barato.",
    },
    {
      id: "mileage",
      label: "Kilometraje",
      score: vehicle.mileage >= 0 ? 100 : null,
      maxScore: 100,
      status: "ok",
      note: `${vehicle.mileage.toLocaleString("es-ES")} km indicados.`,
    },
    {
      id: "history",
      label: "Historial",
      score: vehicle.maintenanceHistory ? 100 : null,
      maxScore: 100,
      status: vehicle.maintenanceHistory ? "ok" : "missing",
      note: vehicle.maintenanceHistory ? "Historial descrito." : "No consta historial de mantenimiento.",
    },
    {
      id: "owners",
      label: "Propietarios",
      score: vehicle.owners ? 100 : null,
      maxScore: 100,
      status: vehicle.owners ? "ok" : "missing",
      note: vehicle.owners ? `${vehicle.owners} propietario(s).` : "No consta número de propietarios.",
    },
    {
      id: "itv",
      label: "ITV",
      score: vehicle.itv ? 100 : null,
      maxScore: 100,
      status: vehicle.itv ? "ok" : "missing",
      note: vehicle.itv ?? "No indicada.",
    },
    {
      id: "accidents",
      label: "Accidentes",
      score: vehicle.accidents ? 100 : null,
      maxScore: 100,
      status: vehicle.accidents ? (vehicle.accidents.toLowerCase().includes("no") ? "ok" : "warning") : "missing",
      note: vehicle.accidents ?? "No se ha indicado si ha tenido accidentes.",
    },
    {
      id: "equipment",
      label: "Equipamiento",
      score: vehicle.equipment && vehicle.equipment.length > 20 ? 100 : vehicle.equipment ? 50 : null,
      maxScore: 100,
      status: vehicle.equipment ? "ok" : "missing",
      note: vehicle.equipment ? "Equipamiento descrito." : "Sin detalle de equipamiento.",
    },
    {
      id: "service_book",
      label: "Libro de mantenimiento",
      score: vehicle.serviceBook ? 100 : null,
      maxScore: 100,
      status: vehicle.serviceBook ? "ok" : "missing",
      note: vehicle.serviceBook ? "Indica libro de mantenimiento." : "No consta libro de mantenimiento.",
    },
    {
      id: "description",
      label: "Descripción",
      score: vehicle.description && vehicle.description.length > 80 ? 100 : vehicle.description ? 50 : null,
      maxScore: 100,
      status: vehicle.description ? "ok" : "missing",
      note: vehicle.description ? "Descripción aportada." : "Sin descripción adicional.",
    },
    {
      id: "version",
      label: "Versión / motor",
      score: vehicle.version ? 100 : null,
      maxScore: 100,
      status: vehicle.version ? "ok" : "missing",
      note: vehicle.version ?? "Falta versión exacta (motorización).",
    },
  ];

  return factors;
}

function buildInspectionChecklist(vehicle: Vehicle): InspectionChecklistPhase[] {
  const isElectric = vehicle.fuel === "electric";
  const isDiesel = vehicle.fuel === "diesel";
  const isAutomatic = vehicle.transmission === "automatic";
  const isElectrified = ["electric", "hybrid", "plugin_hybrid"].includes(vehicle.fuel);

  const phases: InspectionChecklistPhase[] = [
    {
      phase: "before_visit",
      phaseLabel: "Antes de ir",
      items: [
        "Pedir número de bastidor (VIN) y contrastarlo con la ficha.",
        "Solicitar fotos de documentación, ITV y facturas de mantenimiento.",
        "Comprobar historial de propietarios y posibles cargas o reserva de dominio.",
      ],
    },
    {
      phase: "cold",
      phaseLabel: "En frío",
      items: [
        "Arranque en frío: ruidos, humo (si aplica) y testigos encendidos.",
        "Revisar fugas bajo el coche y estado de neumáticos.",
        "Comprobar nivel de aceite/refrigerante (sin abrir tapones en caliente).",
      ],
    },
    {
      phase: "test_drive",
      phaseLabel: "Durante la prueba",
      items: [
        "Probar cambios, frenos, dirección y suspensión en distintas velocidades.",
        "Escuchar vibraciones, golpeteos y ruidos de rodamientos.",
        isAutomatic ? "Comprobar tirones o patinajes de la caja automática." : "Probar embrague en arranque en cuesta.",
      ],
    },
    {
      phase: "hot",
      phaseLabel: "En caliente",
      items: [
        "Segundo arranque tras ruta: ventiladores, temperatura y ruidos nuevos.",
        "Revisar posibles fugas y olores (aceite, refrigerante, combustible).",
        isElectric
          ? "Comprobar carga AC si es posible y estado de conector."
          : "Verificar que no hay humo ni olor a quemado.",
      ],
    },
    {
      phase: "before_payment",
      phaseLabel: "Antes de pagar",
      items: [
        "VIN del coche = VIN de la documentación.",
        "Contrato con datos correctos y sin cargas pendientes.",
        "ITV en vigor y sin deficiencias graves pendientes.",
        "Garantía por escrito si el vendedor la ofrece.",
      ],
    },
  ];

  if (isDiesel) {
    phases[2]!.items.push("En diésel: comprobar regeneración/FAP sin avisos permanentes.");
  }
  if (isElectrified) {
    phases[1]!.items.push("En eléctrico/híbrido: revisar SOH o informe de batería si existe.");
    phases[2]!.items.push("Probar frenada regenerativa y EPB sin avisos.");
  }

  return phases;
}

export function analyzeListing(
  vehicle: Vehicle,
  verdict: PriceVerdict,
  options?: { marketObserved?: boolean },
): ListingAnalysis {
  const marketObserved = options?.marketObserved ?? false;
  const qualityFactors = buildQualityFactors(vehicle);
  const scored = qualityFactors.filter((f) => f.score != null);
  const qualityScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, f) => sum + (f.score ?? 0), 0) / qualityFactors.length)
      : null;

  const likes: string[] = [];
  const concerns: string[] = [];
  const inspectBeforeBuying = buildInspectionChecklist(vehicle).flatMap((phase) =>
    phase.items.slice(0, 2).map((item) => `[${phase.phaseLabel}] ${item}`),
  );

  if (vehicle.serviceBook) likes.push("Indica que hay libro de mantenimiento.");
  if (vehicle.equipment) likes.push("Se ha detallado equipamiento, lo que facilita comparar con otros anuncios.");
  if (marketObserved && (verdict === "barato" || verdict === "muy_barato")) {
    likes.push("El precio anunciado queda por debajo de la estimación con anuncios reales.");
  }

  if (!vehicle.maintenanceHistory) concerns.push("No hay historial de mantenimiento descrito.");
  if (!vehicle.accidents) concerns.push("No se ha indicado si ha tenido accidentes.");
  if (!vehicle.owners) concerns.push("No consta el número de propietarios.");
  if (!vehicle.itv) concerns.push("No se ha indicado el estado de la ITV.");
  if (!vehicle.version) concerns.push("Falta la versión exacta: difícil comparar motorizaciones.");

  if (vehicle.listingUrl) {
    likes.push("Hay URL de anuncio: se usó para rellenar o contrastar datos del formulario.");
  }

  const filled = [vehicle.description, vehicle.equipment, vehicle.maintenanceHistory, vehicle.accidents].filter(Boolean).length;
  const description = filled >= 3 ? "Completa" : filled >= 1 ? "Normal" : "Escasa";
  const equipment = vehicle.equipment && vehicle.equipment.length > 40 ? "Alto" : vehicle.equipment ? "Medio" : "Desconocido";
  const risk = concerns.length >= 3 ? "alto" : concerns.length === 2 ? "medio" : vehicle.accidents ? "medio" : "bajo";

  const limitations: string[] = [
    "Este análisis combina el formulario con la valoración. No sustituye ver el coche ni un informe de bastidor.",
  ];
  if (vehicle.listingUrl) {
    limitations.push(
      "La URL de coches.net puede rellenar marca/modelo/año/precio si el anuncio aparece en listados.",
    );
  } else {
    limitations.push("No hay URL de anuncio: el análisis se basa solo en lo que has escrito en el formulario.");
  }

  return {
    available: true,
    qualityScore,
    qualityFactors,
    price: priceLabel(verdict, marketObserved),
    vehicle: "Pendiente de inspección",
    description,
    equipment,
    risk,
    likes: likes.length > 0 ? likes : ["Los datos básicos del vehículo están cubiertos."],
    concerns,
    askSeller: [
      vehicle.listingUrl
        ? "Confirma en el anuncio bastidor, facturas e ITV antes de desplazarte."
        : "Pedir fotos adicionales, número de bastidor y facturas antes de desplazarte.",
    ],
    inspectBeforeBuying,
    inspectionChecklist: buildInspectionChecklist(vehicle),
    limitations,
  };
}
