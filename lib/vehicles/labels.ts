import type { BodyType, ConditionLevel, FuelType, TransmissionType } from "@/types/vehicle";

export const FUEL_LABELS: Record<FuelType, string> = {
  diesel: "Diésel",
  petrol: "Gasolina",
  hybrid: "Híbrido",
  plugin_hybrid: "Híbrido enchufable",
  electric: "Eléctrico",
  lpg: "GLP",
  cng: "GNC",
  other: "Otro",
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  manual: "Manual",
  automatic: "Automático",
  semi_automatic: "Semiautomático",
};

export const BODY_LABELS: Record<BodyType, string> = {
  suv: "SUV",
  sedan: "Berlina",
  hatchback: "Compacto",
  estate: "Familiar",
  coupe: "Coupé",
  cabrio: "Cabrio",
  van: "Furgoneta",
  pickup: "Pickup",
  other: "Otro",
};

export const CONDITION_LABELS: Record<ConditionLevel, string> = {
  excellent: "Excelente",
  good: "Bueno",
  fair: "Regular",
  poor: "Malo",
  unknown: "No lo sé",
};

export const BRAND_SUGGESTIONS = [
  "Audi",
  "BMW",
  "Mercedes-Benz",
  "Volkswagen",
  "SEAT",
  "Cupra",
  "Skoda",
  "Toyota",
  "Hyundai",
  "Kia",
  "Ford",
  "Renault",
  "Peugeot",
  "Citroën",
  "Opel",
  "Nissan",
  "Volvo",
  "Mazda",
  "Honda",
  "Mini",
  "Porsche",
  "Tesla",
  "Dacia",
  "Fiat",
  "Jeep",
];

export const EXAMPLE_QUESTIONS = [
  "¿Es un buen precio?",
  "¿Qué problemas suele tener este motor?",
  "¿Cuánto debería pagar como máximo?",
  "¿Es fiable este coche?",
  "¿Qué mantenimiento tendrá próximamente?",
  "¿Cuánto consume realmente?",
  "¿Qué averías son habituales?",
  "¿Qué debería revisar antes de comprarlo?",
  "¿Es mejor comprar este o un equivalente?",
  "¿Cuánto podría valer dentro de 3 años?",
  "¿Es buena compra para hacer 30.000 km al año?",
];
