import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

interface AdminUser {
  _id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  status?: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

const getStoredToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

const readStoredAdmin = () => {
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    localStorage.removeItem(ADMIN_USER_KEY);
    return null;
  }
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => readStoredAdmin());
  const [loading, setLoading] = useState(() => Boolean(getStoredToken() && !readStoredAdmin()));

  const persistSession = useCallback((token: string, nextUser: AdminUser) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    window.google?.accounts?.id.disableAutoSelect();
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const token = getStoredToken();
      const storedUser = readStoredAdmin();

      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (storedUser) {
        if (!cancelled) {
          setUser(storedUser);
          setLoading(false);
        }
      } else if (!cancelled) {
        setLoading(true);
      }

      try {
        const response = await api.getCurrentAdmin();
        if (!cancelled) {
          const nextUser = response?.user as AdminUser | undefined;
          if (!nextUser) {
            throw new Error('Admin session response was missing the user');
          }
          localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(nextUser));
          setUser(nextUser);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    persistSession(data.token, data.user);
  }, [persistSession]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const data = await api.loginWithGoogle(credential);
    persistSession(data.token, data.user);
  }, [persistSession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions.includes(permission);
  }, [user]);

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, hasPermission }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
