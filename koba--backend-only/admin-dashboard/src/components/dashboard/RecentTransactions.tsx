import { CreditCard, CheckCircle, Clock, Truck } from 'lucide-react';

interface Transaction {
  id: string;
  customer: string;
  amount: number;
  status: string;
  time: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  className?: string;
  onViewAll?: () => void;
}

const statusConfig: Record<string, { icon: any; color: string; text: string }> = {
  Paid: { icon: CheckCircle, color: 'text-green-600 bg-green-50', text: 'Paid' },
  Processing: { icon: Clock, color: 'text-amber-600 bg-amber-50', text: 'Processing' },
  Delivered: { icon: Truck, color: 'text-blue-600 bg-blue-50', text: 'Delivered' },
  Pending: { icon: CreditCard, color: 'text-gray-600 bg-gray-50', text: 'Pending' },
};

export function RecentTransactions({
  transactions,
  className = '',
  onViewAll,
}: RecentTransactionsProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        <button
          type="button"
          onClick={onViewAll}
          disabled={!onViewAll}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          View all →
        </button>
      </div>

      {transactions.length > 0 ? (
        <div className="space-y-3">
          {transactions.map((transaction, index) => {
            const status = statusConfig[transaction.status] || statusConfig.Pending;
            const StatusIcon = status.icon;

            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${status.color}`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{transaction.id}</p>
                    <p className="text-xs text-gray-600">{transaction.customer}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    KSh {transaction.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{transaction.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500">
          Recent transactions will appear here once orders start coming in.
        </div>
      )}
    </div>
  );
}
