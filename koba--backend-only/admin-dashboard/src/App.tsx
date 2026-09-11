import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLayout from './components/layout/AdminLayout';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Promotions = lazy(() => import('./pages/Promotions'));
const Orders = lazy(() => import('./pages/Orders'));
const Customers = lazy(() => import('./pages/Customers'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Reviews = lazy(() =>
  import('./pages/OtherPages').then((module) => ({ default: module.Reviews })),
);
const Payments = lazy(() =>
  import('./pages/OtherPages').then((module) => ({ default: module.Payments })),
);
const Shipping = lazy(() =>
  import('./pages/OtherPages').then((module) => ({ default: module.Shipping })),
);
const Content = lazy(() =>
  import('./pages/OtherPages').then((module) => ({ default: module.Content })),
);
const Support = lazy(() =>
  import('./pages/OtherPages').then((module) => ({ default: module.Support })),
);
const Admins = lazy(() =>
  import('./pages/OtherPages').then((module) => ({ default: module.Admins })),
);
const Settings = lazy(() =>
  import('./pages/OtherPages').then((module) => ({ default: module.Settings })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function LoadingIndicator({ label, fullscreen = false }: { label: string; fullscreen?: boolean }) {
  return (
    <div
      className={
        fullscreen
          ? 'flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4'
          : 'flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6'
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B6F47]">
            Queen Koba Admin
          </p>
          <p className="mt-2 text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AdminPageLoader({ children, label }: { children: ReactNode; label: string }) {
  return <Suspense fallback={<LoadingIndicator label={label} />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  
  if (loading && !user) {
    return <LoadingIndicator label="Restoring your admin session..." fullscreen />;
  }

  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <AdminPageLoader label="Loading sign-in...">
                  <Login />
                </AdminPageLoader>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={
                  <AdminPageLoader label="Loading dashboard...">
                    <Dashboard />
                  </AdminPageLoader>
                }
              />
              <Route
                path="products"
                element={
                  <AdminPageLoader label="Loading products...">
                    <Products />
                  </AdminPageLoader>
                }
              />
              <Route
                path="inventory"
                element={
                  <AdminPageLoader label="Loading inventory...">
                    <Inventory />
                  </AdminPageLoader>
                }
              />
              <Route
                path="orders"
                element={
                  <AdminPageLoader label="Loading orders...">
                    <Orders />
                  </AdminPageLoader>
                }
              />
              <Route
                path="customers"
                element={
                  <AdminPageLoader label="Loading customers...">
                    <Customers />
                  </AdminPageLoader>
                }
              />
              <Route
                path="promotions"
                element={
                  <AdminPageLoader label="Loading promotions...">
                    <Promotions />
                  </AdminPageLoader>
                }
              />
              <Route
                path="reviews"
                element={
                  <AdminPageLoader label="Loading reviews...">
                    <Reviews />
                  </AdminPageLoader>
                }
              />
              <Route
                path="payments"
                element={
                  <AdminPageLoader label="Loading payments...">
                    <Payments />
                  </AdminPageLoader>
                }
              />
              <Route
                path="shipping"
                element={
                  <AdminPageLoader label="Loading shipping...">
                    <Shipping />
                  </AdminPageLoader>
                }
              />
              <Route
                path="content"
                element={
                  <AdminPageLoader label="Loading content...">
                    <Content />
                  </AdminPageLoader>
                }
              />
              <Route
                path="support"
                element={
                  <AdminPageLoader label="Loading support...">
                    <Support />
                  </AdminPageLoader>
                }
              />
              <Route
                path="admins"
                element={
                  <AdminPageLoader label="Loading admin controls...">
                    <Admins />
                  </AdminPageLoader>
                }
              />
              <Route
                path="settings"
                element={
                  <AdminPageLoader label="Loading settings...">
                    <Settings />
                  </AdminPageLoader>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/admin" />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
