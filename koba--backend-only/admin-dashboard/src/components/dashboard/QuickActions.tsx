import { Plus, Eye, Download, Users, BarChart3, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  className?: string;
  onExportReport?: () => void;
}

export function QuickActions({ className = '', onExportReport }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      key: 'add-product',
      icon: Plus,
      label: 'Add Product',
      description: 'Create new product',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      onClick: () => navigate('/admin/products?action=new'),
    },
    {
      key: 'view-orders',
      icon: Eye,
      label: 'View Orders',
      description: 'Manage orders',
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      onClick: () => navigate('/admin/orders'),
    },
    {
      key: 'export-report',
      icon: Download,
      label: 'Export Report',
      description: 'Download analytics',
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      onClick: onExportReport,
    },
    {
      key: 'manage-customers',
      icon: Users,
      label: 'Manage Customers',
      description: 'Customer database',
      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      onClick: () => navigate('/admin/customers'),
    },
    {
      key: 'view-analytics',
      icon: BarChart3,
      label: 'View Analytics',
      description: 'Detailed reports',
      color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      onClick: () => navigate('/admin?focus=analytics'),
    },
    {
      key: 'settings',
      icon: Settings,
      label: 'Settings',
      description: 'Store configuration',
      color: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
      onClick: () => navigate('/admin/settings'),
    },
  ];

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => action.onClick?.()}
            disabled={action.key === 'export-report' && !onExportReport}
            className={`p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-all text-left group ${action.color}`}
          >
            <action.icon className="w-6 h-6 mb-2" />
            <div>
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs opacity-75 mt-1">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
