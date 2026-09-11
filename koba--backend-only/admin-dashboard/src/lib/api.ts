const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('admin_token');

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return '';

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

const parseResponse = async (res: Response) => {
  const raw = await res.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await parseResponse(res);
  if (!res.ok) {
    if (typeof data === 'string') {
      throw new Error(data || 'Request failed');
    }

    throw new Error(data?.error || data?.message || 'Request failed');
  }

  return data;
};

export const api = {
  login: async (email: string, password: string) => {
    return request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  loginWithGoogle: async (credential: string) => {
    return request('/admin/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  },

  getCurrentAdmin: async () => {
    return request('/admin/auth/me');
  },

  getDashboardKPIs: async (days?: number) => {
    const query = buildQueryString({ days });
    return request(`/admin/dashboard/kpis${query ? `?${query}` : ''}`);
  },

  getAnalyticsOverview: async (days?: number) => {
    const query = buildQueryString({ days });
    return request(`/admin/analytics/overview${query ? `?${query}` : ''}`);
  },

  getActivityFeed: async (limit?: number) => {
    const query = buildQueryString({ limit });
    return request(`/admin/analytics/activity${query ? `?${query}` : ''}`);
  },

  getInventoryAnalytics: async () => {
    return request('/admin/analytics/inventory');
  },

  getCustomerAnalytics: async (days?: number) => {
    const query = buildQueryString({ days });
    return request(`/admin/analytics/customers${query ? `?${query}` : ''}`);
  },

  trackAnalyticsEvent: async (eventType: string, eventData: any, sessionId?: string) => {
    return request('/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, event_data: eventData, session_id: sessionId }),
    });
  },

  getProducts: async (params?: any) => {
    const query = buildQueryString(params);
    return request(`/admin/products${query ? `?${query}` : ''}`);
  },

  createProduct: async (data: any) => {
    return request('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProduct: async (id: string, data: any) => {
    return request(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteProduct: async (id: string) => {
    return request(`/admin/products/${id}`, {
      method: 'DELETE',
    });
  },

  getOrders: async (params?: any) => {
    const query = buildQueryString(params);
    return request(`/admin/orders${query ? `?${query}` : ''}`);
  },

  updateOrderStatus: async (id: string, status: string, note?: string) => {
    return request(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
  },

  getCustomers: async (params?: any) => {
    const query = buildQueryString(params);
    return request(`/admin/customers${query ? `?${query}` : ''}`);
  },

  getPromotions: async (params?: any) => {
    const query = buildQueryString(params);
    return request(`/admin/promotions${query ? `?${query}` : ''}`);
  },

  getPromotion: async (id: string) => {
    return request(`/admin/promotions/${id}`);
  },

  createPromotion: async (data: any) => {
    return request('/admin/promotions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePromotion: async (id: string, data: any) => {
    return request(`/admin/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updatePromotionStatus: async (id: string, status: 'active' | 'inactive') => {
    return request(`/admin/promotions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  deletePromotion: async (id: string) => {
    return request(`/admin/promotions/${id}`, {
      method: 'DELETE',
    });
  },

  generatePromotionCode: async (prefix: string, length = 8) => {
    return request('/admin/promotions/generate-random', {
      method: 'POST',
      body: JSON.stringify({ prefix, length }),
    });
  },
};
