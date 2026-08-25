import type { Vehicle } from "@/types/vehicle";
import type { RetrievalQuery } from "@/types/rag";
import { expandAutomotiveQuery } from "@/lib/rag/query/expand";
import type { VehicleComponentCodes } from "@/lib/vehicles/component-codes";

/** Build a retrieval query enriched with motor/gearbox codes for better recall. */
export function buildVehicleKnowledgeQuery(
  vehicle: Vehicle,
  options?: {
    limit?: number;
    componentCodes?: VehicleComponentCodes;
    extraTerms?: string[];
  },
): RetrievalQuery {
  const codes = options?.componentCodes;
  const queryText = [
    vehicle.brand,
    vehicle.model,
    vehicle.version,
    String(vehicle.year),
    vehicle.fuel,
    vehicle.transmission,
    codes?.engineCode,
    codes?.gearboxCode,
    codes?.codes?.join(" "),
    ...(options?.extraTerms ?? []),
    "fiabilidad mantenimiento fallos averías sintomas soluciones foros tecnicos",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    text: expandAutomotiveQuery(queryText),
    vehicle: {
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      fuel: vehicle.fuel,
      version: vehicle.version,
      engineCode: codes?.engineCode ?? vehicle.engineCode,
      gearboxCode: codes?.gearboxCode ?? vehicle.gearboxCode,
      componentCodes: codes?.codes,
    },
    limit: options?.limit ?? 24,
  };
}
