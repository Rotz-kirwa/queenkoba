import { Calendar } from 'lucide-react';

export type DateRange = 'today' | '7d' | '30d' | '90d' | '1y' | 'custom';

interface DashboardFiltersProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const rangeOptions = [
  { value: 'today' as DateRange, label: 'Today' },
  { value: '7d' as DateRange, label: 'Last 7 days' },
  { value: '30d' as DateRange, label: 'Last 30 days' },
  { value: '90d' as DateRange, label: 'Last 90 days' },
  { value: '1y' as DateRange, label: 'This year' },
  { value: 'custom' as DateRange, label: 'Custom range' },
];

export function DashboardFilters({ selectedRange, onRangeChange }: DashboardFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
      </div>

      <div className="flex gap-2">
        {rangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onRangeChange(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedRange === option.value
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}