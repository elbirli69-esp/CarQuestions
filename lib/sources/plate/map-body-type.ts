import type { BodyType } from "@/types/vehicle";

export function mapBodyTypeLabel(raw: string | undefined): BodyType | undefined {
  if (!raw?.trim()) return undefined;
  const text = raw.toLowerCase();

  if (/suv|todocamino|crossover|4x4/.test(text)) return "suv";
  if (/berlina|sedan|saloon|limousine/.test(text)) return "sedan";
  if (/utilitario|hatch|compact|city/.test(text)) return "hatchback";
  if (/familiar|station|estate|touring|break|monovolumen|mpv|minivan/.test(text)) return "estate";
  if (/cabrio|descapotable|convertible|roadster/.test(text)) return "cabrio";
  if (/coup[eé]|coupe/.test(text)) return "coupe";
  if (/furgon|van|combi|monovolumen/.test(text)) return "van";
  if (/pickup|pick-up/.test(text)) return "pickup";

  return "other";
}

export function mapTransmissionLabel(raw: string | undefined): "manual" | "automatic" | undefined {
  if (!raw?.trim()) return undefined;
  const text = raw.toLowerCase();
  if (/manual/.test(text)) return "manual";
  if (/auto|automatic|cvt|dsg|dct/.test(text)) return "automatic";
  return undefined;
}
