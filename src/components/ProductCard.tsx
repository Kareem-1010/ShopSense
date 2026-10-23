import React, { useState } from 'react';
import { Star, HelpCircle, Scale, Bookmark, Check } from 'lucide-react';
import { Product, ExplanationSignals } from '../types/index.js';

interface ProductCardProps {
  product: Product;
  rank?: number;
  score?: number;
  rrfScore?: number;
  explanation?: ExplanationSignals;
  onSelect: (product: Product) => void;
  onExplain: (product: Product, explanation?: ExplanationSignals) => void;
  isCompared?: boolean;
  onToggleCompare?: (product: Product) => void;
  isSaved?: boolean;
  onToggleSave?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  rank,
  rrfScore,
  explanation,
  onSelect,
  onExplain,
  isCompared = false,
  onToggleCompare,
  isSaved = false,
  onToggleSave
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fallbackImage = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80';
  const displayImage = imageError || !product.images || product.images.length === 0
    ? fallbackImage
    : product.images[0];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="group relative bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      {/* Top Media Container */}
      <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-950 overflow-hidden cursor-pointer" onClick={() => onSelect(product)}>
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-stone-200 dark:bg-stone-800 animate-pulse" />
        )}
        <img
          src={displayImage}
          alt={product.title}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />

        {/* Rank & Score Badge */}
        {rank !== undefined && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-md border border-stone-700/60 text-white text-[11px] font-mono shadow">
            <span className="font-bold text-amber-400">#{rank}</span>
            {rrfScore !== undefined && (
              <span className="text-stone-300 border-l border-stone-700 pl-1.5">
                RRF {rrfScore.toFixed(4)}
              </span>
            )}
          </div>
        )}

        {/* Action icons overlay: Save & Compare */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          {onToggleSave && (
            <button
              type="button"
              aria-label={isSaved ? 'Saved to collection' : 'Save item'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(product);
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer relative z-20 ${
                isSaved
                  ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-stone-900/70 text-stone-200 hover:bg-stone-900 hover:text-white'
              }`}
              title={isSaved ? 'Saved to collection' : 'Save item'}
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleCompare && (
            <button
              type="button"
              aria-label={isCompared ? 'Remove from compare' : 'Compare product'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(product);
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer relative z-20 ${
                isCompared
                  ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-stone-900/70 text-stone-200 hover:bg-stone-900 hover:text-white'
              }`}
              title={isCompared ? 'Remove from compare' : 'Compare product'}
            >
              {isCompared ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Stock status indicator */}
        <div className="absolute bottom-2.5 left-2.5">
          {product.availability === 'in_stock' && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] font-semibold backdrop-blur-sm shadow">
              In Stock
            </span>
          )}
          {product.availability === 'low_stock' && (
            <span className="px-2 py-0.5 rounded bg-amber-500/90 text-stone-950 text-[10px] font-semibold backdrop-blur-sm shadow">
              Low Stock
            </span>
          )}
        </div>
      </div>

      {/* Product Information Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Brand */}
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="uppercase tracking-wider font-semibold text-[10px]">
              {product.brand}
            </span>
            <span className="capitalize text-[11px] font-medium text-stone-400">
              {product.category}
            </span>
          </div>

          {/* Title */}
          <h4
            onClick={() => onSelect(product)}
            className="font-serif text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-500 transition-colors line-clamp-2 cursor-pointer leading-snug mb-2"
          >
            {product.title}
          </h4>

          {/* Material & Color Attributes */}
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
              {product.material}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
              {product.color}
            </span>
          </div>
        </div>

        {/* Bottom Details: Price & Rating */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-stone-900 dark:text-stone-100">
              {formatPrice(product.price)}
            </span>
            <span className="text-[10px] text-stone-400 block">
              {product.width}x{product.height}x{product.depth} cm
            </span>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-xs font-semibold text-stone-700 dark:text-stone-200">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating}</span>
              <span className="text-[10px] text-stone-400 font-normal">({product.rating_count})</span>
            </div>

            {/* Why This Result Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExplain(product, explanation);
              }}
              className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Why this result?</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
