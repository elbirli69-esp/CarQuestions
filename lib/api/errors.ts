import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details: details ?? null,
    },
    { status },
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Los datos enviados no son válidos.", 400, error.issues);
  }

  console.error(error);
  return jsonError("Ha ocurrido un error inesperado.", 500);
}
