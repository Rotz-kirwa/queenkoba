import type { Product } from "@/context/CartContext";
import { products as initialProducts } from "@/data/products";

export interface ApiProduct {
  _id?: string | number;
  id?: string | number;
  catalog_key?: string;
  catalogKey?: string;
  slug?: string;
  price?: number;
  base_price_usd?: number;
  image?: string;
  name?: string;
  description?: string;
  category?: string;
  prices?: Record<string, { amount?: number; symbol?: string; country?: string }>;
  in_stock?: boolean;
  image_url?: string;
  rating?: number;
  reviews?: number;
  discount_percentage?: number;
  on_sale?: boolean;
}

export interface StoreProduct extends Product {
  catalogKey: string;
  in_stock: boolean;
  image_url?: string;
  discount_percentage?: number;
  on_sale?: boolean;
  badges?: string[];
  stock_left?: number;
  urgency_tag?: string;
  cta_label?: string;
  footer_note?: string;
  bundle_message?: string;
  stepLabel?: string;
  sizeLabel?: string;
  subtitle?: string;
  benefits?: string[];
  keyIngredients?: string[];
  skinConcerns?: string[];
  useDirections?: string;
}

const productMarketing: Record<string, Partial<StoreProduct>> = {
  "new-cleanser": {
    badges: ["Best Seller", "Step 1"],
    stock_left: 12,
    urgency_tag: "Daily reset for glow-focused routines",
    rating: 4.8,
    reviews: 87,
    stepLabel: "Cleanse",
    sizeLabel: "120ml",
    subtitle: "Brightening face cleanser for dull skin, buildup, and uneven tone.",
    benefits: [
      "Lifts buildup, excess oil, and sunscreen",
      "Preps skin for toner and serum",
      "Leaves skin fresh, soft, and balanced",
    ],
    keyIngredients: ["African botanicals", "Aloe", "Clarifying actives"],
    skinConcerns: ["Uneven tone", "Congestion", "Dullness"],
    useDirections: "Massage into damp skin morning and evening, then rinse.",
  },
  "new-toner": {
    badges: ["Glow Prep"],
    stock_left: 9,
    urgency_tag: "Smooths the way for the rest of your routine",
    rating: 4.7,
    reviews: 64,
    stepLabel: "Tone",
    sizeLabel: "120ml",
    subtitle: "Brightening toner for dark spots, post-blemish marks, and uneven tone.",
    benefits: [
      "Balances and refreshes after cleansing",
      "Helps support a more even-looking tone",
      "Layers well under treatment serums",
    ],
    keyIngredients: ["Licorice root", "Aloe", "Hydrating humectants"],
    skinConcerns: ["Dark spots", "Sensitivity", "Dryness"],
    useDirections: "Apply with hands or cotton after cleansing, then follow with serum.",
  },
  "new-serum": {
    badges: ["Hero Product", "Dark Spot Care"],
    stock_left: 5,
    urgency_tag: "Our most treatment-led formula for stubborn marks",
    rating: 4.9,
    reviews: 112,
    stepLabel: "Treat",
    sizeLabel: "30ml",
    subtitle: "Dark spot corrector serum for hyperpigmentation and uneven skin tone.",
    benefits: [
      "Targets visible dark spots and uneven tone",
      "Supports brighter, clearer-looking skin",
      "Designed to work with melanin-rich skin",
    ],
    keyIngredients: ["Liwa", "Moringa", "Brightening botanicals"],
    skinConcerns: ["Hyperpigmentation", "Post-acne marks", "Uneven tone"],
    useDirections: "Apply 2-3 drops after toner, then follow with moisturizer and SPF.",
  },
  "new-cream": {
    badges: ["Barrier Care"],
    urgency_tag: "Locks in hydration and supports a healthy glow",
    rating: 4.8,
    reviews: 95,
    stepLabel: "Moisturize",
    sizeLabel: "50ml",
    subtitle: "Skin brightening cream for uneven skin tone, hydration, and glow support.",
    benefits: [
      "Deeply hydrates without feeling heavy",
      "Helps keep skin smooth and supple",
      "Pairs beautifully with the serum step",
    ],
    keyIngredients: ["Shea", "Snail mucin", "Barrier-supporting emollients"],
    skinConcerns: ["Dryness", "Rough texture", "Compromised barrier"],
    useDirections: "Smooth over face and neck after serum, morning and evening.",
  },
  "new-mask": {
    badges: ["Weekly Reset", "Glow Boost"],
    stock_left: 7,
    urgency_tag: "Use when skin needs a visible refresh",
    rating: 4.8,
    reviews: 76,
    stepLabel: "Reset",
    sizeLabel: "120ml",
    subtitle: "Face brightening mask for dull skin, buildup, and weekly glow support.",
    benefits: [
      "Helps lift dullness and surface buildup",
      "Leaves skin smoother and more luminous",
      "Ideal as a weekly ritual step",
    ],
    keyIngredients: ["Qasil", "Aloe", "Balancing clays"],
    skinConcerns: ["Dullness", "Texture", "Buildup"],
    useDirections: "Apply to clean skin 1-2 times weekly, leave on briefly, then rinse.",
  },
  "new-bundle": {
    badges: ["Full Routine", "Free Shipping"],
    stock_left: 4,
    cta_label: "Add Full Ritual",
    bundle_message: "Build a complete routine in one purchase.",
    rating: 5,
    reviews: 200,
    stepLabel: "Full Ritual",
    sizeLabel: "5-piece set",
    subtitle: "Complete skincare routine for hyperpigmentation, dark spots, and glowing skin.",
    benefits: [
      "Everything you need for a full brightening routine",
      "Better value than buying each step separately",
      "Built for consistency and repeatable results",
    ],
    keyIngredients: ["Full routine blend", "Brightening botanicals", "Hydration support"],
    skinConcerns: ["Uneven tone", "Dullness", "Routine building"],
    useDirections: "Use as a complete morning and evening routine based on each step.",
    isBundle: true,
  },
};

export const catalogOrder = [
  "new-cleanser",
  "new-toner",
  "new-serum",
  "new-cream",
  "new-mask",
  "new-bundle",
] as const;

export const shopTrustBadges = [
  "Dermatologist-inspired",
  "Melanin-safe formulas",
  "No mercury or hydroquinone",
];

export const fallbackStoreProducts: StoreProduct[] = initialProducts.map((product) => {
  const discountPercentage =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return {
    id: product.id,
    catalogKey: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    in_stock: true,
    image: product.image,
    image_url: product.image,
    rating: product.rating,
    reviews: product.reviews,
    discount_percentage: discountPercentage,
    on_sale: discountPercentage > 0,
    ...productMarketing[product.id],
  };
});

export const canonicalProductsByKey = Object.fromEntries(
  fallbackStoreProducts.map((product) => [product.catalogKey, product]),
) as Record<string, StoreProduct>;

const isLegacyDropboxImage = (imageUrl?: string) =>
  Boolean(imageUrl && /dropbox(?:usercontent)?\.com/i.test(imageUrl));

const resolveCatalogImageUrl = (apiImageUrl?: string, canonicalImageUrl?: string) => {
  if (apiImageUrl && !isLegacyDropboxImage(apiImageUrl)) {
    return apiImageUrl;
  }

  return canonicalImageUrl || apiImageUrl;
};

export const getProductMarketingKey = (category?: string, name?: string, catalogKey?: string) => {
  if (catalogKey && canonicalProductsByKey[catalogKey]) {
    return catalogKey;
  }

  const normalizedCategory = (category || "").toLowerCase();
  const normalizedName = (name || "").toLowerCase();

  if (normalizedCategory.includes("cleanser")) return "new-cleanser";
  if (normalizedCategory.includes("toner")) return "new-toner";
  if (normalizedCategory.includes("serum")) return "new-serum";
  if (normalizedCategory.includes("cream")) return "new-cream";
  if (normalizedCategory.includes("mask")) return "new-mask";
  if (normalizedCategory.includes("bundle") || normalizedCategory.includes("kit")) return "new-bundle";

  if (normalizedName.includes("cleanser")) return "new-cleanser";
  if (normalizedName.includes("toner")) return "new-toner";
  if (normalizedName.includes("serum")) return "new-serum";
  if (normalizedName.includes("cream")) return "new-cream";
  if (normalizedName.includes("mask")) return "new-mask";
  if (normalizedName.includes("full product kit") || normalizedName.includes("bundle")) {
    return "new-bundle";
  }

  return null;
};

export const mapApiProduct = (product: ApiProduct): StoreProduct | null => {
  const productId = product._id ?? product.id;
  if (productId === undefined || productId === null) {
    return null;
  }

  const directKey = product.catalog_key || product.catalogKey || product.slug;
  const marketingKey = getProductMarketingKey(product.category, product.name, directKey);
  const canonicalProduct = marketingKey ? canonicalProductsByKey[marketingKey] : undefined;

  let kesPrice = canonicalProduct?.price ?? 0;
  if (typeof product.price === "number" && product.price > 0) {
    kesPrice = Math.round(product.price);
  } else if (typeof product.prices?.KES?.amount === "number" && product.prices.KES.amount > 0) {
    kesPrice = Math.round(product.prices.KES.amount);
  } else if (typeof product.base_price_usd === "number" && product.base_price_usd > 0) {
    kesPrice = Math.round(product.base_price_usd * 128.5);
  }

  const discountPercentage = Number(
    product.discount_percentage ?? canonicalProduct?.discount_percentage ?? 0,
  );
  const overlay = marketingKey ? productMarketing[marketingKey] ?? {} : {};
  const rawImage = product.image_url || product.image;
  const resolvedImageUrl = resolveCatalogImageUrl(rawImage, canonicalProduct?.image_url);

  return {
    ...canonicalProduct,
    ...overlay,
    id: String(productId),
    catalogKey: marketingKey || `product-${productId}`,
    name: product.name || canonicalProduct?.name || "Queen Koba Product",
    description:
      product.description !== undefined && product.description !== null && product.description !== ""
        ? product.description
        : (canonicalProduct?.description || ""),
    price: kesPrice,
    originalPrice: canonicalProduct?.originalPrice,
    in_stock: typeof product.in_stock === "boolean" ? product.in_stock : (canonicalProduct?.in_stock ?? true),
    image: resolvedImageUrl,
    image_url: resolvedImageUrl,
    rating: typeof product.rating === "number" ? product.rating : (canonicalProduct?.rating ?? 4.8),
    reviews: typeof product.reviews === "number" ? product.reviews : (canonicalProduct?.reviews ?? 0),
    discount_percentage: discountPercentage,
    on_sale: typeof product.on_sale === "boolean" ? product.on_sale : (discountPercentage > 0),
    isBundle: marketingKey === "new-bundle",
  };
};

export const orderCatalogProducts = (products: StoreProduct[]) => {
  const orderedCatalog = catalogOrder
    .map((key) => products.find((product) => product.catalogKey === key) ?? canonicalProductsByKey[key])
    .filter((product): product is StoreProduct => Boolean(product));

  const extraProducts = products.filter(
    (product) => !catalogOrder.includes(product.catalogKey as (typeof catalogOrder)[number]),
  );

  return [...orderedCatalog, ...extraProducts];
};

export const toCartProduct = (product: StoreProduct): Product => ({
  id: product.id,
  name: product.name,
  price: getEffectiveProductPrice(product),
  originalPrice: getCompareAtPrice(product) ?? undefined,
  rating: product.rating ?? 4.8,
  reviews: product.reviews ?? 0,
  description: product.description,
  image: product.image_url,
  isBundle: product.isBundle,
});

export const formatCurrency = (amount: number) => `KSh ${Math.round(amount).toLocaleString()}`;

export const getEffectiveProductPrice = (product: StoreProduct) => {
  if (product.originalPrice && product.originalPrice > product.price) {
    return product.price;
  }

  const discount = product.discount_percentage ?? 0;
  if (discount > 0) {
    return Math.round(product.price * (1 - discount / 100));
  }

  return product.price;
};

export const getCompareAtPrice = (product: StoreProduct) => {
  if (product.originalPrice && product.originalPrice > product.price) {
    return product.originalPrice;
  }

  const discount = product.discount_percentage ?? 0;
  if (discount > 0) {
    return product.price;
  }

  return null;
};
