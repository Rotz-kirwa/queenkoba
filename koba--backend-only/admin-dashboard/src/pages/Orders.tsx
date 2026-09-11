import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  CreditCard,
  Eye,
  MapPin,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatNairobiDate, formatNairobiDateTime } from '../lib/datetime';

type OrderItem = {
  product_name?: string;
  quantity?: number;
  item_total_kes?: number;
  price_per_item_kes?: number;
};

type AdminOrder = {
  _id: string;
  order_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  items?: OrderItem[];
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  payment_phone?: string | null;
  paid_at?: string | null;
  transaction_date?: string | null;
  order_status?: string | null;
  subtotal_kes?: number;
  shipping_kes?: number;
  discount_amount?: number;
  shipping_discount?: number;
  grand_total_kes?: number;
  promo_code?: string | null;
  delivery_zone?: string | null;
  delivery_zone_code?: string | null;
  county?: string | null;
  area?: string | null;
  delivery_point?: string | null;
  delivery_method?: string | null;
  delivery_eta?: string | null;
  shipping_address?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    county?: string;
    area?: string;
    delivery_zone?: string;
    delivery_zone_code?: string;
    delivery_point?: string;
    delivery_method?: string;
    delivery_eta?: string;
  };
  payment_details?: {
    phone_number?: string;
    bank_name?: string;
    type?: string;
  };
  events?: Array<{
    created_at?: string;
    actor?: string;
    category?: string;
    type?: string;
    message?: string;
  }>;
  created_at: string;
  updated_at?: string | null;
};

const formatKes = (amount?: number) => `KSh ${Number(amount || 0).toLocaleString()}`;

const orderStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
  payment_failed: 'bg-rose-100 text-rose-800',
};

const paymentStatusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  initiated: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-rose-100 text-rose-800',
};

const formatPaymentMethod = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'N/A';
  if (normalized === 'mpesa') return 'M-Pesa';
  if (normalized.includes('airtel')) return 'Airtel Money';
  if (normalized.includes('card')) return 'Card Payment';
  if (normalized.includes('bank')) return 'Bank Transfer';
  return value as string;
};

const formatDeliveryMethod = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'door') return 'Door Delivery';
  if (normalized === 'pickup') return 'Pickup Station';
  return value || 'N/A';
};

const getItemCount = (items?: OrderItem[]) =>
  (items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

export default function Orders() {
  const [search, setSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [deliveryZoneFilter, setDeliveryZoneFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [viewingOrder, setViewingOrder] = useState<AdminOrder | null>(null);
  const queryClient = useQueryClient();

  const queryParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
      delivery_zone: deliveryZoneFilter !== 'all' ? deliveryZoneFilter : undefined,
      order_status: orderStatusFilter !== 'all' ? orderStatusFilter : undefined,
      payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
      limit: 200,
    }),
    [deliveryZoneFilter, orderStatusFilter, paymentMethodFilter, paymentStatusFilter, search],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: () => api.getOrders(queryParams),
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const orders = (data?.orders || []) as AdminOrder[];
  const totalRevenue = orders
    .filter((order) => order.payment_status === 'paid')
    .reduce((sum, order) => sum + Number(order.grand_total_kes || 0), 0);
  const paidOrders = orders.filter((order) => order.payment_status === 'paid').length;
  const pendingPaymentOrders = orders.filter((order) =>
    ['pending', 'initiated'].includes(String(order.payment_status || '').toLowerCase()),
  ).length;
  const processingOrders = orders.filter((order) =>
    ['pending', 'processing', 'shipped'].includes(String(order.order_status || '').toLowerCase()),
  ).length;

  const handleStatusUpdate = (orderId: string, status: string) => {
    updateStatusMutation.mutate({ id: orderId, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-gray-900">Orders</h1>
          <p className="mt-1 text-gray-500">
            Track paid orders, delivery details, and customer contact information in one place.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Orders Shown</span>
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
        </div>

        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Paid Orders</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{paidOrders}</p>
        </div>

        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Pending Payment</span>
            <Wallet className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{pendingPaymentOrders}</p>
        </div>

        <div className="admin-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">Revenue</span>
            <ShieldCheck className="h-5 w-5 text-[#8B6F47]" />
          </div>
          <p className="text-3xl font-bold text-[#8B6F47]">{formatKes(totalRevenue)}</p>
        </div>
      </div>

      <div className="admin-card p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, name, phone, email, or payment reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#8B6F47]"
            />
          </div>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8B6F47]"
          >
            <option value="all">All Payment States</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Pending</option>
            <option value="initiated">Initiated</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={deliveryZoneFilter}
            onChange={(e) => setDeliveryZoneFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8B6F47]"
          >
            <option value="all">All Delivery Zones</option>
            <option value="nairobi">Within Nairobi</option>
            <option value="outside_nairobi">Outside Nairobi</option>
          </select>

          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8B6F47]"
          >
            <option value="all">All Order Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="payment_failed">Payment Failed</option>
          </select>

          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8B6F47]"
          >
            <option value="all">All Payment Methods</option>
            <option value="mpesa">M-Pesa</option>
            <option value="card">Card</option>
            <option value="airtel">Airtel Money</option>
            <option value="airtel_money">Airtel Money</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Order Records</h2>
            <p className="mt-1 text-sm text-gray-500">
              Successful payments, delivery details, and customer contacts are saved here.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {processingOrders} active fulfillment item{processingOrders === 1 ? '' : 's'}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading orders...</div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-red-600">
            {error instanceof Error ? error.message : 'Failed to load orders'}
          </div>
        ) : orders.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No orders match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50/70">
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-[0.18em] text-gray-500">
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-4 py-4 font-semibold">Customer</th>
                  <th className="px-4 py-4 font-semibold">Delivery</th>
                  <th className="px-4 py-4 font-semibold">Payment</th>
                  <th className="px-4 py-4 font-semibold">Total</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="border-b border-gray-100 align-top hover:bg-gray-50/60">
                    <td className="px-6 py-5">
                      <p className="font-mono text-sm font-semibold text-gray-900">{order.order_id}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {getItemCount(order.items)} item{getItemCount(order.items) === 1 ? '' : 's'}
                      </p>
                      {order.promo_code && (
                        <p className="mt-2 inline-flex rounded-full bg-[#F6F0E4] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#8B6F47]">
                          Promo {order.promo_code}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-5">
                      <p className="font-semibold text-gray-900">{order.customer_name || 'N/A'}</p>
                      <p className="mt-1 text-sm text-gray-500">{order.customer_phone || 'No phone'}</p>
                      <p className="mt-1 text-sm text-gray-500">{order.customer_email || 'No email'}</p>
                    </td>

                    <td className="px-4 py-5">
                      <p className="font-medium text-gray-900">{order.delivery_zone || 'N/A'}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {[order.county, order.area].filter(Boolean).join(' · ') || 'Location pending'}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{order.delivery_point || 'No delivery point'}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                        {formatDeliveryMethod(order.delivery_method)}
                      </p>
                    </td>

                    <td className="px-4 py-5">
                      <p className="font-medium text-gray-900">{formatPaymentMethod(order.payment_method)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            paymentStatusColors[String(order.payment_status || '').toLowerCase()] ||
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.payment_status || 'unknown'}
                        </span>
                      </div>
                      {order.payment_reference && (
                        <p className="mt-2 text-xs text-gray-500">Ref: {order.payment_reference}</p>
                      )}
                    </td>

                    <td className="px-4 py-5">
                      <p className="font-semibold text-gray-900">{formatKes(order.grand_total_kes)}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Shipping {formatKes(order.shipping_kes)}
                      </p>
                      {(Number(order.discount_amount || 0) > 0 || Number(order.shipping_discount || 0) > 0) && (
                        <p className="mt-1 text-sm text-emerald-600">
                          Discount {formatKes(Number(order.discount_amount || 0) + Number(order.shipping_discount || 0))}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-5">
                      <select
                        value={order.order_status || 'pending'}
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                        className={`rounded-full border-0 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                          orderStatusColors[String(order.order_status || '').toLowerCase()] ||
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="payment_failed">Payment Failed</option>
                      </select>
                    </td>

                    <td className="px-4 py-5 text-sm text-gray-500">
                      <p>{formatNairobiDate(order.created_at)}</p>
                      {order.paid_at && <p className="mt-1 text-emerald-600">Paid {formatNairobiDate(order.paid_at)}</p>}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingOrder(order)}
                          className="rounded-xl p-2 transition-colors hover:bg-gray-100"
                          aria-label={`View ${order.order_id}`}
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
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

      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6F47]">
                  Order Details
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-gray-900">{viewingOrder.order_id}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Created {formatNairobiDateTime(viewingOrder.created_at)}
                  {viewingOrder.paid_at ? ` · Paid ${formatNairobiDateTime(viewingOrder.paid_at)}` : ''}
                </p>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="rounded-xl p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Order Status</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-gray-900">
                    {viewingOrder.order_status || 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Payment Status</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-gray-900">
                    {viewingOrder.payment_status || 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Payment Method</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {formatPaymentMethod(viewingOrder.payment_method)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Final Total</p>
                  <p className="mt-2 text-lg font-semibold text-[#8B6F47]">
                    {formatKes(viewingOrder.grand_total_kes)}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-[20px] border border-gray-100 p-5">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#8B6F47]" />
                    <h3 className="text-lg font-semibold text-gray-900">Customer & Contact</h3>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-900">Name:</span> {viewingOrder.customer_name || 'N/A'}</p>
                    <p><span className="font-medium text-gray-900">Phone:</span> {viewingOrder.customer_phone || 'N/A'}</p>
                    <p><span className="font-medium text-gray-900">Email:</span> {viewingOrder.customer_email || 'N/A'}</p>
                  </div>
                </section>

                <section className="rounded-[20px] border border-gray-100 p-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#8B6F47]" />
                    <h3 className="text-lg font-semibold text-gray-900">Delivery Details</h3>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-900">Zone:</span> {viewingOrder.delivery_zone || 'N/A'}</p>
                    <p><span className="font-medium text-gray-900">County:</span> {viewingOrder.county || 'N/A'}</p>
                    <p><span className="font-medium text-gray-900">Area / Town / Estate:</span> {viewingOrder.area || 'N/A'}</p>
                    <p><span className="font-medium text-gray-900">Exact Delivery Point:</span> {viewingOrder.delivery_point || 'N/A'}</p>
                    <p><span className="font-medium text-gray-900">Delivery Method:</span> {formatDeliveryMethod(viewingOrder.delivery_method)}</p>
                    <p><span className="font-medium text-gray-900">ETA:</span> {viewingOrder.delivery_eta || 'N/A'}</p>
                  </div>
                </section>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[20px] border border-gray-100 p-5">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-[#8B6F47]" />
                    <h3 className="text-lg font-semibold text-gray-900">Ordered Products</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(viewingOrder.items || []).map((item, idx) => (
                      <div key={`${item.product_name}-${idx}`} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.product_name || 'Product'}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            Qty {Number(item.quantity || 0)} · {formatKes(item.price_per_item_kes)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">{formatKes(item.item_total_kes)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="rounded-[20px] border border-gray-100 p-5">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#8B6F47]" />
                      <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium text-gray-900">Method:</span> {formatPaymentMethod(viewingOrder.payment_method)}</p>
                      <p><span className="font-medium text-gray-900">Status:</span> {viewingOrder.payment_status || 'N/A'}</p>
                      <p><span className="font-medium text-gray-900">Reference:</span> {viewingOrder.payment_reference || 'N/A'}</p>
                      <p><span className="font-medium text-gray-900">Phone:</span> {viewingOrder.payment_phone || viewingOrder.payment_details?.phone_number || 'N/A'}</p>
                      <p><span className="font-medium text-gray-900">Paid At:</span> {viewingOrder.paid_at ? formatNairobiDateTime(viewingOrder.paid_at) : 'Pending payment'}</p>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-gray-100 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">Totals</h3>
                    <div className="mt-4 space-y-3 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span className="font-semibold text-gray-900">{formatKes(viewingOrder.subtotal_kes)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Delivery Fee</span>
                        <span className="font-semibold text-gray-900">{formatKes(viewingOrder.shipping_kes)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Discount</span>
                        <span className="font-semibold text-emerald-600">
                          -{formatKes(Number(viewingOrder.discount_amount || 0) + Number(viewingOrder.shipping_discount || 0))}
                        </span>
                      </div>
                      {viewingOrder.promo_code && (
                        <div className="flex items-center justify-between">
                          <span>Promo Code</span>
                          <span className="font-semibold text-gray-900">{viewingOrder.promo_code}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base">
                        <span className="font-semibold text-gray-900">Final Total</span>
                        <span className="font-bold text-[#8B6F47]">{formatKes(viewingOrder.grand_total_kes)}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {viewingOrder.events && viewingOrder.events.length > 0 && (
                <section className="rounded-[20px] border border-gray-100 p-5">
                  <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
                  <div className="mt-4 space-y-3">
                    {viewingOrder.events.slice().reverse().map((event, idx) => (
                      <div key={`${event.created_at}-${idx}`} className="rounded-2xl bg-gray-50 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium text-gray-900">{event.message}</p>
                          <span className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
                            {event.category || event.type}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {event.created_at ? formatNairobiDateTime(event.created_at) : 'Unknown time'}
                          {' · '}
                          {event.actor || 'system'}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
