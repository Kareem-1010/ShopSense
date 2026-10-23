import React, { useState, useEffect } from 'react';
import { X, Star, Ruler, Layers, ShieldCheck, Scale, Bookmark, Sparkles, ArrowRight, Check } from 'lucide-react';
import { Product } from '../types/index.js';
import { getSimilarProducts, recordInteraction } from '../services/api.js';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectSimilar: (p: Product) => void;
  sessionId: string;
  isCompared?: boolean;
  onToggleCompare?: (product: Product) => void;
  isSaved?: boolean;
  onToggleSave?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSelectSimilar,
  sessionId,
  isCompared = false,
  onToggleCompare,
  isSaved = false,
  onToggleSave
}) => {
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [similarItems, setSimilarItems] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedImg(product.images?.[0] || '');

    // Record view event for session personalization
    recordInteraction({
      session_id: sessionId,
      product_id: product.id,
      event_type: 'view',
      timestamp: new Date().toISOString()
    });

    // Load similar products
    setLoadingSimilar(true);
    getSimilarProducts(product.id, 4)
      .then((items) => setSimilarItems(items))
      .catch((err) => console.error('Failed to load similar products:', err))
      .finally(() => setLoadingSimilar(false));
  }, [product, sessionId]);

  if (!product) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Gallery */}
          <div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 mb-3 shadow-inner">
              <img
                src={selectedImg || product.images?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImg(img)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImg === img ? 'border-amber-500 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Dimensions Specifications Card */}
            <div className="mt-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-200">
                <Ruler className="w-4 h-4 text-amber-500" />
                <span>Physical Dimensions</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 block">Width</span>
                  <span className="font-bold text-stone-800 dark:text-stone-100">{product.width} cm</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 block">Height</span>
                  <span className="font-bold text-stone-800 dark:text-stone-100">{product.height} cm</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 block">Depth</span>
                  <span className="font-bold text-stone-800 dark:text-stone-100">{product.depth} cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details & Actions */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1.5">
                <span className="uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                  {product.brand}
                </span>
                <span className="capitalize px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                  {product.category}
                </span>
              </div>

              <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2 leading-tight">
                {product.title}
              </h2>

              {/* Rating & Stock */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1 text-sm font-semibold text-stone-800 dark:text-stone-200">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{product.rating}</span>
                  <span className="text-xs text-stone-400 font-normal">({product.rating_count} customer reviews)</span>
                </div>
                <span className="text-stone-300 dark:text-stone-700">•</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{product.availability === 'in_stock' ? 'In Stock (Ready to dispatch)' : 'Limited Stock'}</span>
                </span>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 mb-5">
                <span className="text-xs text-stone-400 block">Total Price (incl. GST)</span>
                <span className="text-3xl font-extrabold text-stone-900 dark:text-stone-100">
                  {formatPrice(product.price)}
                </span>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Material & Color Attributes */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase block font-semibold">Primary Material</span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">{product.material}</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase block font-semibold">Finish / Color</span>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">{product.color}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(product)}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    isSaved
                      ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm'
                      : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{isSaved ? 'Saved to Favorites' : 'Save Item'}</span>
                </button>
              )}

              {onToggleCompare && (
                <button
                  type="button"
                  onClick={() => onToggleCompare(product)}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    isCompared
                      ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm'
                      : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {isCompared ? <Check className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                  <span>{isCompared ? 'In Compare List (Remove)' : 'Add to Compare'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content-Based Similar Products Section */}
        <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                Similar Products
              </h3>
              <span className="text-xs text-stone-400">Content-Based Vector Retrieval</span>
            </div>
          </div>

          {loadingSimilar ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-44 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {similarItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectSimilar(item.product)}
                  className="group p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500/50 bg-stone-50 dark:bg-stone-950 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 mb-2">
                      <img
                        src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80'}
                        alt={item.product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h5 className="font-serif text-xs font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-500">
                      {item.product.title}
                    </h5>
                    <p className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">
                      {item.reason_description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-200 dark:border-stone-850 text-xs">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {formatPrice(item.product.price)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
