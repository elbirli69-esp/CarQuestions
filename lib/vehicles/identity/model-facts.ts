import type { FuelType } from "@/types/vehicle";
import { normalizeBrandKey } from "@/lib/vehicles/identity/taxonomy";

/**
 * Hechos verificables y estables sobre modelos que solo existieron con un
 * tren motriz concreto. Se usa para detectar combinaciones imposibles
 * ("Tesla Model 3 diésel", "Toyota Prius V8 gasolina").
 *
 * Solo se incluyen modelos donde la restricción es inequívoca en el mercado
 * europeo. Ante la duda, no se añade: es preferible no detectar el error que
 * bloquear un coche legítimo.
 */
export interface ModelPowertrainFact {
  brand: string;
  /** Coincidencia exacta sobre el nombre del modelo normalizado. */
  models: string[];
  fuels: FuelType[];
  note: string;
}

export const MODEL_POWERTRAIN_FACTS: ModelPowertrainFact[] = [
  {
    brand: "tesla",
    models: ["model 3", "model s", "model x", "model y", "roadster", "cybertruck"],
    fuels: ["electric"],
    note: "Tesla solo ha fabricado vehículos eléctricos de batería.",
  },
  {
    brand: "toyota",
    models: ["prius"],
    fuels: ["hybrid", "plugin_hybrid"],
    note: "El Toyota Prius solo se comercializó como híbrido (y enchufable).",
  },
  {
    brand: "toyota",
    models: ["bz4x"],
    fuels: ["electric"],
    note: "El Toyota bZ4X es exclusivamente eléctrico.",
  },
  {
    brand: "toyota",
    models: ["mirai"],
    fuels: ["other"],
    note: "El Toyota Mirai es de pila de combustible de hidrógeno.",
  },
  {
    brand: "nissan",
    models: ["leaf", "ariya"],
    fuels: ["electric"],
    note: "Leaf y Ariya son modelos exclusivamente eléctricos.",
  },
  {
    brand: "renault",
    models: ["zoe", "twizy"],
    fuels: ["electric"],
    note: "Zoe y Twizy son exclusivamente eléctricos.",
  },
  {
    brand: "bmw",
    models: ["i3", "i4", "i5", "i7", "ix", "ix1", "ix2", "ix3"],
    fuels: ["electric"],
    note: "La familia BMW i (i3/i4/i5/i7/iX) es eléctrica de batería.",
  },
  {
    brand: "volkswagen",
    models: ["id3", "id4", "id5", "id7", "id buzz", "id.3", "id.4", "id.5", "id.7"],
    fuels: ["electric"],
    note: "La gama ID. de Volkswagen es exclusivamente eléctrica.",
  },
  {
    brand: "hyundai",
    models: ["ioniq 5", "ioniq 6", "kona electric"],
    fuels: ["electric"],
    note: "Ioniq 5 y Ioniq 6 son eléctricos de batería.",
  },
  {
    brand: "kia",
    models: ["ev6", "ev9", "e-niro", "soul ev"],
    fuels: ["electric"],
    note: "La gama EV de Kia es exclusivamente eléctrica.",
  },
  {
    brand: "polestar",
    models: ["2", "3", "4"],
    fuels: ["electric"],
    note: "Polestar 2, 3 y 4 son eléctricos de batería.",
  },
  {
    brand: "audi",
    models: ["e-tron", "q4 e-tron", "q8 e-tron", "e-tron gt"],
    fuels: ["electric"],
    note: "La gama e-tron de Audi es eléctrica.",
  },
  {
    brand: "mercedes-benz",
    models: ["eqa", "eqb", "eqc", "eqe", "eqs", "eqv"],
    fuels: ["electric"],
    note: "La gama EQ de Mercedes-Benz es eléctrica.",
  },
  {
    brand: "honda",
    models: ["e", "insight"],
    fuels: ["electric", "hybrid"],
    note: "Honda e (eléctrico) e Insight (híbrido) no tuvieron versión de combustión pura.",
  },
  {
    brand: "smart",
    models: ["#1", "#3"],
    fuels: ["electric"],
    note: "Los smart de nueva generación son eléctricos.",
  },
];

function normalizeModel(model: string): string {
  return model
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findModelPowertrainFact(
  brand: string,
  model: string,
): ModelPowertrainFact | undefined {
  const brandKey = normalizeBrandKey(brand);
  const modelKey = normalizeModel(model);
  return MODEL_POWERTRAIN_FACTS.find(
    (fact) =>
      fact.brand === brandKey && fact.models.some((item) => normalizeModel(item) === modelKey),
  );
}
