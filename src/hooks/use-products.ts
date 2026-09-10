import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsAPI } from "@/lib/api";
import {
  canonicalProductsByKey,
  fallbackStoreProducts,
  mapApiProduct,
  orderCatalogProducts,
  type StoreProduct,
} from "@/lib/storefrontCatalog";

export const PRODUCTS_QUERY_KEY = ["storefront-products"] as const;

export const useStoreProducts = () => {
  const queryClient = useQueryClient();

  const {
    data: products = fallbackStoreProducts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: async () => {
      try {
        const data = await productsAPI.getAll();
        if (Array.isArray(data?.products) && data.products.length > 0) {
          const mapped = data.products
            .map(mapApiProduct)
            .filter((p): p is StoreProduct => p !== null);

          if (mapped.length > 0) {
            return orderCatalogProducts(mapped);
          }
        }
        return fallbackStoreProducts;
      } catch (err) {
        console.warn("Failed to fetch products from backend, using fallback store catalog", err);
        return fallbackStoreProducts;
      }
    },
    staleTime: 1000 * 15, // 15 seconds stale time for fresh responsiveness
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Cross-tab and intra-app synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "qk_admin_product_updated" ||
        (e.key && e.key.includes("products"))
      ) {
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      }
    };

    const handleCustomUpdate = () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("qk-products-updated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("qk-products-updated", handleCustomUpdate);
    };
  }, [queryClient]);

  const productsByKey = useMemo(() => {
    const map: Record<string, StoreProduct> = { ...canonicalProductsByKey };
    products.forEach((prod) => {
      if (prod.catalogKey) {
        map[prod.catalogKey] = prod;
      }
      if (prod.id) {
        map[prod.id] = prod;
      }
    });
    return map;
  }, [products]);

  const getProduct = useCallback(
    (keyOrId: string): StoreProduct | undefined => {
      return productsByKey[keyOrId] || canonicalProductsByKey[keyOrId];
    },
    [productsByKey],
  );

  const invalidateProducts = useCallback(async () => {
    productsAPI.invalidateCache();
    await queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
  }, [queryClient]);

  return {
    products,
    productsByKey,
    getProduct,
    isLoading,
    isError,
    refetch,
    invalidateProducts,
  };
};

export default useStoreProducts;
