import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSellerQuestions } from "../seller-questions";
import type { Vehicle } from "@/types/vehicle";

function vehicle(fuel: Vehicle["fuel"], extra: Partial<Vehicle> = {}): Vehicle {
  return {
    brand: extra.brand ?? "BMW",
    model: extra.model ?? "X1",
    year: extra.year ?? 2019,
    mileage: extra.mileage ?? 80000,
    fuel,
    ...extra,
  };
}

describe("Preguntas al vendedor", () => {
  it("eléctrico pregunta por batería", () => {
    const questions = buildSellerQuestions(vehicle("electric", { brand: "Ebro", model: "S800" }), [], []);
    assert.ok(questions.some((item) => /bater/i.test(item.question)));
    assert.ok(questions.length <= 8);
    assert.ok(questions.every((item) => item.priority));
  });

  it("gasolina no pregunta por batería HV ni bomba de calor", () => {
    const questions = buildSellerQuestions(vehicle("petrol", { brand: "Toyota", model: "Corolla" }), [], [
      {
        id: "fake-ev",
        type: "issue",
        brands: ["toyota"],
        title: "Pack HV",
        content: "SOH y bomba de calor",
        source: "test",
        isDemo: true,
        askSeller: ["¿Cuál es el SOH de la batería HV?", "¿Lleva bomba de calor?"],
      },
    ]);
    const text = questions.map((item) => item.question).join(" ");
    assert.doesNotMatch(text, /bater[ií]a hv|soh|bomba de calor|heat pump/i);
  });

  it("diésel no pregunta por bomba de calor", () => {
    const questions = buildSellerQuestions(vehicle("diesel"), [], [
      {
        id: "fake-hp",
        type: "issue",
        brands: ["bmw"],
        title: "Térmico EV",
        content: "heat pump",
        source: "test",
        isDemo: true,
        askSeller: ["¿Lleva bomba de calor?"],
      },
    ]);
    const text = questions.map((item) => item.question).join(" ");
    assert.doesNotMatch(text, /bomba de calor|heat pump/i);
    assert.ok(questions.some((item) => /FAP|EGR/i.test(item.question)));
  });
});
