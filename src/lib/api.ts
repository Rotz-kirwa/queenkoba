import { normalizeApiUrl } from "@/lib/runtimeConfig";

const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
const LOCAL_API_RETRY_COOLDOWN_MS = 30000;
const CACHE_PREFIX = "qk-api-cache:";
let localApiUnavailableUntil = 0;

interface ApiRequestInit extends RequestInit {
  quietError?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
}

interface CachedApiPayload {
  expiresAt: number;
  data: unknown;
}

export const isApiOfflineError = (error: unknown) =>
  error instanceof Error &&
  (error.message === "Local API unavailable" || error.message === "Failed to fetch");

const buildEndpointWithQuery = (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>,
) => {
  if (!params) {
    return endpoint;
  }

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

const readCachedResponse = (cacheKey?: string, cacheTtlMs?: number) => {
  if (!cacheKey || !cacheTtlMs || typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as CachedApiPayload;
    if (payload.expiresAt < Date.now()) {
      localStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`);
      return null;
    }

    return payload.data;
  } catch {
    localStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`);
    return null;
  }
};

const writeCachedResponse = (cacheKey?: string, cacheTtlMs?: number, data?: unknown) => {
  if (!cacheKey || !cacheTtlMs || typeof window === "undefined") {
    return;
  }

  const payload: CachedApiPayload = {
    expiresAt: Date.now() + cacheTtlMs,
    data,
  };

  localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(payload));
};

// API client with error handling
const apiClient = async (endpoint: string, options: ApiRequestInit = {}) => {
  const token = localStorage.getItem('token');
  const { quietError = false, cacheKey, cacheTtlMs, ...requestOptions } = options;
  const now = Date.now();
  const isLocalApi = API_BASE_URL.includes('localhost:5000') || API_BASE_URL.includes('127.0.0.1:5000');
  const method = requestOptions.method?.toUpperCase() || "GET";
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...requestOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (isLocalApi && localApiUnavailableUntil > now) {
    throw new Error('Local API unavailable');
  }

  if (method === "GET") {
    const cached = readCachedResponse(cacheKey, cacheTtlMs);
    if (cached !== null) {
      return cached;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...requestOptions,
      headers,
    });

    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();
    const data = contentType.includes("application/json") && responseText
      ? JSON.parse(responseText)
      : responseText;

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && "error" in data
          ? String(data.error)
          : typeof data === "object" && data !== null && "message" in data
            ? String(data.message)
          : typeof data === "string" && data
              ? data
              : 'API request failed';
      const details =
        typeof data === "object" && data !== null && "details" in data && data.details
          ? String(data.details)
          : "";
      const combinedMessage = details ? `${message}: ${details}` : message;
      throw new Error(combinedMessage);
    }

    if (method === "GET") {
      writeCachedResponse(cacheKey, cacheTtlMs, data);
    }

    return data;
  } catch (error) {
    if (isLocalApi && error instanceof TypeError) {
      localApiUnavailableUntil = Date.now() + LOCAL_API_RETRY_COOLDOWN_MS;
    }
    if (!quietError) {
      console.error('API Error:', error);
    }
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: (userData: {
    username: string;
    email: string;
    password: string;
    country: string;
    preferred_currency?: string;
  }) => apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  login: (credentials: { email: string; password: string }) =>
    apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getProfile: () => apiClient('/auth/profile'),
};

// Products API
export const productsAPI = {
  getAll: (options?: { lite?: boolean; limit?: number; cacheTtlMs?: number; forceRefresh?: boolean }) => {
    if (options?.forceRefresh && typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(`${CACHE_PREFIX}products:`)) {
          localStorage.removeItem(key);
        }
      });
    }

    return apiClient(
      buildEndpointWithQuery('/products', {
        lite: options?.lite ? "true" : undefined,
        limit: options?.limit,
      }),
      {
        quietError: true,
        cacheKey: `products:${options?.lite ? "lite" : "full"}:${options?.limit ?? "all"}`,
        cacheTtlMs: options?.forceRefresh ? 0 : (options?.cacheTtlMs ?? 1000 * 30),
      },
    );
  },
  getById: (id: string) => apiClient(`/products/${id}`),
  invalidateCache: () => {
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(`${CACHE_PREFIX}products:`)) {
          localStorage.removeItem(key);
        }
      });
      window.dispatchEvent(new CustomEvent("qk-products-updated"));
    }
  },
};

// Cart API
export const cartAPI = {
  get: () => apiClient('/cart'),
  add: (productId: string, quantity: number) =>
    apiClient('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    }),
  update: (productId: string, quantity: number) =>
    apiClient(`/cart/update/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),
  remove: (productId: string) =>
    apiClient(`/cart/remove/${productId}`, { method: 'DELETE' }),
  clear: () =>
    apiClient('/cart/clear', { method: 'DELETE' }),
  applyPromoCode: (data: {
    code: string;
    items: Array<{ product_id: string; quantity: number }>;
    shipping_kes?: number;
    delivery?: {
      delivery_zone: string;
      county: string;
      area: string;
      delivery_point: string;
      method: string;
      shipping_fee: number;
      eta: string;
    };
  }) =>
    apiClient('/cart/apply-promocode', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removePromoCode: () =>
    apiClient('/cart/remove-promocode', { method: 'DELETE' }),
};

// Orders API
export const ordersAPI = {
  create: (orderData: Record<string, unknown>) =>
    apiClient('/checkout', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),
  getAll: () => apiClient('/orders'),
  getById: (id: string) => apiClient(`/orders/${id}`),
};

// Payment Methods API
export const paymentAPI = {
  getByCountry: (country: string) => apiClient(`/payment-methods/${country}`, { quietError: true }),
  getMpesaStatus: (
    orderId: string,
    verification?: { email?: string; phone?: string },
  ) =>
    apiClient(
      buildEndpointWithQuery(`/payments/mpesa/status/${orderId}`, {
        email: verification?.email,
        phone: verification?.phone,
      }),
      { quietError: true },
    ),
};

export const contentAPI = {
  getPublic: (options?: { lite?: boolean; cacheTtlMs?: number }) =>
    apiClient(
      buildEndpointWithQuery('/content', {
        lite: options?.lite ? "true" : undefined,
      }),
      {
        quietError: true,
        cacheKey: `content:${options?.lite ? "lite" : "full"}`,
        cacheTtlMs: options?.cacheTtlMs ?? 1000 * 60 * 10,
      },
    ),
};

export default {
  auth: authAPI,
  products: productsAPI,
  cart: cartAPI,
  orders: ordersAPI,
  payment: paymentAPI,
  content: contentAPI,
};
