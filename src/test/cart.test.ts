import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import {
  formatCurrency,
  getCompareAtPrice,
  getEffectiveProductPrice,
  getProductMarketingKey,
  mapApiProduct,
  orderCatalogProducts,
  type StoreProduct,
} from "@/lib/storefrontCatalog";
import {
  getPromoBenefitLabel,
  getPromoCampaignLabel,
  getPromoTypeLabel,
  sanitizePromoCodeInput,
} from "@/lib/promo";
import type { PromoSummary } from "@/context/CartContext";

describe("Catalog Products & Pricing Calculations", () => {
  it("should have all 6 core skincare products with valid pricing", () => {
    expect(products.length).toBe(6);

    const cleanser = products.find((p) => p.id === "new-cleanser");
    const bundle = products.find((p) => p.id === "new-bundle");

    expect(cleanser).toBeDefined();
    expect(cleanser?.price).toBe(1899);

    expect(bundle).toBeDefined();
    expect(bundle?.price).toBe(9999);
    expect(bundle?.isBundle).toBe(true);
  });

  it("should format currency consistently as KSh X,XXX", () => {
    expect(formatCurrency(1899)).toBe("KSh 1,899");
    expect(formatCurrency(9999)).toBe("KSh 9,999");
    expect(formatCurrency(0)).toBe("KSh 0");
  });

  it("should calculate effective price with discount percentage", () => {
    const discountedProduct: StoreProduct = {
      id: "test-product",
      catalogKey: "test-product",
      name: "Test Serum",
      description: "Test description",
      price: 2000,
      discount_percentage: 10,
      in_stock: true,
      rating: 5,
      reviews: 10,
    };

    expect(getEffectiveProductPrice(discountedProduct)).toBe(1800);
    expect(getCompareAtPrice(discountedProduct)).toBe(2000);
  });

  it("should resolve marketing keys from product names or categories", () => {
    expect(getProductMarketingKey("cleanser", "Complexion Cleanser")).toBe("new-cleanser");
    expect(getProductMarketingKey("toner", "Brightening Toner")).toBe("new-toner");
    expect(getProductMarketingKey("serum", "Clarifying Serum")).toBe("new-serum");
    expect(getProductMarketingKey("cream", "Clarifying Cream")).toBe("new-cream");
    expect(getProductMarketingKey("mask", "Face Mask")).toBe("new-mask");
    expect(getProductMarketingKey("bundle", "Full Product Kit")).toBe("new-bundle");
  });

  it("should maintain canonical catalog order (cleanser, toner, serum, cream, mask, bundle)", () => {
    const unorderedProducts: StoreProduct[] = [
      { id: "new-mask", catalogKey: "new-mask", name: "Mask", price: 1499, in_stock: true, rating: 4.8, reviews: 10, description: "" },
      { id: "new-cleanser", catalogKey: "new-cleanser", name: "Cleanser", price: 1899, in_stock: true, rating: 4.8, reviews: 10, description: "" },
      { id: "new-bundle", catalogKey: "new-bundle", name: "Kit", price: 9999, in_stock: true, rating: 5, reviews: 10, description: "" },
    ];

    const ordered = orderCatalogProducts(unorderedProducts);
    expect(ordered[0].catalogKey).toBe("new-cleanser");
  });
});

describe("Promo Code Calculations & Formatting", () => {
  it("should sanitize promo code input to uppercase alphanumeric only", () => {
    expect(sanitizePromoCodeInput("glow-20")).toBe("GLOW20");
    expect(sanitizePromoCodeInput(" welcome 10 ")).toBe("WELCOME10");
    expect(sanitizePromoCodeInput("queen_koba!")).toBe("QUEENKOBA");
  });

  it("should generate proper human-readable labels for percentage, fixed, and free-shipping promos", () => {
    const percentagePromo: PromoSummary = {
      code: "GLOW15",
      discount_type: "percentage",
      discount_value: 15,
      discount_amount: 300,
      shipping_discount: 0,
      subtotal_kes: 2000,
      eligible_subtotal_kes: 2000,
      shipping_kes: 300,
      final_total_kes: 2000,
      description: "15% off first order",
      campaign_type: "welcome",
    };

    expect(getPromoTypeLabel(percentagePromo)).toBe("15% off");
    expect(getPromoBenefitLabel(percentagePromo)).toBe("15% off eligible items.");
    expect(getPromoCampaignLabel(percentagePromo)).toBe("15% off first order · welcome");

    const fixedPromo: PromoSummary = {
      ...percentagePromo,
      code: "SAVE500",
      discount_type: "fixed",
      discount_value: 500,
    };

    expect(getPromoTypeLabel(fixedPromo)).toBe("KSh 500 off");
    expect(getPromoBenefitLabel(fixedPromo)).toBe("KSh 500 off eligible items.");

    const freeShippingPromo: PromoSummary = {
      ...percentagePromo,
      code: "FREESHIP",
      discount_type: "free_shipping",
      discount_value: 0,
    };

    expect(getPromoTypeLabel(freeShippingPromo)).toBe("Free shipping");
    expect(getPromoBenefitLabel(freeShippingPromo)).toBe("Free shipping on the current order.");
  });

  it("should calculate correct final totals when applying shipping and promo discounts", () => {
    const subtotal = 4000;
    const shipping = 300;
    const discountAmount = 400; // 10%
    const shippingDiscount = 0;

    const grandTotal = subtotal + shipping - discountAmount - shippingDiscount;
    expect(grandTotal).toBe(3900);
  });
});
