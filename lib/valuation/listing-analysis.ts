import type { ListingAnalysis, PriceVerdict } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

function priceLabel(verdict: PriceVerdict, originObserved: boolean): string {
  if (!originObserved) return "Sin mercado";
  if (verdict === "muy_barato" || verdict === "barato") return "Bueno";
  if (verdict === "precio_de_mercado" || verdict === "sin_precio") return "Normal";
  return "Alto";
}

export function analyzeListing(
  vehicle: Vehicle,
  verdict: PriceVerdict,
  options?: { marketObserved?: boolean },
): ListingAnalysis {
  const marketObserved = options?.marketObserved ?? false;
  const likes: string[] = [];
  const concerns: string[] = [];
  const inspectBeforeBuying = [
    "Probar el coche en caliente y en frío, incluyendo autovía si es posible.",
    "Revisar bajos, neumaticos, frenos y posibles fugas.",
    "Contrastar el kilometraje con el estado interior y las facturas.",
  ];

  if (vehicle.serviceBook) likes.push("Indica que hay libro de mantenimiento.");
  if (vehicle.equipment) likes.push("Se ha detallado equipamiento, lo que facilita comparar con otros anuncios.");
  if (marketObserved && (verdict === "barato" || verdict === "muy_barato")) {
    likes.push("El precio anunciado queda por debajo de la estimación con anuncios reales.");
  }

  if (!vehicle.maintenanceHistory) concerns.push("No hay historial de mantenimiento descrito.");
  if (!vehicle.accidents) concerns.push("No se ha indicado si ha tenido accidentes.");
  if (!vehicle.owners) concerns.push("No consta el número de propietarios.");
  if (!vehicle.itv) concerns.push("No se ha indicado el estado de la ITV.");

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
      "La URL de coches.net puede rellenar marca/modelo/año/precio si el anuncio aparece en listados; la ficha individual a menudo no es scrapeable al completo.",
    );
  } else {
    limitations.push("No hay URL de anuncio: el análisis se basa solo en lo que has escrito en el formulario.");
  }

  return {
    available: true,
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
    limitations,
  };
}
