import { estimateRegistrationYearFromPlate } from "@/lib/sources/plate/estimate-year";
import { formatSpanishPlateDisplay } from "@/lib/sources/plate/normalize";
import { parseProvincialPlate } from "@/lib/sources/plate/provincial";
import type { Vehicle } from "@/types/vehicle";

/**
 * Consulta gratuita: estimación de año (matrícula europea) y provincia (matrícula antigua).
 * No sustituye APIs de pago ni scraping de portales con antibot.
 */
export function lookupPlateLocally(normalizedPlate: string): Partial<Vehicle> {
  const vehicle: Partial<Vehicle> = {
    registrationPlate: formatSpanishPlateDisplay(normalizedPlate),
  };

  const year = estimateRegistrationYearFromPlate(normalizedPlate);
  if (year != null) vehicle.year = year;

  const provincial = parseProvincialPlate(normalizedPlate);
  if (provincial.location) vehicle.location = provincial.location;

  return vehicle;
}
