import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
} from "lucide-react";
import AdaptiveImage from "@/components/AdaptiveImage";
import SEO from "@/components/SEO";
import FaqSection from "@/components/seo/FaqSection";
import ResourceGrid from "@/components/seo/ResourceGrid";
import { useCart } from "@/context/CartContext";
import { findBlogPostsBySlugs, homeConcernCards, type LinkCard } from "@/data/siteSeo";
import { productSeoByKey } from "@/data/seoContent";
import { defaultKenyaDeliveryZone } from "@/data/kenyaDelivery";
import { useStoreProducts } from "@/hooks/use-products";
import {
  formatCurrency,
  getCompareAtPrice,
  getEffectiveProductPrice,
  shopTrustBadges,
  toCartProduct,
  type StoreProduct,
} from "@/lib/storefrontCatalog";
import { useToast } from "@/hooks/use-toast";

const productConcernLinkMap: Record<string, string[]> = {
  "new-cleanser": ["/skincare-products-kenya", "/african-botanical-skincare"],
  "new-toner": ["/dark-spots-treatment", "/skincare-products-kenya"],
  "new-serum": ["/hyperpigmentation-treatment", "/dark-spots-treatment"],
  "new-cream": ["/skincare-for-melanin-skin", "/african-botanical-skincare"],
  "new-mask": ["/african-botanical-skincare", "/skincare-products-kenya"],
  "new-bundle": ["/hyperpigmentation-treatment", "/skincare-products-kenya"],
};

const ProductDetail = () => {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { products, isLoading: loading } = useStoreProducts();
  const [quantity, setQuantity] = useState(1);

  const product = useMemo(
    () =>
      products.find((item) => item.catalogKey === productId || item.id === productId) ??
      fallbackStoreProducts.find((item) => item.catalogKey === productId || item.id === productId) ??
      null,
    [productId, products],
  );

  const relatedProducts = useMemo(
    () => products.filter((item) => item.catalogKey !== product?.catalogKey).slice(0, 3),
    [product?.catalogKey, products],
  );

  if (loading && !product) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] pb-16 pt-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
            <div className="aspect-[4/4.5] rounded-[32px] bg-secondary/30" />
            <div className="rounded-[32px] bg-white p-8">
              <div className="h-4 w-24 rounded-full bg-secondary/35" />
              <div className="mt-4 h-10 w-4/5 rounded-full bg-secondary/35" />
              <div className="mt-4 h-5 w-full rounded-full bg-secondary/25" />
              <div className="mt-2 h-5 w-5/6 rounded-full bg-secondary/25" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] pb-16 pt-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl text-foreground">Product not found</h1>
          <p className="mt-4 text-muted-foreground">
            The product you requested is unavailable right now.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-body font-bold uppercase tracking-[0.16em] text-primary-foreground"
          >
            Back to Shop
          </Link>
        </div>
      </main>
    );
  }

  const rating = product.rating ?? 4.8;
  const reviews = product.reviews ?? 0;
  const displayPrice = getEffectiveProductPrice(product);
  const compareAtPrice = getCompareAtPrice(product);
  const seoContent = productSeoByKey[product.catalogKey];
  const seoTitle = seoContent?.seoTitle ?? product.name;
  const seoDescription = seoContent?.metaDescription ?? product.subtitle ?? product.description;
  const seoKeywords = seoContent?.keywords ?? [
    `Queen Koba ${product.name}`,
    "melanin skincare Kenya",
    product.stepLabel || "skincare",
  ];
  const siteUrl = import.meta.env.VITE_SITE_URL?.trim() || "https://queenkoba.com";
  const productImageUrl = product.image_url ? new URL(product.image_url, siteUrl).toString() : undefined;

  const handleAddToCart = () => {
    addToCart(toCartProduct(product), quantity);
    toast({
      title: "Added to bag",
      description: `${quantity} × ${product.name} added to your cart.`,
    });
  };

  const relatedGuides = findBlogPostsBySlugs(seoContent?.relatedArticleSlugs ?? []).map<LinkCard>((post) => ({
    eyebrow: "Related Guide",
    title: post.title,
    description: post.excerpt,
    to: post.path,
    ctaLabel: "Read guide",
  }));
  const concernPageLinks = homeConcernCards
    .filter((card) => (productConcernLinkMap[product.catalogKey] ?? []).includes(card.to))
    .map<LinkCard>((card) => ({
      ...card,
      eyebrow: "Concern Guide",
      ctaLabel: card.ctaLabel || "Explore guide",
    }));
  const resourceItems = [...concernPageLinks, ...relatedGuides].slice(0, 6);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: seoContent?.searchHeading ?? product.name,
      description: seoDescription,
      image: productImageUrl ? [productImageUrl] : undefined,
      url: `https://queenkoba.com/shop/${product.catalogKey}`,
      sku: product.catalogKey,
      category: product.stepLabel || "Skincare",
      keywords: seoKeywords.join(", "),
      brand: { "@type": "Brand", name: "Queen Koba" },
      seller: { "@type": "Organization", name: "Queen Koba" },
      aggregateRating:
        reviews > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: rating.toFixed(1),
              reviewCount: reviews,
            }
          : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "KES",
        price: displayPrice,
        availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://queenkoba.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Shop",
          item: "https://queenkoba.com/shop",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: seoContent?.searchHeading ?? product.name,
          item: `https://queenkoba.com/shop/${product.catalogKey}`,
        },
      ],
    },
    ...(seoContent?.faqs?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: seoContent.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-[#f8f5ef] pb-16 pt-24">
      <SEO
        title={seoTitle}
        description={seoDescription}
        path={`/shop/${product.catalogKey}`}
        image={productImageUrl}
        imageAlt={seoContent?.imageAlt ?? product.name}
        keywords={seoKeywords.join(", ")}
        structuredData={structuredData}
      />

      <div className="container mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-6 text-xs font-body uppercase tracking-[0.22em] text-primary/70">
          <Link to="/shop" className="hover:text-primary">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span>{product.stepLabel || "Product"}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:gap-10">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-[0_24px_55px_rgba(45,30,12,0.07)]">
              {product.image_url && (
                <AdaptiveImage
                  src={product.image_url}
                  alt={seoContent?.imageAlt ?? product.name}
                  className="aspect-[4/4.65] w-full object-cover object-center"
                  highPriority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(product.benefits || []).slice(0, 3).map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-[24px] border border-[#eadfce] bg-white px-5 py-5 text-sm leading-7 text-foreground/80 shadow-[0_14px_30px_rgba(45,30,12,0.04)]"
                >
                  <div className="mb-3 inline-flex rounded-full bg-primary/7 px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.2em] text-primary">
                    Benefit
                  </div>
                  {benefit}
                </div>
              ))}
            </div>

            <div className="rounded-[32px] border border-[#eadfce] bg-white p-6 shadow-[0_18px_38px_rgba(45,30,12,0.05)] md:p-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.95fr)]">
                <div>
                  <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Why this product matters
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-light text-foreground md:text-4xl">
                    How this {seoContent?.searchHeading?.toLowerCase() ?? product.name.toLowerCase()} fits a complete Queen Koba routine
                  </h2>
                  <div className="mt-4 space-y-4 text-sm leading-8 text-foreground/80">
                    <p>
                      Shoppers searching for {seoKeywords.slice(0, 2).join(" and ")} usually need a
                      product that solves a specific problem without making the rest of the routine more
                      confusing. This step is built to do a clear job in the ritual, then work smoothly
                      with the supporting cleanser, toner, moisturizer, and weekly reset mask around it.
                    </p>
                    <p>
                      That is what makes the product page commercially important. It is not just a price
                      tag. It explains who the product is for, how it supports visible skin goals, and
                      what kind of routine consistency gives shoppers the best chance of seeing progress.
                    </p>
                  </div>
                </div>

                <aside className="rounded-[24px] bg-[#fbf5ec] px-5 py-5">
                  <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Best used when you want to
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground/80">
                    {(product.skinConcerns || []).map((concern) => (
                      <li key={concern} className="flex items-start gap-3">
                        <Check className="mt-1 h-4 w-4 text-primary" />
                        <span>Support {concern.toLowerCase()} with a more intentional routine.</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#eadfce] bg-white p-6 shadow-[0_18px_38px_rgba(45,30,12,0.05)] md:p-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Key Ingredients
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(product.keyIngredients || []).map((ingredient) => (
                      <span
                        key={ingredient}
                        className="rounded-full border border-primary/12 bg-primary/5 px-3 py-1.5 text-sm text-foreground/80"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Best For
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground/80">
                    {(product.skinConcerns || []).map((concern) => (
                      <li key={concern} className="flex items-start gap-3">
                        <Check className="mt-1 h-4 w-4 text-primary" />
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {product.useDirections && (
                <div className="mt-8 rounded-[24px] bg-[#fbf5ec] px-5 py-5">
                  <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-primary/80">
                    How To Use
                  </p>
                  <p className="mt-3 text-sm leading-7 text-foreground/80">{product.useDirections}</p>
                </div>
              )}
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[34px] border border-[#eadfce] bg-white p-6 shadow-[0_24px_60px_rgba(45,30,12,0.08)] md:p-8">
              <div className="flex flex-wrap gap-2">
                {product.badges?.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.2em] text-primary"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <p className="mt-5 text-xs font-body font-semibold uppercase tracking-[0.26em] text-primary/75">
                {product.stepLabel || "Queen Koba"} {product.sizeLabel ? `· ${product.sizeLabel}` : ""}
              </p>
              {seoContent?.searchHeading && seoContent.searchHeading !== product.name && (
                <p className="mt-4 text-xs font-body font-semibold uppercase tracking-[0.22em] text-primary/70">
                  {product.name}
                </p>
              )}
              <h1 className="mt-4 font-display text-4xl leading-tight text-foreground md:text-[3.1rem]">
                {seoContent?.searchHeading ?? product.name}
              </h1>
              <p className="mt-4 text-base leading-8 text-foreground/78">
                {seoContent?.searchSummary ?? product.subtitle ?? product.description}
              </p>
              {seoContent?.focusPhrases?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {seoContent.focusPhrases.map((phrase) => (
                    <span
                      key={phrase}
                      className="rounded-full border border-primary/12 bg-primary/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground/75"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`h-4 w-4 ${
                      idx < Math.floor(rating) ? "fill-primary text-primary" : "text-primary/20"
                    }`}
                  />
                ))}
                <span className="text-sm text-muted-foreground">
                  {rating.toFixed(1)} rating · {reviews} reviews
                </span>
              </div>

              <div className="mt-7 rounded-[28px] border border-[#eadfce] bg-[#fff9f0] px-5 py-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-body uppercase tracking-[0.18em] text-primary/75">
                      One-time purchase
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-3">
                      <span className="font-display text-4xl text-primary">
                        {formatCurrency(displayPrice)}
                      </span>
                      {compareAtPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          {formatCurrency(compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-xs font-body uppercase tracking-[0.16em] text-muted-foreground">
                    {defaultKenyaDeliveryZone.eta}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-sm font-body text-foreground/80">Quantity</span>
                  <div className="flex items-center rounded-full border border-[#dac9b0] bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-body">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!product.in_stock}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-4 text-sm font-body font-bold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {product.in_stock ? "Add to Bag" : "Out of Stock"}
                </button>

                <Link
                  to="/cart"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#dac9b0] px-6 py-4 text-sm font-body font-semibold text-foreground transition-colors hover:bg-white"
                >
                  View Bag
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 space-y-3 rounded-[28px] border border-[#eadfce] bg-[#fbf7f1] px-5 py-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-sm leading-7 text-foreground/80">
                    Secure checkout, Kenya delivery support, and a cleaner step-by-step cart flow are
                    now part of the upgraded storefront direction.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {shopTrustBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-primary/12 bg-white px-3 py-1.5 text-[11px] text-foreground/75"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-14 rounded-[34px] border border-[#eadfce] bg-white p-6 shadow-[0_20px_46px_rgba(45,30,12,0.05)] md:p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Pair It With
                </p>
                <h2 className="mt-2 font-display text-3xl text-foreground">Complete the routine</h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-sm font-body font-semibold text-primary"
              >
                Browse collection
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {relatedProducts.map((item) => (
                <Link
                  key={item.catalogKey}
                  to={`/shop/${item.catalogKey}`}
                  className="group overflow-hidden rounded-[26px] border border-[#eadfce] bg-[#fdfaf5] transition-transform hover:-translate-y-1"
                >
                  {item.image_url && (
                    <AdaptiveImage
                      src={item.image_url}
                      alt={productSeoByKey[item.catalogKey]?.imageAlt ?? item.name}
                      className="aspect-[4/3.9] w-full object-cover object-center"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  )}
                  <div className="p-5">
                    <p className="text-[11px] font-body uppercase tracking-[0.2em] text-primary/75">
                      {item.stepLabel}
                    </p>
                    <h3 className="mt-2 font-display text-2xl leading-tight text-foreground">
                      {item.name}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {item.subtitle || item.description}
                    </p>
                    <p className="mt-4 font-display text-2xl text-primary">{formatCurrency(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-14 space-y-12">
          <FaqSection
            title={`FAQs about ${product.name}`}
            intro="These answers help shoppers understand who the product is for, how it fits the routine, and what problem it solves."
            faqs={seoContent?.faqs ?? []}
          />
          <ResourceGrid
            title="Learn more before you buy"
            intro="These educational guides support the same concern as this product and strengthen the path from research to conversion."
            items={resourceItems}
          />
        </div>
      </div>
    </main>
  );
};

export default ProductDetail;
