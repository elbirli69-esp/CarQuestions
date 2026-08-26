import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { trimDescription, trimLabel } from "@/lib/vehicles/trims";
import type { CatalogTrim } from "@/lib/vehicles/trims-types";

describe("trimLabel", () => {
  it("uses curated label when present", () => {
    const trim: CatalogTrim = {
      slug: "tce-100",
      name: "TCe 100",
      fuel: "petrol",
      powerHp: 100,
      label: "TCe 100 · Gasolina",
    };
    assert.equal(trimLabel(trim), "TCe 100 · Gasolina");
  });

  it("builds label from specs when label is missing", () => {
    const trim: CatalogTrim = {
      slug: "2-0-tdi",
      name: "2.0 TDI",
      fuel: "diesel",
      powerHp: 150,
      transmission: "automatic",
    };
    assert.equal(trimLabel(trim), "2.0 TDI · 150 CV · Diésel · Automático");
  });
});

describe("trimDescription", () => {
  it("includes years, engine and gearbox when known", () => {
    const trim: CatalogTrim = {
      slug: "tce-100",
      name: "TCe 100",
      fuel: "petrol",
      powerHp: 100,
      yearFrom: 2019,
      yearTo: 2026,
      engineCode: "H4M",
      transmission: "manual",
      label: "TCe 100 · Gasolina",
    };
    assert.equal(trimDescription(trim), "2019–2026 · H4M · Manual");
  });

  it("omits transmission when already implied in label", () => {
    const trim: CatalogTrim = {
      slug: "tsi-dsg",
      name: "1.5 TSI",
      fuel: "petrol",
      powerHp: 150,
      transmission: "automatic",
      label: "1.5 TSI · 150 CV · Gasolina · DSG",
      yearFrom: 2020,
    };
    assert.equal(trimDescription(trim), "2020+");
  });
});
