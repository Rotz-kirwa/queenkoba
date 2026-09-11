import {
  ShoppingBag,
  User,
  CreditCard,
  AlertTriangle,
  Truck,
  Package,
  Info
} from 'lucide-react';

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  status: string;
  icon: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
  onViewAll?: () => void;
}

const iconMap = {
  ShoppingBag,
  User,
  CreditCard,
  AlertTriangle,
  Truck,
  Package,
};

const statusColors: Record<string, string> = {
  success: 'text-green-600 bg-green-50',
  warning: 'text-amber-600 bg-amber-50',
  info: 'text-blue-600 bg-blue-50',
  error: 'text-red-600 bg-red-50',
};

export function ActivityFeed({ activities, className = '', onViewAll }: ActivityFeedProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <span className="text-sm text-gray-500">Live feed</span>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activities.map((activity) => {
            const IconComponent = iconMap[activity.icon as keyof typeof iconMap] || Info;

            return (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-full ${statusColors[activity.status] || statusColors.info}`}>
                  <IconComponent className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>

                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-400' :
                  activity.status === 'warning' ? 'bg-amber-400' :
                  activity.status === 'error' ? 'bg-red-400' : 'bg-blue-400'
                }`} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500">
          Activity will appear here as orders, payments, and customer signups come in.
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onViewAll}
          disabled={!onViewAll}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          View all activity →
        </button>
      </div>
    </div>
  );
}
