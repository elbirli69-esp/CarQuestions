/**
 * Forma de los anuncios embebidos en `window.__INITIAL_PROPS__` de las páginas
 * de resultados de coches.net.
 *
 * Se valida con Zod y de forma permisiva: si coches.net cambia o añade campos,
 * los anuncios que no validen se descartan uno a uno en lugar de tirar el lote.
 */

import { z } from "zod";

const locationSchema = z.object({
  mainProvince: z.string().optional(),
  mainProvinceId: z.number().optional(),
  cityLiteral: z.string().optional(),
  regionLiteral: z.string().optional(),
});

const offerTypeSchema = z.object({
  id: z.number().optional(),
  literal: z.string().optional(),
});

export const cochesNetApiAdSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  title: z.string().optional(),
  url: z.string().optional(),
  price: z.number().optional(),
  km: z.number().optional(),
  year: z.number().optional(),
  hp: z.number().optional(),
  fuelType: z.string().optional(),
  bodyTypeId: z.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  photos: z.array(z.string()).optional(),
  img: z.string().optional(),
  publicationDate: z.string().optional(),
  creationDate: z.string().optional(),
  isProfessional: z.boolean().optional(),
  hasWarranty: z.boolean().optional(),
  isCertified: z.boolean().optional(),
  isFinanced: z.boolean().optional(),
  environmentalLabel: z.string().optional(),
  offerType: offerTypeSchema.optional(),
  location: locationSchema.optional(),
});

export type CochesNetApiAd = z.infer<typeof cochesNetApiAdSchema>;

export interface CochesNetSearchResults {
  items: CochesNetApiAd[];
  totalResults?: number;
  totalPages?: number;
  /** Anuncios presentes en el JSON que no pasaron validación. */
  invalidCount: number;
}
