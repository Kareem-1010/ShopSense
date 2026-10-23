import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { SearchFilters } from '../types/index.js';

interface FiltersSidebarProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onClear: () => void;
  availableCategories: string[];
  availableBrands: string[];
  totalResultsCount: number;
}

const COMMON_MATERIALS = [
  'Solid Oak',
  'Solid Sheesham',
  'Teak Wood',
  'Walnut',
  'Bouclé Fabric',
  'Top-grain Leather',
  'Ergonomic Mesh',
  'Brushed Brass',
  'New Zealand Wool',
  'Organic Jute'
];

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  filters,
  onChange,
  onClear,
  availableCategories,
  availableBrands
}) => {
  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.min_price !== undefined ? 1 : 0) +
    (filters.max_price !== undefined ? 1 : 0) +
    (filters.min_rating !== undefined ? 1 : 0) +
    (filters.brand ? filters.brand.length : 0) +
    (filters.material ? filters.material.length : 0);

  const setCategory = (cat: string) => {
    if (filters.category === cat) {
      const next = { ...filters };
      delete next.category;
      onChange(next);
    } else {
      onChange({ ...filters, category: cat });
    }
  };

  const toggleBrand = (brand: string) => {
    const current = filters.brand || [];
    const next = current.includes(brand)
      ? current.filter((b) => b !== brand)
      : [...current, brand];
    onChange({ ...filters, brand: next.length > 0 ? next : undefined });
  };

  const toggleMaterial = (mat: string) => {
    const current = filters.material || [];
    const next = current.includes(mat)
      ? current.filter((m) => m !== mat)
      : [...current, mat];
    onChange({ ...filters, material: next.length > 0 ? next : undefined });
  };

  return (
    <aside className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Filters</h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
              {activeCount}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-amber-500 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5">
          Category
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {availableCategories.map((cat) => {
            const isSelected = filters.category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 text-amber-500 font-semibold border border-amber-500/30'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <span>{cat}</span>
                {isSelected && <X className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5">
          Price Range (₹ INR)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-stone-400 block mb-1">Min Price</span>
            <input
              type="number"
              placeholder="0"
              value={filters.min_price || ''}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                onChange({ ...filters, min_price: val });
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block mb-1">Max Price</span>
            <input
              type="number"
              placeholder="100000"
              value={filters.max_price || ''}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                onChange({ ...filters, max_price: val });
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Quick Price Buttons */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <button
            onClick={() => onChange({ ...filters, max_price: 15000, min_price: undefined })}
            className={`px-2 py-0.5 rounded text-[11px] border ${
              filters.max_price === 15000 && !filters.min_price
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            &lt; ₹15,000
          </button>
          <button
            onClick={() => onChange({ ...filters, min_price: 15000, max_price: 35000 })}
            className={`px-2 py-0.5 rounded text-[11px] border ${
              filters.min_price === 15000 && filters.max_price === 35000
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            ₹15k - ₹35k
          </button>
          <button
            onClick={() => onChange({ ...filters, min_price: 35000, max_price: undefined })}
            className={`px-2 py-0.5 rounded text-[11px] border ${
              filters.min_price === 35000 && !filters.max_price
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            &gt; ₹35,000
          </button>
        </div>
      </div>

      {/* Materials */}
      <div>
        <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5">
          Material
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_MATERIALS.map((mat) => {
            const isSelected = (filters.material || []).includes(mat);
            return (
              <button
                key={mat}
                onClick={() => toggleMaterial(mat)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 font-semibold border-amber-500 shadow-sm'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {mat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brands */}
      <div>
        <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5">
          Brand
        </label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {availableBrands.map((brand) => {
            const isChecked = (filters.brand || []).includes(brand);
            return (
              <label
                key={brand}
                className="flex items-center space-x-2 text-xs text-stone-600 dark:text-stone-300 cursor-pointer hover:text-stone-900 dark:hover:text-stone-100"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleBrand(brand)}
                  className="rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                />
                <span>{brand}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5">
          Rating
        </label>
        <div className="flex gap-2">
          {[4.0, 4.5, 4.8].map((stars) => {
            const isSelected = filters.min_rating === stars;
            return (
              <button
                key={stars}
                onClick={() => onChange({ ...filters, min_rating: isSelected ? undefined : stars })}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 font-semibold'
                    : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-300'
                }`}
              >
                ★ {stars}+
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
