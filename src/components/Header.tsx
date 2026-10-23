import React from 'react';
import {
  Compass,
  BarChart3,
  Scale,
  Bookmark,
  Sparkles,
  Info
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'discovery' | 'evaluation';
  setActiveTab: (tab: 'discovery' | 'evaluation') => void;
  savedCount: number;
  compareCount: number;
  onOpenCompare: () => void;
  onOpenSaved: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  compareCount,
  onOpenCompare,
  onOpenSaved
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('discovery')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 font-bold shadow-md shadow-amber-900/20">
              <Sparkles className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-bold tracking-tight text-white">ShopSense</span>
                <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  IR Engine
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Hybrid Product Search &amp; Recommendation Platform
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('discovery')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'discovery'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Discovery</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'evaluation'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>IR Evaluation</span>
              <span className="hidden md:inline text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                53 Queries
              </span>
            </button>
          </nav>

          {/* Right Action Icons: Saved, Compare, Demo Banner */}
          <div className="flex items-center space-x-3">
            {/* Compare items button */}
            <button
              onClick={onOpenCompare}
              className={`relative p-2 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                compareCount > 0
                  ? 'bg-stone-800 text-amber-400 border border-stone-700'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
              title="Compare selected products"
            >
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">Compare</span>
              {compareCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-amber-500 text-stone-950">
                  {compareCount}
                </span>
              )}
            </button>

            {/* Saved items button */}
            <button
              onClick={onOpenSaved}
              className={`relative p-2 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                savedCount > 0
                  ? 'bg-stone-800 text-amber-400 border border-stone-700'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
              title="Saved items"
            >
              <Bookmark className="w-4 h-4" />
              {savedCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-stone-700 text-stone-200 border border-stone-600">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Catalog Synthetic Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-800/80 border border-stone-700/60 text-[11px] text-stone-400">
              <Info className="w-3.5 h-3.5 text-stone-400" />
              <span>Synthetic Catalog (525 items)</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
