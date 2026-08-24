import { z } from "zod";
import {
  BODY_TYPES,
  CONDITION_LEVELS,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
} from "@/types/vehicle";

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.string().url().optional())
  .superRefine((value, ctx) => {
    if (!value) return;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message: "La URL del anuncio debe ser https." });
        return;
      }
      const host = url.hostname.toLowerCase();
      const allowed =
        host === "www.coches.net" ||
        host === "coches.net" ||
        host.endsWith("autoscout24.es") ||
        host.endsWith("autoscout24.com");
      if (!allowed) {
        ctx.addIssue({
          code: "custom",
          message: "Solo se aceptan URLs de anuncios de coches.net o AutoScout24.",
        });
      }
    } catch {
      ctx.addIssue({ code: "custom", message: "URL de anuncio no válida." });
    }
  });

export const vehicleInputSchema = z.object({
  brand: z.string().trim().min(1, "Indica la marca").max(80),
  model: z.string().trim().min(1, "Indica el modelo").max(80),
  version: optionalText,
  trimSlug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  year: z
    .number({ error: "Indica un año válido" })
    .int()
    .min(1980, "El año debe ser 1980 o posterior")
    .max(new Date().getFullYear() + 1, "El año no puede ser futuro"),
  mileage: z
    .number({ error: "Indica el kilometraje" })
    .int()
    .min(0)
    .max(1_000_000, "Kilometraje demasiado alto"),
  fuel: z.enum(FUEL_TYPES, { error: "Selecciona un combustible" }),
  power: z.number().int().min(20).max(2000).optional(),
  transmission: z.enum(TRANSMISSION_TYPES).optional(),
  bodyType: z.enum(BODY_TYPES).optional(),
  advertisedPrice: z.number().min(200).max(10_000_000).optional(),
  location: optionalText,
  owners: z.number().int().min(1).max(30).optional(),
  generalCondition: z.enum(CONDITION_LEVELS).optional(),
  maintenanceHistory: optionalText,
  accidents: optionalText,
  equipment: optionalText,
  extras: optionalText,
  itv: optionalText,
  serviceBook: z.boolean().optional(),
  tires: optionalText,
  bodyCondition: z.enum(CONDITION_LEVELS).optional(),
  interiorCondition: z.enum(CONDITION_LEVELS).optional(),
  listingUrl: optionalUrl,
  description: optionalText,
});

export type VehicleInputSchema = z.infer<typeof vehicleInputSchema>;

export const questionRequestSchema = z.object({
  question: z.string().trim().min(3, "Escribe una pregunta").max(2000),
  analysisId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(20)
    .optional(),
  vehicle: vehicleInputSchema.optional(),
});

export const listingSearchSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  version: optionalText,
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  mileage: z.number().int().min(0).max(1_000_000),
  fuel: z.enum(FUEL_TYPES).optional(),
  transmission: z.enum(TRANSMISSION_TYPES).optional(),
  power: z.number().int().min(20).max(2000).optional(),
  bodyType: z.enum(BODY_TYPES).optional(),
  location: optionalText,
  limit: z.number().int().min(1).max(50).optional(),
});

export const listingExtractSchema = z.object({
  url: z.string().trim().url("Introduce una URL válida"),
});
