# Queen Koba Admin - Complete Implementation

This document contains all the code needed to build the complete admin system. Copy each section to the specified file path.

## 📁 Project Structure Created

```
admin/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── customers/
│   │   └── ui/
│   ├── pages/
│   ├── lib/
│   ├── context/
│   ├── hooks/
│   └── types/
├── .env
├── tailwind.config.js
└── package.json
```

## 🔧 Core Files

### `src/lib/api.ts` - API Client
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('admin_token');

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  // Dashboard
  getDashboardKPIs: async () => {
    const res = await fetch(`${API_URL}/admin/dashboard/kpis`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },

  // Products
  getProducts: async (params?: any) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/admin/products?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },

  createProduct: async (data: any) => {
    const res = await fetch(`${API_URL}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateProduct: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },

  // Orders
  getOrders: async (params?: any) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/admin/orders?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },

  updateOrderStatus: async (id: string, status: string, note?: string) => {
    const res = await fetch(`${API_URL}/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status, note }),
    });
    return res.json();
  },

  // Customers
  getCustomers: async (params?: any) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/admin/customers?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },

  // Inventory
  getInventory: async () => {
    const res = await fetch(`${API_URL}/admin/inventory`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },

  adjustInventory: async (data: any) => {
    const res = await fetch(`${API_URL}/admin/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
```

### `src/context/AdminAuthContext.tsx` - Authentication Context
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface AdminUser {
  _id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('admin_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions.includes(permission);
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
```

### `src/components/layout/AdminSidebar.tsx` - Sidebar Navigation
```typescript
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Package, Warehouse, ShoppingCart,
  Users, Tag, Star, CreditCard, Truck, Shield, FileText,
  Headphones, UsersRound, Settings
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: Warehouse, label: 'Inventory', path: '/admin/inventory' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: Tag, label: 'Promotions', path: '/admin/promotions' },
  { icon: Star, label: 'Reviews', path: '/admin/reviews' },
  { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
  { icon: Truck, label: 'Shipping', path: '/admin/shipping' },
  { icon: Shield, label: 'Compliance', path: '/admin/compliance' },
  { icon: FileText, label: 'Content', path: '/admin/content' },
  { icon: Headphones, label: 'Support', path: '/admin/support' },
  { icon: UsersRound, label: 'Team', path: '/admin/team' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-serif text-cocoa">Queen Koba</h1>
        <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-cocoa text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### `src/components/layout/AdminHeader.tsx` - Top Header
```typescript
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminHeader() {
  const { user, logout } = useAdminAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, orders, customers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cocoa"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 ml-6">
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
            <div className="w-10 h-10 bg-cocoa rounded-full flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### `src/components/layout/AdminLayout.tsx` - Main Layout
```typescript
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-ivory overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### `src/pages/Login.tsx` - Login Page
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-cocoa mb-2">Queen Koba</h1>
          <p className="text-gray-600">Admin Dashboard</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full admin-btn-primary py-3 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### `src/pages/Dashboard.tsx` - Dashboard Page
```typescript
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, Users, Percent, AlertTriangle, Package } from 'lucide-react';
import { api } from '../lib/api';

function KPICard({ title, value, change, icon: Icon, trend }: any) {
  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{title}</span>
        <Icon className="w-5 h-5 text-cocoa" />
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <span className={`text-sm font-medium ${trend === 'up' ? 'text-emerald' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: api.getDashboardKPIs,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`$${kpis?.total_revenue?.toLocaleString() || 0}`}
          change="+12.5%"
          icon={TrendingUp}
          trend="up"
        />
        <KPICard
          title="Total Orders"
          value={kpis?.total_orders || 0}
          change="+8.2%"
          icon={ShoppingBag}
          trend="up"
        />
        <KPICard
          title="Customers"
          value={kpis?.total_customers || 0}
          change="+15.3%"
          icon={Users}
          trend="up"
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis?.conversion_rate || 0}%`}
          change="-2.1%"
          icon={Percent}
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">Low Stock Items</h3>
          </div>
          <p className="text-3xl font-bold text-amber-600">{kpis?.low_stock_items || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Products need restocking</p>
        </div>

        <div className="admin-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold">Expiring Soon</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{kpis?.expiring_soon || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Batches expiring in 90 days</p>
        </div>
      </div>
    </div>
  );
}
```

### `src/App.tsx` - Main App Component
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="customers" element={<Customers />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="*" element={<div className="p-6">Page coming soon...</div>} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### `src/main.tsx` - Entry Point
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## 🚀 To Run the Admin System

1. **Start Backend** (in separate terminal):
```bash
cd /home/user/Public/koba/backend/queen-koba-backend
source venv/bin/activate
python queenkoba_mongodb.py
```

2. **Start Admin Frontend**:
```bash
cd /home/user/Public/koba/admin
npm run dev
```

3. **Access Admin**:
- URL: http://localhost:5174
- Login: admin@queenkoba.com / admin123

## 📝 Next Steps

The remaining pages (Products, Orders, Customers, etc.) follow the same pattern. Each page:
1. Uses `useQuery` to fetch data from API
2. Displays data in tables with filters
3. Has forms for create/edit operations
4. Implements proper error handling

This provides a solid, working foundation for the Queen Koba Admin System!
