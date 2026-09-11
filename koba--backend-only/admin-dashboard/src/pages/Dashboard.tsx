import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Percent,
  DollarSign,
  RotateCcw,
  Package,
  AlertTriangle,
  Star,
  CheckCircle,
} from 'lucide-react';

import { api } from '../lib/api';
import { StatCard } from '../components/dashboard/StatCard';
import { ChartCard } from '../components/dashboard/ChartCard';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import type { DateRange } from '../components/dashboard/DashboardFilters';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { InventoryPanel } from '../components/dashboard/InventoryPanel';
import { CustomerInsights } from '../components/dashboard/CustomerInsights';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { formatNairobiDateTime } from '../lib/datetime';

type DashboardOrderItem = {
  product_name?: string;
  quantity?: number;
  item_total_kes?: number;
};

type DashboardOrder = {
  _id: string;
  order_id: string;
  customer_name?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  order_status?: string | null;
  grand_total_kes?: number;
  delivery_zone?: string | null;
  delivery_zone_code?: string | null;
  created_at?: string;
  items?: DashboardOrderItem[];
};

type DashboardCustomer = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  country?: string;
  created_at?: string;
  orders?: DashboardOrder[];
  total_spent?: number;
};

type DashboardProduct = {
  _id: string;
  name?: string;
  category?: string;
  in_stock?: boolean;
};

type ChartSeriesPoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

type CustomerGrowthPoint = {
  date: string;
  label: string;
  new_customers: number;
};

type ProductPerformance = {
  name: string;
  total_quantity: number;
  revenue: number;
};

type ActivityRecord = {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  status: string;
  icon: string;
};

type TransactionRecord = {
  id: string;
  customer: string;
  amount: number;
  status: string;
  time: string;
};

type MetricSnapshot = {
  revenue: number;
  orders: number;
  customers: number;
  conversionRate: number;
};

const CHART_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function formatKes(value: number | null | undefined) {
  return `KSh ${(value || 0).toLocaleString()}`;
}

function getTrendDirection(value: number | null | undefined): 'up' | 'down' | 'flat' {
  const amount = Number(value || 0);
  if (amount > 0) return 'up';
  if (amount < 0) return 'down';
  return 'flat';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-full bg-gray-200" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-xl bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="h-4 w-24 animate-pulse rounded-full bg-gray-100" />
            <div className="mt-4 h-8 w-28 animate-pulse rounded-full bg-gray-200" />
            <div className="mt-3 h-3 w-20 animate-pulse rounded-full bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="h-5 w-40 animate-pulse rounded-full bg-gray-200" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded-full bg-gray-100" />
            <div className="mt-6 h-64 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getDaysFromRange(range: DateRange): number {
  switch (range) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return 30;
  }
}

function getRangeLabel(range: DateRange): string {
  switch (range) {
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
    case '1y':
      return 'This year';
    default:
      return 'Last 30 days';
  }
}

function parseDateValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatBucketLabel(date: Date, monthly: boolean) {
  return date.toLocaleDateString('en-US', monthly
    ? { month: 'short', year: '2-digit' }
    : { month: 'short', day: 'numeric' });
}

function capitalizeWords(value?: string | null) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeKey(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function getMetricSnapshot(
  orders: DashboardOrder[],
  customers: DashboardCustomer[],
  startAt: Date,
  endAt: Date,
): MetricSnapshot {
  const ordersInPeriod = orders.filter((order) => {
    const createdAt = parseDateValue(order.created_at);
    return Boolean(createdAt && createdAt >= startAt && createdAt < endAt);
  });

  const paidOrdersInPeriod = ordersInPeriod.filter(
    (order) => normalizeKey(order.payment_status) === 'paid',
  );

  const customersInPeriod = customers.filter((customer) => {
    const createdAt = parseDateValue(customer.created_at);
    return Boolean(createdAt && createdAt >= startAt && createdAt < endAt);
  });

  const revenue = paidOrdersInPeriod.reduce(
    (sum, order) => sum + Number(order.grand_total_kes || 0),
    0,
  );
  const orderCount = ordersInPeriod.length;
  const conversionRate = orderCount > 0 ? Number(((paidOrdersInPeriod.length / orderCount) * 100).toFixed(1)) : 0;

  return {
    revenue,
    orders: orderCount,
    customers: customersInPeriod.length,
    conversionRate,
  };
}

function buildOrderSeries(
  orders: DashboardOrder[],
  startAt: Date,
  endAt: Date,
  monthly: boolean,
): ChartSeriesPoint[] {
  const bucketMap = new Map<string, ChartSeriesPoint>();
  let cursor = monthly ? startOfMonth(startAt) : startOfDay(startAt);
  const limit = monthly ? startOfMonth(endAt) : startOfDay(endAt);

  while (cursor <= limit) {
    const key = monthly ? toMonthKey(cursor) : toIsoDate(cursor);
    bucketMap.set(key, {
      date: monthly ? `${key}-01` : key,
      label: formatBucketLabel(cursor, monthly),
      revenue: 0,
      orders: 0,
    });

    cursor = monthly
      ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      : new Date(cursor.getTime() + MS_PER_DAY);
  }

  orders.forEach((order) => {
    const createdAt = parseDateValue(order.created_at);
    if (!createdAt || createdAt < startAt || createdAt > endAt) {
      return;
    }

    const key = monthly ? toMonthKey(createdAt) : toIsoDate(createdAt);
    const bucket = bucketMap.get(key);
    if (!bucket) {
      return;
    }

    bucket.orders += 1;
    if (normalizeKey(order.payment_status) === 'paid') {
      bucket.revenue += Number(order.grand_total_kes || 0);
    }
  });

  return Array.from(bucketMap.values());
}

function buildCustomerGrowthSeries(
  customers: DashboardCustomer[],
  startAt: Date,
  endAt: Date,
  monthly: boolean,
): CustomerGrowthPoint[] {
  const bucketMap = new Map<string, CustomerGrowthPoint>();
  let cursor = monthly ? startOfMonth(startAt) : startOfDay(startAt);
  const limit = monthly ? startOfMonth(endAt) : startOfDay(endAt);

  while (cursor <= limit) {
    const key = monthly ? toMonthKey(cursor) : toIsoDate(cursor);
    bucketMap.set(key, {
      date: monthly ? `${key}-01` : key,
      label: formatBucketLabel(cursor, monthly),
      new_customers: 0,
    });

    cursor = monthly
      ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      : new Date(cursor.getTime() + MS_PER_DAY);
  }

  customers.forEach((customer) => {
    const createdAt = parseDateValue(customer.created_at);
    if (!createdAt || createdAt < startAt || createdAt > endAt) {
      return;
    }

    const key = monthly ? toMonthKey(createdAt) : toIsoDate(createdAt);
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.new_customers += 1;
    }
  });

  return Array.from(bucketMap.values());
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: () => api.getOrders({ limit: 500 }),
    placeholderData: (previousData) => previousData,
  });

  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: api.getCustomers,
    placeholderData: (previousData) => previousData,
  });

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: api.getProducts,
    placeholderData: (previousData) => previousData,
  });

  const orders = (ordersResponse?.orders || []) as DashboardOrder[];
  const customers = (customersResponse?.customers || []) as DashboardCustomer[];
  const products = (productsResponse?.products || []) as DashboardProduct[];

  const isLoading = ordersLoading || customersLoading || productsLoading;
  const hasDashboardData = orders.length > 0 || customers.length > 0 || products.length > 0;

  const days = getDaysFromRange(dateRange);
  const rangeLabel = getRangeLabel(dateRange);

  const currentPeriod = useMemo(() => {
    const endAt = new Date();
    const startAt = new Date(endAt.getTime() - (days - 1) * MS_PER_DAY);
    startAt.setHours(0, 0, 0, 0);
    return { startAt, endAt };
  }, [days]);

  const previousPeriod = useMemo(() => {
    const endAt = currentPeriod.startAt;
    const startAt = new Date(endAt.getTime() - days * MS_PER_DAY);
    return { startAt, endAt };
  }, [currentPeriod.startAt, days]);

  useEffect(() => {
    if (searchParams.get('focus') !== 'analytics') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('dashboard-analytics')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('focus');
    setSearchParams(nextSearchParams, { replace: true });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [searchParams, setSearchParams]);

  const currentMetrics = useMemo(
    () => getMetricSnapshot(orders, customers, currentPeriod.startAt, currentPeriod.endAt),
    [customers, currentPeriod.endAt, currentPeriod.startAt, orders],
  );

  const previousMetrics = useMemo(
    () => getMetricSnapshot(orders, customers, previousPeriod.startAt, previousPeriod.endAt),
    [customers, orders, previousPeriod.endAt, previousPeriod.startAt],
  );

  const currentOrders = useMemo(
    () =>
      orders.filter((order) => {
        const createdAt = parseDateValue(order.created_at);
        return Boolean(createdAt && createdAt >= currentPeriod.startAt && createdAt <= currentPeriod.endAt);
      }),
    [currentPeriod.endAt, currentPeriod.startAt, orders],
  );

  const currentPaidOrders = useMemo(
    () => currentOrders.filter((order) => normalizeKey(order.payment_status) === 'paid'),
    [currentOrders],
  );

  const productCategoryMap = useMemo(() => {
    const nextMap = new Map<string, string>();

    products.forEach((product) => {
      const key = normalizeKey(product.name);
      if (key) {
        nextMap.set(key, product.category || 'Other');
      }
    });

    return nextMap;
  }, [products]);

  const revenueTrends = useMemo(
    () => buildOrderSeries(currentOrders, currentPeriod.startAt, currentPeriod.endAt, days > 90),
    [currentOrders, currentPeriod.endAt, currentPeriod.startAt, days],
  );

  const customerGrowth = useMemo(
    () =>
      buildCustomerGrowthSeries(customers, currentPeriod.startAt, currentPeriod.endAt, days > 90),
    [currentPeriod.endAt, currentPeriod.startAt, customers, days],
  );

  const topProducts = useMemo(() => {
    const productSales = new Map<string, ProductPerformance>();

    currentPaidOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.product_name || 'Unknown Product';
        const quantity = Number(item.quantity || 0);
        const revenue = Number(item.item_total_kes || 0);
        const current = productSales.get(name) || {
          name,
          total_quantity: 0,
          revenue: 0,
        };

        current.total_quantity += quantity;
        current.revenue += revenue;
        productSales.set(name, current);
      });
    });

    return Array.from(productSales.values())
      .sort((left, right) =>
        right.total_quantity - left.total_quantity || right.revenue - left.revenue,
      )
      .slice(0, 5);
  }, [currentPaidOrders]);

  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();

    currentPaidOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const productName = normalizeKey(item.product_name);
        const category = productCategoryMap.get(productName) || 'Other';
        categoryMap.set(category, (categoryMap.get(category) || 0) + Number(item.item_total_kes || 0));
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((left, right) => right.revenue - left.revenue);
  }, [currentPaidOrders, productCategoryMap]);

  const paymentMethods = useMemo(() => {
    const methodMap = new Map<string, { method: string; revenue: number }>();

    currentPaidOrders.forEach((order) => {
      const method = capitalizeWords(order.payment_method || 'Unknown');
      methodMap.set(method, {
        method,
        revenue: (methodMap.get(method)?.revenue || 0) + Number(order.grand_total_kes || 0),
      });
    });

    return Array.from(methodMap.values()).sort((left, right) => right.revenue - left.revenue);
  }, [currentPaidOrders]);

  const deliveryZones = useMemo(() => {
    const zoneMap = new Map<string, number>();

    currentOrders.forEach((order) => {
      const zoneKey = capitalizeWords(
        order.delivery_zone || order.delivery_zone_code || 'Unspecified',
      );
      zoneMap.set(zoneKey, (zoneMap.get(zoneKey) || 0) + 1);
    });

    return Array.from(zoneMap.entries())
      .map(([source, visits]) => ({ source, visits }))
      .sort((left, right) => right.visits - left.visits);
  }, [currentOrders]);

  const topCustomers = useMemo(() => {
    return [...customers]
      .sort((left, right) => Number(right.total_spent || 0) - Number(left.total_spent || 0))
      .slice(0, 5)
      .map((customer) => ({
        name: customer.name || customer.username || customer.email || 'Customer',
        orders: customer.orders?.length || 0,
        spent: Number(customer.total_spent || 0),
      }));
  }, [customers]);

  const customerLocations = useMemo(() => {
    if (customers.length === 0) {
      return [];
    }

    const locationMap = new Map<string, number>();
    customers.forEach((customer) => {
      const country = customer.country || 'Unknown';
      locationMap.set(country, (locationMap.get(country) || 0) + 1);
    });

    return Array.from(locationMap.entries())
      .map(([country, count]) => ({
        country,
        percentage: Math.round((count / customers.length) * 100),
      }))
      .sort((left, right) => right.percentage - left.percentage)
      .slice(0, 5);
  }, [customers]);

  const monthStart = useMemo(() => startOfMonth(new Date()), []);
  const newCustomersThisMonth = useMemo(
    () =>
      customers.filter((customer) => {
        const createdAt = parseDateValue(customer.created_at);
        return Boolean(createdAt && createdAt >= monthStart);
      }).length,
    [customers, monthStart],
  );

  const repeatCustomersRate = useMemo(() => {
    if (customers.length === 0) {
      return 0;
    }

    const repeatCustomers = customers.filter((customer) => (customer.orders?.length || 0) > 1).length;
    return Math.round((repeatCustomers / customers.length) * 100);
  }, [customers]);

  const inventoryHealth = useMemo(() => {
    const totalProducts = products.length;
    const inStock = products.filter((product) => Boolean(product.in_stock)).length;
    const outOfStock = products.filter((product) => !product.in_stock).length;

    return {
      totalProducts,
      inStock,
      lowStock: outOfStock,
      outOfStock,
    };
  }, [products]);

  const restockItems = useMemo(
    () =>
      products
        .filter((product) => !product.in_stock)
        .map((product) => ({
          name: product.name || 'Unnamed product',
          stock: 0,
          threshold: 1,
        })),
    [products],
  );

  const recentTransactions = useMemo<TransactionRecord[]>(() => {
    return currentPaidOrders
      .slice()
      .sort((left, right) => {
        const leftTime = parseDateValue(left.created_at)?.getTime() || 0;
        const rightTime = parseDateValue(right.created_at)?.getTime() || 0;
        return rightTime - leftTime;
      })
      .slice(0, 5)
      .map((order) => ({
        id: order.order_id || order._id,
        customer: order.customer_name || 'Guest customer',
        amount: Number(order.grand_total_kes || 0),
        status:
          normalizeKey(order.order_status) === 'delivered'
            ? 'Delivered'
            : normalizeKey(order.payment_status) === 'paid'
              ? 'Paid'
              : normalizeKey(order.order_status) === 'processing'
                ? 'Processing'
                : 'Pending',
        time: formatNairobiDateTime(order.created_at),
      }));
  }, [currentPaidOrders]);

  const recentActivity = useMemo<ActivityRecord[]>(() => {
    const orderActivity = currentOrders.map((order, index) => ({
      id: index + 1,
      type: 'order',
      message: `${order.customer_name || 'Guest customer'} placed order ${order.order_id || order._id}.`,
      timestamp: formatNairobiDateTime(order.created_at),
      status:
        normalizeKey(order.payment_status) === 'paid'
          ? 'success'
          : normalizeKey(order.payment_status) === 'failed'
            ? 'error'
            : 'warning',
      icon:
        normalizeKey(order.payment_status) === 'paid'
          ? 'CreditCard'
          : 'ShoppingBag',
      sortValue: parseDateValue(order.created_at)?.getTime() || 0,
    }));

    const customerActivity = customers.map((customer, index) => ({
      id: 1000 + index,
      type: 'customer',
      message: `${customer.name || customer.username || customer.email || 'A customer'} joined the store.`,
      timestamp: formatNairobiDateTime(customer.created_at),
      status: 'info',
      icon: 'User',
      sortValue: parseDateValue(customer.created_at)?.getTime() || 0,
    }));

    return [...orderActivity, ...customerActivity]
      .sort((left, right) => right.sortValue - left.sortValue)
      .slice(0, 8)
      .map(({ sortValue: _sortValue, ...activity }) => activity);
  }, [currentOrders, customers]);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const todaysRevenue = useMemo(
    () =>
      orders.reduce((sum, order) => {
        const createdAt = parseDateValue(order.created_at);
        if (
          createdAt &&
          createdAt >= todayStart &&
          normalizeKey(order.payment_status) === 'paid'
        ) {
          return sum + Number(order.grand_total_kes || 0);
        }
        return sum;
      }, 0),
    [orders, todayStart],
  );

  const bestSalesDay = useMemo(() => {
    return revenueTrends.reduce<ChartSeriesPoint | null>((best, entry) => {
      if (!best || entry.revenue > best.revenue) {
        return entry;
      }
      return best;
    }, null);
  }, [revenueTrends]);

  const averageOrderValue = useMemo(() => {
    if (currentPaidOrders.length === 0) {
      return 0;
    }
    return Number((currentMetrics.revenue / currentPaidOrders.length).toFixed(2));
  }, [currentMetrics.revenue, currentPaidOrders.length]);

  const previousAverageOrderValue = useMemo(() => {
    const previousPaidOrders = orders.filter((order) => {
      const createdAt = parseDateValue(order.created_at);
      return Boolean(
        createdAt &&
          createdAt >= previousPeriod.startAt &&
          createdAt < previousPeriod.endAt &&
          normalizeKey(order.payment_status) === 'paid',
      );
    });

    if (previousPaidOrders.length === 0) {
      return 0;
    }

    const previousRevenue = previousPaidOrders.reduce(
      (sum, order) => sum + Number(order.grand_total_kes || 0),
      0,
    );

    return Number((previousRevenue / previousPaidOrders.length).toFixed(2));
  }, [orders, previousPeriod.endAt, previousPeriod.startAt]);

  const repeatCustomerChange = useMemo(() => {
    const previousCustomers = customers.filter((customer) => {
      const createdAt = parseDateValue(customer.created_at);
      return Boolean(createdAt && createdAt < previousPeriod.endAt);
    });

    if (previousCustomers.length === 0) {
      return repeatCustomersRate > 0 ? 100 : 0;
    }

    const previousRepeatRate = Math.round(
      (previousCustomers.filter((customer) => (customer.orders?.length || 0) > 1).length /
        previousCustomers.length) *
        100,
    );

    return calculateTrend(repeatCustomersRate, previousRepeatRate);
  }, [customers, previousPeriod.endAt, repeatCustomersRate]);

  const exportReport = () => {
    const rows: Array<Array<unknown>> = [
      ['Section', 'Metric', 'Value'],
      ['Summary', 'Time Range', rangeLabel],
      ['Summary', 'Revenue', currentMetrics.revenue],
      ['Summary', 'Orders', currentMetrics.orders],
      ['Summary', 'New Customers', currentMetrics.customers],
      ['Summary', 'Conversion Rate', currentMetrics.conversionRate],
      ['Summary', 'Average Order Value', averageOrderValue],
      ['Summary', 'Repeat Customer Rate', repeatCustomersRate],
      [],
      ['Top Products', 'Product', 'Units Sold', 'Revenue'],
      ...topProducts.map((product) => [
        'Top Products',
        product.name,
        product.total_quantity,
        product.revenue,
      ]),
      [],
      ['Recent Transactions', 'Order ID', 'Customer', 'Amount', 'Status', 'Time'],
      ...recentTransactions.map((transaction) => [
        'Recent Transactions',
        transaction.id,
        transaction.customer,
        transaction.amount,
        transaction.status,
        transaction.time,
      ]),
    ];

    downloadCsv(`queen-koba-admin-report-${dateRange}.csv`, rows);
  };

  const exportRestockReport = () => {
    const rows: Array<Array<unknown>> = [
      ['Product', 'Category', 'Inventory Status'],
      ...products
        .filter((product) => !product.in_stock)
        .map((product) => [
          product.name || 'Unnamed product',
          product.category || 'Other',
          'Out of stock',
        ]),
    ];

    downloadCsv('queen-koba-restock-report.csv', rows);
  };

  if (isLoading && !hasDashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
        </div>
        <DashboardFilters selectedRange={dateRange} onRangeChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatKes(currentMetrics.revenue)}
          change={calculateTrend(currentMetrics.revenue, previousMetrics.revenue)}
          subtitle={`for ${rangeLabel.toLowerCase()}`}
          icon={TrendingUp}
          trend={getTrendDirection(calculateTrend(currentMetrics.revenue, previousMetrics.revenue))}
        />
        <StatCard
          title="Total Orders"
          value={currentMetrics.orders.toLocaleString()}
          change={calculateTrend(currentMetrics.orders, previousMetrics.orders)}
          subtitle={`for ${rangeLabel.toLowerCase()}`}
          icon={ShoppingBag}
          trend={getTrendDirection(calculateTrend(currentMetrics.orders, previousMetrics.orders))}
        />
        <StatCard
          title="Customers"
          value={currentMetrics.customers.toLocaleString()}
          change={calculateTrend(currentMetrics.customers, previousMetrics.customers)}
          subtitle={`new in ${rangeLabel.toLowerCase()}`}
          icon={Users}
          trend={getTrendDirection(calculateTrend(currentMetrics.customers, previousMetrics.customers))}
        />
        <StatCard
          title="Conversion Rate"
          value={`${currentMetrics.conversionRate}%`}
          change={calculateTrend(currentMetrics.conversionRate, previousMetrics.conversionRate)}
          subtitle="paid orders vs placed orders"
          icon={Percent}
          trend={getTrendDirection(calculateTrend(currentMetrics.conversionRate, previousMetrics.conversionRate))}
        />
        <StatCard
          title="Average Order Value"
          value={formatKes(averageOrderValue)}
          change={calculateTrend(averageOrderValue, previousAverageOrderValue)}
          subtitle={`for ${rangeLabel.toLowerCase()}`}
          icon={DollarSign}
          trend={getTrendDirection(calculateTrend(averageOrderValue, previousAverageOrderValue))}
        />
        <StatCard
          title="Repeat Customers"
          value={`${repeatCustomersRate}%`}
          change={repeatCustomerChange}
          subtitle="customers with 2+ orders"
          icon={RotateCcw}
          trend={getTrendDirection(repeatCustomerChange)}
        />
        <StatCard
          title="Products in Stock"
          value={inventoryHealth.inStock.toString()}
          subtitle={`${inventoryHealth.totalProducts} total products`}
          icon={Package}
        />
        <StatCard
          title="Low Stock Alerts"
          value={inventoryHealth.lowStock.toString()}
          subtitle="need restocking"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">Today&apos;s Revenue</p>
              <p className="text-2xl font-bold">{formatKes(todaysRevenue)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Best Sales Day</p>
              <p className="text-2xl font-bold">{bestSalesDay?.label || 'N/A'}</p>
              <p className="text-green-100 text-xs">{formatKes(bestSalesDay?.revenue || 0)}</p>
            </div>
            <Star className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Products</p>
              <p className="text-2xl font-bold">{inventoryHealth.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Top Product</p>
              <p className="text-lg font-bold">{topProducts[0]?.name || 'N/A'}</p>
              <p className="text-purple-100 text-xs">{topProducts[0]?.total_quantity || 0} sales</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      <div id="dashboard-analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue Trend"
          subtitle={`Revenue across ${rangeLabel.toLowerCase()}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', days > 90
                    ? { month: 'short', year: '2-digit' }
                    : { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `KSh ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? [formatKes(value), 'Revenue'] : ['N/A', 'Revenue']
                }
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                fill="#fef3c7"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders Trend" subtitle={`Orders placed during ${rangeLabel.toLowerCase()}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', days > 90
                    ? { month: 'short', year: '2-digit' }
                    : { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? [value, 'Orders'] : ['N/A', 'Orders']
                }
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer Growth" subtitle={`Customer acquisition during ${rangeLabel.toLowerCase()}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', days > 90
                    ? { month: 'short', year: '2-digit' }
                    : { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? [value, 'New Customers'] : ['N/A', 'New Customers']
                }
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="new_customers"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Products" subtitle="Best performing products by paid sales">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#6b7280"
                fontSize={12}
                width={100}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? [`${value} units`, 'Units Sold'] : ['N/A', 'Units Sold']
                }
              />
              <Bar dataKey="total_quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Sales by Category" subtitle="Revenue distribution by product category">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryBreakdown.map((category, index) => ({
                  name: category.category,
                  value: category.revenue,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryBreakdown.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | undefined) => (value ? formatKes(value) : 'N/A')} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Methods" subtitle="Revenue by payment method">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentMethods.map((method, index) => ({
                  name: method.method,
                  value: method.revenue,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                }))}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                dataKey="value"
              >
                {paymentMethods.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | undefined) => (value ? formatKes(value) : 'N/A')} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Delivery Zones" subtitle="Where current orders are headed">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deliveryZones} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis
                type="category"
                dataKey="source"
                stroke="#6b7280"
                fontSize={12}
                width={110}
              />
              <Tooltip formatter={(value: number | undefined) => (value ? `${value} orders` : 'N/A')} />
              <Bar dataKey="visits" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <RecentTransactions
            transactions={recentTransactions}
            onViewAll={() => navigate('/admin/orders')}
          />
          <InventoryPanel
            health={inventoryHealth}
            lowStockItems={restockItems}
            onGenerateRestockReport={exportRestockReport}
          />
        </div>

        <div className="space-y-6">
          <ActivityFeed
            activities={recentActivity}
            onViewAll={() => navigate('/admin/orders')}
          />
          <CustomerInsights
            newThisMonth={newCustomersThisMonth}
            repeatCustomers={repeatCustomersRate}
            topCustomers={topCustomers}
            locations={customerLocations}
          />
          <QuickActions onExportReport={exportReport} />
        </div>
      </div>
    </div>
  );
}
