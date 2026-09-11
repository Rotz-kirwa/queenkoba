import { Package, AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react';

interface InventoryHealth {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface InventoryPanelProps {
  health: InventoryHealth;
  lowStockItems: Array<{
    name: string;
    stock: number;
    threshold: number;
  }>;
  className?: string;
  onGenerateRestockReport?: () => void;
}

export function InventoryPanel({
  health,
  lowStockItems,
  className = '',
  onGenerateRestockReport,
}: InventoryPanelProps) {
  const safeTotalProducts = Number(health.totalProducts || 0);
  const safeInStock = Number(health.inStock || 0);
  const safeLowStock = Number(health.lowStock || 0);
  const safeOutOfStock = Number(health.outOfStock || 0);
  const healthPercentage =
    safeTotalProducts > 0 ? Math.round((safeInStock / safeTotalProducts) * 100) : 0;
  const healthLabel = safeTotalProducts > 0 ? `${healthPercentage}% Healthy` : 'No inventory yet';
  const hasRestockItems = lowStockItems.length > 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Inventory Health</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            healthPercentage > 80 ? 'bg-green-400' :
            healthPercentage > 60 ? 'bg-amber-400' : 'bg-red-400'
          }`} />
          <span className="text-sm font-medium text-gray-600">{healthLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg mx-auto mb-2">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{safeTotalProducts}</p>
          <p className="text-xs text-gray-600">Total Products</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg mx-auto mb-2">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{safeInStock}</p>
          <p className="text-xs text-gray-600">In Stock</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-50 rounded-lg mx-auto mb-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{safeLowStock}</p>
          <p className="text-xs text-gray-600">Needs Restock</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-lg mx-auto mb-2">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{safeOutOfStock}</p>
          <p className="text-xs text-gray-600">Out of Stock</p>
        </div>
      </div>

      {hasRestockItems ? (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Restock Alerts</h4>
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="text-sm text-amber-700 font-medium">
                  {item.stock > 0 ? `${item.stock} left` : 'Out of stock'}
                </span>
              </div>
            ))}
          </div>

          {lowStockItems.length > 3 && (
            <button className="w-full mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium">
              View all {lowStockItems.length} alerts →
            </button>
          )}
        </div>
      ) : (
        <div className="border-t border-gray-100 pt-4">
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
            No products currently need restocking.
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onGenerateRestockReport}
          className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!onGenerateRestockReport}
        >
          <RefreshCw className="w-4 h-4" />
          Generate restock report
        </button>
      </div>
    </div>
  );
}
