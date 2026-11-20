import React from 'react';
import type { KpiCategory } from '@/types/kpi';

interface FilterBarProps {
  departments: string[];
  selectedDept: string;
  selectedCategory: 'All' | KpiCategory;
  onDeptChange: (dept: string) => void;
  onCategoryChange: (cat: 'All' | KpiCategory) => void;
  onReset: () => void;
  filteredKpiCount: number;
  totalKpiCount: number;
}

const CATEGORIES: Array<{ value: 'All' | KpiCategory; label: string }> = [
  { value: 'All', label: 'Semua Kategori' },
  { value: 'Output', label: 'Output' },
  { value: 'Quality', label: 'Kualitas' },
  { value: 'Efficiency', label: 'Efisiensi' },
  { value: 'Growth', label: 'Pertumbuhan' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  departments,
  selectedDept,
  selectedCategory,
  onDeptChange,
  onCategoryChange,
  onReset,
  filteredKpiCount,
  totalKpiCount,
}) => {
  const hasFilters = selectedDept !== 'All' || selectedCategory !== 'All';

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <span>Departemen</span>
          <select
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'Semua Departemen' : d}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => onCategoryChange(cat.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.value
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer"
          >
            Reset filter
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500 font-mono tabular-nums">
        Cakupan: {filteredKpiCount} dari {totalKpiCount} KPI
      </div>
    </div>
  );
};
