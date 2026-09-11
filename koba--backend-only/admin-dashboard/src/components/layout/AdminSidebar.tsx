import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  Users, Tag, Star, CreditCard, Truck, FileText,
  Headphones, Shield, Settings
} from 'lucide-react';

const BRAND_LOGO_URL = "/queen-koba-logo.jpg";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: Warehouse, label: 'Inventory', path: '/admin/inventory' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: Tag, label: 'Promotions', path: '/admin/promotions' },
  { icon: Star, label: 'Reviews', path: '/admin/reviews' },
  { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
  { icon: Truck, label: 'Shipping', path: '/admin/shipping' },
  { icon: FileText, label: 'Content', path: '/admin/content' },
  { icon: Headphones, label: 'Support', path: '/admin/support' },
  { icon: Shield, label: 'Admins', path: '/admin/admins' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function AdminSidebar() {
  const location = useLocation();
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Filter menu items based on role
  const visibleMenuItems = menuItems.filter(item => {
    if (item.path === '/admin/admins') {
      return isSuperAdmin;
    }
    return true;
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <img 
          src={BRAND_LOGO_URL}
          alt="Queen Koba" 
          className="w-full h-auto rounded-lg mb-2"
        />
        <p className="text-xs text-gray-500 text-center">Admin Dashboard</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#8B6F47] text-white'
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
