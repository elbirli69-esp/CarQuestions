import type { InspectionChecklist, InspectionItem } from "@/types/valuation";
import type { Vehicle } from "@/types/vehicle";
import { isElectrifiedFuel, isElectricFuel } from "@/lib/vehicles/identity";

export function buildInspectionChecklist(vehicle: Vehicle): InspectionChecklist {
  const ev = isElectricFuel(vehicle.fuel);
  const electrified = isElectrifiedFuel(vehicle.fuel);
  const diesel = vehicle.fuel === "diesel";
  const items: InspectionItem[] = [
    { phase: "before", title: "VIN / bastidor", detail: "Pide el VIN por escrito y contrástalo con ficha técnica y anuncio." },
    { phase: "before", title: "Documentación", detail: "Permiso de circulación, ficha técnica y que el vendedor coincida con el titular o tenga autorización." },
    { phase: "before", title: "Historial", detail: "Facturas, libro y, si existe, informe de taller oficial." },
    { phase: "before", title: "ITV", detail: "Vigor, deficiencias y si coincide el kilometraje de la última inspección." },
    { phase: "before", title: "Mantenimiento", detail: ev ? "Revisiones de software, frenos y refrigeración del pack." : "Intervalos de aceite, distribución y campañas pendientes." },
    { phase: "cold", title: "Arranque en frío", detail: ev ? "Encendido limpio, sin avisos HV ni ruidos de bomba." : "Arranque inmediato, sin humo extraño ni testigos." },
    { phase: "cold", title: "Ruidos", detail: "Escucha tren delantero, dirección y posibles golpeteos al maniobrar." },
    { phase: "cold", title: diesel ? "Humo y ralentí" : "Ralentí", detail: diesel ? "Humo blanco persistente o ralentí irregular es señal de taller." : "Ralentí estable, sin vacilaciones." },
    { phase: "cold", title: "Testigos", detail: "Ningún testigo motor, airbag, ABS o batería al quitar el contacto de arranque." },
    { phase: "drive", title: "Cambio", detail: vehicle.transmission === "automatic" || ev ? "Transiciones suaves, sin patinaje ni tirones." : "Embrague y marchas sin ruidos ni puntos duros." },
    { phase: "drive", title: "Frenos", detail: ev ? "Blending regen/fricción y que el pedal no quede esponjoso." : "Rectos, sin pulsación ni ruidos." },
    { phase: "drive", title: "Dirección y suspensión", detail: "Sin holguras, ruidos en badenes ni vibración en el volante." },
    { phase: "drive", title: "Temperatura", detail: ev ? "Sin derating agresivo ni avisos térmicos en un puerto rápido si puedes." : "Aguja estable; sin olores de refrigerante." },
    { phase: "hot", title: "Arranque en caliente", detail: ev ? "Reinicio del sistema sin errores." : "Debe arrancar a la primera tras un trayecto." },
    { phase: "hot", title: "Fugas y ventiladores", detail: "Bajos secos; ventiladores que cortan con lógica." },
    { phase: "pay", title: "VIN otra vez", detail: "El VIN del coche, papeles y contrato debe ser el mismo." },
    { phase: "pay", title: "Cargas y reserva de dominio", detail: "Informe de tráfico / cargas antes de transferir." },
    { phase: "pay", title: "Contrato y garantía", detail: "Precio, extras, km y cláusula de garantía por escrito." },
  ];

  if (electrified) {
    items.splice(5, 0, {
      phase: "before",
      title: "Informe de batería",
      detail: "Pide SOH o print de diagnosis. Sin cifra, no asumas salud del pack.",
    });
  }
  if (diesel) {
    items.splice(9, 0, {
      phase: "drive",
      title: "Antipolución",
      detail: "Sin avisos FAP/AdBlue y regeneración que no huela a quemado constante.",
    });
  }

  return {
    items,
    adaptedTo: `${vehicle.fuel}${vehicle.transmission ? ` · ${vehicle.transmission}` : ""}`,
  };
}
