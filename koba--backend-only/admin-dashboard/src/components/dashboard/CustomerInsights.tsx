import { Users, UserCheck, MapPin, TrendingUp } from 'lucide-react';

interface CustomerInsightsProps {
  newThisMonth: number;
  repeatCustomers: number;
  topCustomers: Array<{
    name: string;
    orders: number;
    spent: number;
  }>;
  locations: Array<{
    country: string;
    percentage: number;
  }>;
  className?: string;
}

export function CustomerInsights({
  newThisMonth,
  repeatCustomers,
  topCustomers,
  locations,
  className = ''
}: CustomerInsightsProps) {
  const safeRepeatCustomers = Number.isFinite(repeatCustomers) ? repeatCustomers : 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Customer Insights</h3>
        <Users className="w-5 h-5 text-gray-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-xl font-bold text-gray-900">{newThisMonth}</p>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Repeat Customers</p>
                <p className="text-xl font-bold text-gray-900">{safeRepeatCustomers}%</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Customers</h4>
          {topCustomers.length > 0 ? (
            <div className="space-y-2">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-600">{customer.orders} orders</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    KSh {Number(customer.spent || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500">
              Top customers will appear here once purchases start coming in.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Customer Locations</h4>
        {locations.length > 0 ? (
          <div className="space-y-2">
            {locations.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{location.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${location.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">
                    {location.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500">
            Customer location insights will appear here after more orders are placed.
          </div>
        )}
      </div>
    </div>
  );
}
