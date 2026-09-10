import { describe, it, expect } from "vitest";
import {
  mapApiProduct,
  orderCatalogProducts,
  getProductMarketingKey,
  canonicalProductsByKey,
} from "@/lib/storefrontCatalog";

describe("Product Catalog & Synchronization", () => {
  it("resolves marketing keys accurately by catalog_key, category, or name", () => {
    expect(getProductMarketingKey("Serum", "Complexion Clarifying Serum 30ml")).toBe("new-serum");
    expect(getProductMarketingKey("Cleanser", "Clarifying Cleanser 120ml")).toBe("new-cleanser");
    expect(getProductMarketingKey(undefined, undefined, "new-bundle")).toBe("new-bundle");
    expect(getProductMarketingKey("Bundle", "Full Product Kit")).toBe("new-bundle");
  });

  it("prioritizes live API product attributes over default static values", () => {
    const apiProduct = {
      id: "prod-123",
      catalog_key: "new-serum",
      name: "Updated Serum Name",
      description: "Custom admin description for serum",
      price: 2800,
      in_stock: false,
      image_url: "/custom-serum-image.webp",
      rating: 5.0,
      reviews: 150,
      discount_percentage: 10,
      on_sale: true,
    };

    const mapped = mapApiProduct(apiProduct);
    expect(mapped).not.toBeNull();
    expect(mapped?.name).toBe("Updated Serum Name");
    expect(mapped?.description).toBe("Custom admin description for serum");
    expect(mapped?.price).toBe(2800);
    expect(mapped?.in_stock).toBe(false);
    expect(mapped?.image_url).toBe("/custom-serum-image.webp");
    expect(mapped?.catalogKey).toBe("new-serum");
    expect(mapped?.rating).toBe(5.0);
    expect(mapped?.reviews).toBe(150);
    expect(mapped?.on_sale).toBe(true);
    expect(mapped?.discount_percentage).toBe(10);
  });

  it("accurately parses KES prices from prices.KES.amount or USD base price", () => {
    const apiProductWithKesObj = {
      id: "prod-456",
      name: "Complexion Clarifying Cream 50ml",
      category: "Cream",
      prices: {
        KES: { amount: 2399, symbol: "KSh" },
      },
    };
    const mapped1 = mapApiProduct(apiProductWithKesObj);
    expect(mapped1?.price).toBe(2399);

    const apiProductWithUsd = {
      id: "prod-789",
      name: "Brightening Face Mask 120ml",
      category: "Mask",
      base_price_usd: 11.67, // 11.67 * 128.5 ≈ 1499.595 -> 1500
    };
    const mapped2 = mapApiProduct(apiProductWithUsd);
    expect(mapped2?.price).toBe(1500);
  });

  it("orders catalog products in canonical sequence", () => {
    const products = [
      canonicalProductsByKey["new-bundle"],
      canonicalProductsByKey["new-serum"],
      canonicalProductsByKey["new-cleanser"],
    ];

    const ordered = orderCatalogProducts(products);
    expect(ordered[0].catalogKey).toBe("new-cleanser");
    expect(ordered[2].catalogKey).toBe("new-serum");
    expect(ordered[5].catalogKey).toBe("new-bundle");
  });
});
