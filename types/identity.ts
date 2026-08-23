import type { BodyType, FuelType, TransmissionType } from "@/types/vehicle";

/** De dónde procede un dato concreto del vehículo. */
export const FIELD_SOURCES = ["user", "listing", "catalog", "derived", "inferred"] as const;
export type FieldSource = (typeof FIELD_SOURCES)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low", "very_low", "none"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export interface FieldProvenance<T> {
  value: T;
  source: FieldSource;
  confidence: ConfidenceLevel;
  /** true solo si el dato se ha contrastado contra una lista o fuente externa. */
  verified: boolean;
  note?: string;
}

/**
 * Clase de tren motriz. Es la dimensión que más contaminación provoca en el RAG:
 * un BEV no tiene EGR ni distribución, y un gasolina no tiene batería HV.
 */
export const POWERTRAIN_CLASSES = ["ice", "hybrid", "phev", "bev", "unknown"] as const;
export type PowertrainClass = (typeof POWERTRAIN_CLASSES)[number];

export const DRIVETRAINS = ["fwd", "rwd", "awd", "unknown"] as const;
export type Drivetrain = (typeof DRIVETRAINS)[number];

export const BODY_CLASSES = ["passenger", "lcv", "unknown"] as const;
export type BodyClass = (typeof BODY_CLASSES)[number];

/**
 * Vehículo canónico: cada campo relevante lleva procedencia y confianza.
 * Es el contrato que consumen validación, RAG, valoración y preguntas.
 */
export interface CanonicalVehicle {
  make: FieldProvenance<string>;
  model: FieldProvenance<string>;
  trim?: FieldProvenance<string>;
  generation?: FieldProvenance<string>;
  engineCode?: FieldProvenance<string>;
  fuelType: FieldProvenance<FuelType>;
  powertrain: FieldProvenance<PowertrainClass>;
  powerHp?: FieldProvenance<number>;
  transmission?: FieldProvenance<TransmissionType>;
  drive: FieldProvenance<Drivetrain>;
  bodyType?: FieldProvenance<BodyType>;
  bodyClass: FieldProvenance<BodyClass>;
  year: FieldProvenance<number>;
  mileage: FieldProvenance<number>;
  price?: FieldProvenance<number>;
  country: FieldProvenance<string>;
  sourceUrl?: FieldProvenance<string>;
}

export const CONSISTENCY_STATUSES = ["ok", "suspicious", "invalid"] as const;
export type ConsistencyStatus = (typeof CONSISTENCY_STATUSES)[number];

export const CONSISTENCY_SEVERITIES = ["info", "warning", "blocking"] as const;
export type ConsistencySeverity = (typeof CONSISTENCY_SEVERITIES)[number];

export interface ConsistencyIssue {
  code: string;
  severity: ConsistencySeverity;
  fields: string[];
  /** Mensaje orientado al usuario, en español. */
  message: string;
  /** Qué debería hacer el usuario para resolverlo. */
  suggestion: string;
}

export interface VehicleIdentity {
  canonical: CanonicalVehicle;
  status: ConsistencyStatus;
  issues: ConsistencyIssue[];
  /**
   * Si es false, no se puede afirmar nada técnico específico del vehículo:
   * los datos se contradicen y cualquier conocimiento sería inventado.
   */
  safeForTechnicalKnowledge: boolean;
  /** Etiqueta legible: "BMW X1 sDrive18d (2019, diésel)". */
  label: string;
}
