import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AdaptiveImage from "@/components/AdaptiveImage";
import { productSeoByKey } from "@/data/seoContent";
import { useStoreProducts } from "@/hooks/use-products";
import {
  formatCurrency,
  getCompareAtPrice,
  getEffectiveProductPrice,
  type StoreProduct,
} from "@/lib/storefrontCatalog";

interface ProductRecommendationsProps {
  title: string;
  description?: string;
  productKeys: string[];
}

const ProductRecommendations = ({
  title,
  description,
  productKeys,
}: ProductRecommendationsProps) => {
  const { getProduct } = useStoreProducts();

  const products = productKeys
    .map((key) => getProduct(key))
    .filter((product): product is StoreProduct => Boolean(product));

  if (products.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.28em] text-primary">Recommended Products</p>
        <h2 className="mt-4 font-display text-3xl font-light md:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{description}</p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const displayPrice = getEffectiveProductPrice(product);
          const compareAtPrice = getCompareAtPrice(product);

          return (
            <article
              key={product.catalogKey}
              className="relative flex flex-col overflow-hidden rounded-[26px] border border-border/70 bg-card shadow-[0_16px_36px_rgba(24,17,8,0.08)] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                {!product.in_stock && (
                  <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">
                    Out of Stock
                  </span>
                )}
                {product.on_sale && Boolean(product.discount_percentage) && (
                  <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md">
                    {product.discount_percentage}% Off
                  </span>
                )}
              </div>

              <Link to={`/shop/${product.catalogKey}`} className="block overflow-hidden">
                {product.image_url ? (
                  <AdaptiveImage
                    src={product.image_url}
                    alt={productSeoByKey[product.catalogKey]?.imageAlt ?? `Queen Koba ${product.name}`}
                    className="aspect-[4/4.2] w-full object-cover object-center transition-transform duration-500 hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                ) : (
                  <div className="aspect-[4/4.2] w-full bg-secondary/30" />
                )}
              </Link>

              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                  {product.stepLabel || "Queen Koba"}
                </p>
                <Link to={`/shop/${product.catalogKey}`} className="transition-colors hover:text-primary">
                  <h3 className="mt-3 font-display text-2xl font-light text-foreground">{product.name}</h3>
                </Link>
                <p className="mt-3 line-clamp-2 text-sm leading-7 text-muted-foreground">
                  {product.description || product.subtitle}
                </p>
                <div className="mt-auto pt-5 flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl text-primary">
                      {formatCurrency(displayPrice)}
                    </span>
                    {product.on_sale && compareAtPrice && compareAtPrice > displayPrice ? (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(compareAtPrice)}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    to={`/shop/${product.catalogKey}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:text-primary/80"
                  >
                    View product
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ProductRecommendations;
