import { useQuery } from '@tanstack/react-query';
import { Search, Mail, MapPin, ShoppingBag, Users, TrendingUp, Eye, X } from 'lucide-react';
import { api } from '../lib/api';
import { useState } from 'react';
import { formatNairobiDate } from '../lib/datetime';

function formatKes(value: number | null | undefined) {
  return `KSh ${(value || 0).toLocaleString()}`;
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState<any>(null);
  
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });

  const customers = data?.customers || [];
  const filteredCustomers = customers.filter((c: any) =>
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c: any) => c.orders?.length > 0).length;
  const totalRevenue = customers.reduce((sum: number, c: any) => sum + (c.total_spent || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-gray-900">Customers</h1>
        <p className="text-gray-500 mt-1">Manage your customer base</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Customers</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{totalCustomers}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active Customers</span>
            <ShoppingBag className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{activeCustomers}</p>
        </div>
        
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Revenue</span>
            <TrendingUp className="w-5 h-5 text-[#8B6F47]" />
          </div>
          <p className="text-3xl font-bold text-[#8B6F47]">{formatKes(totalRevenue)}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B6F47]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Country</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Orders</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Total Spent</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Joined</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer: any) => (
                  <tr key={customer._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#8B6F47] rounded-full flex items-center justify-center text-white font-semibold">
                          {customer.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium">{customer.username}</div>
                          <div className="text-xs text-gray-500">{customer.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {customer.phone || 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {customer.country}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        {customer.orders?.length || 0}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      {formatKes(customer.total_spent)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {formatNairobiDate(customer.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => setViewingCustomer(customer)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Customer Details</h2>
              <button onClick={() => setViewingCustomer(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-16 h-16 bg-[#8B6F47] rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {viewingCustomer.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{viewingCustomer.username}</h3>
                  <p className="text-sm text-gray-500">{viewingCustomer.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-semibold">{viewingCustomer.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Country</label>
                  <p className="font-semibold">{viewingCustomer.country}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Preferred Currency</label>
                  <p className="font-semibold">{viewingCustomer.preferred_currency || 'KES'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Total Orders</label>
                  <p className="font-semibold">{viewingCustomer.orders?.length || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Total Spent</label>
                  <p className="font-semibold text-[#8B6F47]">{formatKes(viewingCustomer.total_spent)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Member Since</label>
                  <p className="font-semibold">{formatNairobiDate(viewingCustomer.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Role</label>
                  <p className="font-semibold capitalize">{viewingCustomer.role}</p>
                </div>
              </div>

              {viewingCustomer.cart && viewingCustomer.cart.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Current Cart</h3>
                  <div className="space-y-2">
                    {viewingCustomer.cart.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">Product ID: {item.product_id}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
