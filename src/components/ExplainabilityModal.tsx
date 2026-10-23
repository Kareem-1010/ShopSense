import React from 'react';
import { X, CheckCircle2, AlertCircle, HelpCircle, Layers, Cpu, FileText } from 'lucide-react';
import { Product, ExplanationSignals } from '../types/index.js';

interface ExplainabilityModalProps {
  product: Product | null;
  explanation: ExplanationSignals | null;
  onClose: () => void;
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({
  product,
  explanation,
  onClose
}) => {
  if (!product || !explanation) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Why this result?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Ranking Signal Diagnostics &amp; Retrieval Proof
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Snapshot */}
        <div className="my-4 p-3 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80'}
            alt={product.title}
            className="w-14 h-14 object-cover rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              <span>{product.brand}</span>
              <span>•</span>
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {formatPrice(product.price)}
              </span>
            </div>
          </div>
        </div>

        {/* Natural Language Explanation Summary */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 mb-4 leading-relaxed font-medium">
          {explanation.summary}
        </div>

        {/* Ranking Signals Grid */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Component Rank &amp; Retrieval Breakdown
          </h5>

          {/* Reciprocal Rank Fusion Breakdown */}
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-xs">
            <div className="flex items-center justify-between font-semibold text-stone-800 dark:text-stone-200 mb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Reciprocal Rank Fusion (RRF k=60)</span>
              </span>
              <span className="font-mono text-amber-500 font-bold">
                {explanation.rrf_score !== undefined ? explanation.rrf_score.toFixed(6) : 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-300">
              <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-1 text-stone-400 mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Lexical (BM25)</span>
                </div>
                <div className="font-mono font-semibold">
                  Rank: {explanation.lexical_rank ? `#${explanation.lexical_rank}` : 'Unranked'}
                </div>
                <div className="text-[10px] text-stone-400">Score: {explanation.lexical_score}</div>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-1 text-stone-400 mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Dense Semantic</span>
                </div>
                <div className="font-mono font-semibold">
                  Rank: {explanation.dense_rank ? `#${explanation.dense_rank}` : 'Unranked'}
                </div>
                <div className="text-[10px] text-stone-400">Cosine: {explanation.dense_similarity}</div>
              </div>
            </div>
          </div>

          {/* Structured Constraint Signals */}
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">Category Compatibility:</span>
              <span className="flex items-center gap-1 font-medium text-stone-800 dark:text-stone-200">
                {explanation.matched_category ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="capitalize">{explanation.category_name}</span>
                  </>
                ) : (
                  <span className="text-stone-400">Neutral</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">Price Constraint:</span>
              <span className="flex items-center gap-1 font-medium">
                {explanation.price_constraint_satisfied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Within Budget</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-500">Above Extracted Target</span>
                  </>
                )}
              </span>
            </div>

            {explanation.matched_materials.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Matched Materials:</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {explanation.matched_materials.join(', ')}
                </span>
              </div>
            )}

            {explanation.matched_title_terms.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">Matching Title Terms:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200 text-[11px]">
                  {explanation.matched_title_terms.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Close */}
        <div className="mt-5 pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
