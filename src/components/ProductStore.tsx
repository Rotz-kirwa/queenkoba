import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Star } from "lucide-react";
import AdaptiveImage from "@/components/AdaptiveImage";
import { useCart } from "@/context/CartContext";
import { useStoreProducts } from "@/hooks/use-products";
import {
  formatCurrency,
  getCompareAtPrice,
  getEffectiveProductPrice,
  shopTrustBadges,
  toCartProduct,
  type StoreProduct,
} from "@/lib/storefrontCatalog";

const BundleCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 11, minutes: 45 });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59 };
        if (prev.days > 0) return { days: prev.days - 1, hours: 23, minutes: 59 };
        return { days: 2, hours: 11, minutes: 45 };
      });
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mt-4 inline-flex items-center gap-3 rounded-sm border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-body uppercase tracking-[0.2em] text-primary">
      <span>Bundle Timer</span>
      <span>{String(timeLeft.days).padStart(2, "0")}d</span>
      <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
      <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
    </div>
  );
};

const ProductCard = ({ product, index }: { product: StoreProduct; index: number }) => {
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const price = product.price;
  const compareAtPrice = getCompareAtPrice(product);
  const displayPrice = getEffectiveProductPrice(product);
  const rating = product.rating || 4.5;
  const reviews = product.reviews || 0;
  const discount = product.discount_percentage || 0;

  const handleAddToCart = () => {
    addToCart(toCartProduct(product), qty);
    setQty(1);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="luxury-card relative flex flex-col overflow-hidden p-0"
    >
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap gap-2">
        {product.badges?.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-background/90 px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.2em] text-primary shadow-md backdrop-blur"
          >
            {badge}
          </span>
        ))}
        {product.on_sale && discount > 0 && (
          <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.2em] text-white shadow-md">
            {discount}% Off
          </span>
        )}
        {typeof product.stock_left === "number" && (
          <span className="rounded-full bg-black/75 px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.2em] text-white">
            Only {product.stock_left} left
          </span>
        )}
      </div>

      {product.image_url && (
        <Link to={`/shop/${product.catalogKey}`} className="block w-full overflow-hidden">
          <AdaptiveImage
            src={product.image_url}
            alt={`Queen Koba ${product.name}${product.subtitle ? ` - ${product.subtitle}` : ""}`}
            className="h-80 w-full object-cover md:h-[24rem] lg:h-[26rem]"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        </Link>
      )}

      <div className="flex flex-1 flex-col p-8">
        <Link to={`/shop/${product.catalogKey}`} className="transition-colors hover:text-primary">
          <h3 className="mb-2 font-display text-xl font-semibold md:text-2xl">{product.name}</h3>
        </Link>
        <p className="mb-4 whitespace-pre-line text-sm font-body leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {product.bundle_message && (
          <p className="mb-4 text-xs font-body uppercase tracking-[0.22em] text-primary">
            {product.bundle_message}
          </p>
        )}

        <div className="mb-4 flex items-center gap-2">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(rating) ? "fill-primary text-primary" : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-body text-muted-foreground">
            {rating}/5 ({reviews} reviews)
          </span>
        </div>

        {product.urgency_tag && (
          <p className="mb-4 text-xs font-body font-bold uppercase tracking-[0.24em] text-primary">
            {product.urgency_tag}
          </p>
        )}

        <Link
          to={`/shop/${product.catalogKey}`}
          className="mb-4 inline-flex items-center gap-2 text-xs font-body font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:text-primary/80"
        >
          View details
        </Link>

        {product.isBundle && <BundleCountdown />}

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border/50 pt-4">
          <div>
            {compareAtPrice ? (
              <div>
                <span className="mr-2 font-display text-lg text-muted-foreground line-through">
                  {formatCurrency(compareAtPrice)}
                </span>
                <span className="font-display text-2xl font-semibold text-red-600">
                  {formatCurrency(displayPrice)}
                </span>
              </div>
            ) : (
              <span className="font-display text-2xl font-semibold text-primary">
                {formatCurrency(displayPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-sm border border-border">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-3 text-sm font-body">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 rounded-sm bg-gold-gradient px-5 py-2.5 text-xs font-body font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
              disabled={!product.in_stock}
            >
              <ShoppingBag className="w-4 h-4" />
              {product.in_stock ? product.cta_label || "Add to Cart" : "Out of Stock"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProductStore = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { products, isLoading: loading } = useStoreProducts();

  return (
    <section id="shop" className="py-8 md:py-10 lg:py-12">
      <div className="container mx-auto px-4" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-8 text-center md:mb-10"
        >
          <p className="mb-4 font-body text-sm uppercase tracking-[0.3em] text-primary">
            The Collection
          </p>
          <h2 className="font-display text-4xl font-light md:text-5xl lg:text-6xl">
            Shop <span className="italic text-gold-gradient">Queen Koba</span>
          </h2>
        </motion.div>

        {loading ? (
          <div className="py-12 text-center">Loading products...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-8 rounded-sm border border-primary/20 bg-background px-6 py-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.06)] md:mt-10"
            >
              <p className="mx-auto max-w-4xl text-sm font-body leading-7 text-muted-foreground">
                Results vary; gentle and natural - patch test recommended. 100% toxin-free
                (no mercury, hydroquinone, steroids). Dermatologist-inspired for melanin-rich
                skin. Your safety is our promise.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {shopTrustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-primary/20 px-4 py-2 text-xs font-body font-bold uppercase tracking-[0.2em] text-primary"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProductStore;
