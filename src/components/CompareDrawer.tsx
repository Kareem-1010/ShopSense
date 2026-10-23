import React from 'react';
import { X, Scale, Star, Trash2 } from 'lucide-react';
import { Product } from '../types/index.js';

interface CompareDrawerProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectProduct: (p: Product) => void;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  products,
  isOpen,
  onClose,
  onRemove,
  onClear,
  onSelectProduct
}) => {
  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Product Comparison
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Compare price, materials, dimensions, and rating across {products.length} products
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {products.length > 0 && (
              <button
                onClick={onClear}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        {products.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <Scale className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-700 mb-3" />
            <p className="text-sm font-medium">No products selected for comparison</p>
            <p className="text-xs mt-1">Click the scale icon on any product card to add up to 3 items here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800">
                  <th className="p-3 font-semibold text-stone-400 uppercase tracking-wider w-36">
                    Product
                  </th>
                  {products.map((p) => (
                    <th key={p.id} className="p-3 min-w-[220px] max-w-[280px]">
                      <div className="relative group">
                        <div
                          className="aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 mb-2 cursor-pointer"
                          onClick={() => onSelectProduct(p)}
                        >
                          <img
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80'}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <button
                          onClick={() => onRemove(p.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-stone-900/80 text-stone-200 hover:text-red-400 transition-colors"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <h4
                          onClick={() => onSelectProduct(p)}
                          className="font-serif text-xs font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-500 cursor-pointer line-clamp-2"
                        >
                          {p.title}
                        </h4>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {/* Price */}
                <tr>
                  <td className="p-3 font-semibold text-stone-500 dark:text-stone-400">Price</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 font-bold text-sm text-stone-900 dark:text-stone-100">
                      {formatPrice(p.price)}
                    </td>
                  ))}
                </tr>

                {/* Category & Brand */}
                <tr>
                  <td className="p-3 font-semibold text-stone-500 dark:text-stone-400">Brand / Category</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-stone-700 dark:text-stone-300">
                      <span className="font-semibold block">{p.brand}</span>
                      <span className="text-[11px] text-stone-400 capitalize">{p.category}</span>
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr>
                  <td className="p-3 font-semibold text-stone-500 dark:text-stone-400">Rating</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex items-center gap-1 font-semibold text-stone-800 dark:text-stone-200">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{p.rating}</span>
                        <span className="text-[10px] text-stone-400 font-normal">({p.rating_count} reviews)</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Material */}
                <tr>
                  <td className="p-3 font-semibold text-stone-500 dark:text-stone-400">Material</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-stone-700 dark:text-stone-300 font-medium">
                      {p.material}
                    </td>
                  ))}
                </tr>

                {/* Color */}
                <tr>
                  <td className="p-3 font-semibold text-stone-500 dark:text-stone-400">Color</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-stone-700 dark:text-stone-300 font-medium">
                      {p.color}
                    </td>
                  ))}
                </tr>

                {/* Dimensions */}
                <tr>
                  <td className="p-3 font-semibold text-stone-500 dark:text-stone-400">Dimensions (WxHxD)</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 font-mono text-stone-700 dark:text-stone-300">
                      {p.width} x {p.height} x {p.depth} cm
                    </td>
                  ))}
                </tr>

                {/* Availability */}
                <tr>
                  <td className="p-3 font-semibold text-stone-500 dark:text-stone-400">Stock Status</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.availability === 'in_stock'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {p.availability === 'in_stock' ? 'In Stock' : 'Low Stock'}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
