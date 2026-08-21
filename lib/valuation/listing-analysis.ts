import type { ListingAnalysis, PriceVerdict } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";

function priceLabel(verdict: PriceVerdict): string {
  if (verdict === "muy_barato" || verdict === "barato") return "Bueno";
  if (verdict === "precio_de_mercado" || verdict === "sin_precio") return "Normal";
  return "Alto";
}

export function analyzeListing(vehicle: Vehicle, verdict: PriceVerdict): ListingAnalysis {
  const likes: string[] = [];
  const concerns: string[] = [];
  const inspectBeforeBuying = [
    "Probar el coche en caliente y en frío, incluyendo autovía si es posible.",
    "Revisar bajos, neumaticos, frenos y posibles fugas.",
    "Contrastar el kilometraje con el estado interior y las facturas.",
  ];

  if (vehicle.serviceBook) likes.push("Indica que hay libro de mantenimiento.");
  if (vehicle.equipment) likes.push("Se ha detallado equipamiento, lo que facilita comparar con otros anuncios.");
  if (verdict === "barato" || verdict === "muy_barato") likes.push("El precio anunciado queda por debajo de la estimación de este MVP.");

  if (!vehicle.maintenanceHistory) concerns.push("No hay historial de mantenimiento descrito.");
  if (!vehicle.accidents) concerns.push("No se ha indicado si ha tenido accidentes.");
  if (!vehicle.owners) concerns.push("No consta el número de propietarios.");
  if (vehicle.listingUrl) {
    concerns.push("La URL del anuncio se ha guardado, pero todavía no se extrae ni se verifica el anuncio real.");
  }

  const filled = [vehicle.description, vehicle.equipment, vehicle.maintenanceHistory, vehicle.accidents].filter(Boolean).length;
  const description = filled >= 3 ? "Completa" : filled >= 1 ? "Normal" : "Escasa";
  const equipment = vehicle.equipment && vehicle.equipment.length > 40 ? "Alto" : vehicle.equipment ? "Medio" : "Desconocido";
  const risk = concerns.length >= 3 ? "alto" : concerns.length === 2 ? "medio" : vehicle.accidents ? "medio" : "bajo";

  if (!vehicle.listingUrl && !vehicle.description) {
    return {
      available: true,
      price: priceLabel(verdict),
      vehicle: "Bueno a falta de inspección",
      description,
      equipment,
      risk,
      likes: likes.length > 0 ? likes : ["Los datos básicos del vehículo están cubiertos."],
      concerns,
      askSeller: ["Pedir fotos adicionales, número de bastidor y facturas antes de desplazarte."],
      inspectBeforeBuying,
      limitations: [
        "Este análisis se basa solo en el formulario. No se ha leído un anuncio real ni se han visto fotos.",
      ],
    };
  }

  return {
    available: true,
    price: priceLabel(verdict),
    vehicle: "Pendiente de inspección",
    description,
    equipment,
    risk,
    likes: likes.length > 0 ? likes : ["Hay una URL o descripción para contrastar más adelante."],
    concerns,
    askSeller: ["Pedir el historial, el estado de distribución y si admite inspección en un taller independiente."],
    inspectBeforeBuying,
    limitations: [
      "La extracción automática de anuncios no está activa. No se analiza el texto real del portal.",
    ],
  };
}
