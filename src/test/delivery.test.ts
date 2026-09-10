import { describe, expect, it } from "vitest";
import {
  defaultKenyaDeliveryZone,
  getDeliveryZone,
  kenyaDeliveryZones,
  normalizeDeliveryZone,
} from "@/data/kenyaDelivery";
import {
  getDeliveryFieldErrors,
  getDeliverySummaryLabel,
  hasDeliveryFieldErrors,
} from "@/lib/delivery";

describe("Kenya Delivery Zones & Normalization", () => {
  it("should have Nairobi and Outside Nairobi zones configured", () => {
    expect(kenyaDeliveryZones.length).toBe(2);
    const nairobi = kenyaDeliveryZones.find((z) => z.zone === "nairobi");
    const upcountry = kenyaDeliveryZones.find((z) => z.zone === "outside_nairobi");

    expect(nairobi).toBeDefined();
    expect(nairobi?.doorFee).toBe(300);
    expect(nairobi?.pickupFee).toBe(300);

    expect(upcountry).toBeDefined();
    expect(upcountry?.doorFee).toBe(500);
    expect(upcountry?.pickupFee).toBe(500);
  });

  it("should normalize Nairobi variations correctly", () => {
    expect(normalizeDeliveryZone("nairobi")).toBe("nairobi");
    expect(normalizeDeliveryZone("NAIROBI")).toBe("nairobi");
    expect(normalizeDeliveryZone("Nairobi ")).toBe("nairobi");
    expect(normalizeDeliveryZone("within_nairobi")).toBe("nairobi");
    expect(normalizeDeliveryZone("within-nairobi")).toBe("nairobi");
    expect(normalizeDeliveryZone("within nairobi")).toBe("nairobi");
    expect(normalizeDeliveryZone("")).toBe("nairobi");
    expect(normalizeDeliveryZone(null)).toBe("nairobi");
  });

  it("should normalize Upcountry / Outside Nairobi variations", () => {
    expect(normalizeDeliveryZone("outside_nairobi")).toBe("outside_nairobi");
    expect(normalizeDeliveryZone("outside-nairobi")).toBe("outside_nairobi");
    expect(normalizeDeliveryZone("outside nairobi")).toBe("outside_nairobi");
    expect(normalizeDeliveryZone("Mombasa")).toBe("outside_nairobi");
    expect(normalizeDeliveryZone("Kisumu")).toBe("outside_nairobi");
    expect(normalizeDeliveryZone("Nakuru")).toBe("outside_nairobi");
    expect(normalizeDeliveryZone("Eldoret")).toBe("outside_nairobi");
  });

  it("should retrieve the correct delivery zone object", () => {
    const nairobiZone = getDeliveryZone("nairobi");
    expect(nairobiZone.label).toBe("Within Nairobi");
    expect(nairobiZone.doorFee).toBe(300);

    const upcountryZone = getDeliveryZone("outside_nairobi");
    expect(upcountryZone.label).toBe("Outside Nairobi");
    expect(upcountryZone.doorFee).toBe(500);

    const defaultZone = getDeliveryZone();
    expect(defaultZone.zone).toBe(defaultKenyaDeliveryZone.zone);
  });
});

describe("Delivery Field Validation", () => {
  it("should pass validation when all required fields are present for Nairobi", () => {
    const validNairobi = {
      zone: "nairobi",
      county: "",
      area: "Westlands",
      point: "Sarit Centre, Shop 4B",
    };

    expect(hasDeliveryFieldErrors(validNairobi)).toBe(false);
    expect(getDeliveryFieldErrors(validNairobi)).toEqual({});
    expect(getDeliverySummaryLabel(validNairobi)).toBe("Within Nairobi");
  });

  it("should require county for upcountry delivery", () => {
    const missingCounty = {
      zone: "outside_nairobi",
      county: "",
      area: "Nyali",
      point: "City Mall",
    };

    expect(hasDeliveryFieldErrors(missingCounty)).toBe(true);
    const errors = getDeliveryFieldErrors(missingCounty);
    expect(errors.county).toBe("County is required before checkout.");
  });

  it("should require area and point for both zones", () => {
    const emptyDetails = {
      zone: "nairobi",
      county: "",
      area: "",
      point: "",
    };

    expect(hasDeliveryFieldErrors(emptyDetails)).toBe(true);
    const errors = getDeliveryFieldErrors(emptyDetails);
    expect(errors.area).toBe("Area / Town / Estate is required before checkout.");
    expect(errors.point).toBe("Exact delivery point is required before checkout.");
  });
});
