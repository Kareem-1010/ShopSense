import { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  ArrowUpDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Bookmark,
  Armchair,
  Lamp,
  Bed,
  Layers,
  Utensils,
  Box,
  Palette,
  Package,
  BookOpen
} from 'lucide-react';
import {
  Product,
  SearchMode,
  SearchFilters,
  SortOption,
  SearchResponse,
  ExplanationSignals,
  RecommendationResponse
} from './types/index.js';
import {
  searchProducts,
  getRecommendations,
  recordInteraction
} from './services/api.js';
import { Header } from './components/Header.js';
import { SearchBar } from './components/SearchBar.js';
import { FiltersSidebar } from './components/FiltersSidebar.js';
import { ProductCard } from './components/ProductCard.js';
import { ExplainabilityModal } from './components/ExplainabilityModal.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { CompareDrawer } from './components/CompareDrawer.js';
import { EvaluationDashboard } from './components/EvaluationDashboard.js';

const CATEGORY_ICONS: Record<string, any> = {
  desks: BookOpen,
  chairs: Armchair,
  sofas: Armchair,
  beds: Bed,
  storage: Box,
  dining: Utensils,
  lighting: Lamp,
  rugs: Layers,
  shelves: Package,
  accessories: Palette
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'discovery' | 'evaluation'>('discovery');
  const [sessionId] = useState<string>(() => {
    const existing = localStorage.getItem('shopsense_session_id');
    if (existing) return existing;
    const generated = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('shopsense_session_id', generated);
    return generated;
  });

  // Search State
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<SortOption>('relevance');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  // Search Results
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Recommendations
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);

  // Saved & Compared Products
  const [savedProducts, setSavedProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem('shopsense_saved_products');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Active Modals
  const [activeDetailProduct, setActiveDetailProduct] = useState<Product | null>(null);
  const [explainProduct, setExplainProduct] = useState<Product | null>(null);
  const [explainSignals, setExplainSignals] = useState<ExplanationSignals | null>(null);

  // Fetch search results
  const executeQuery = useCallback(async (
    q = query,
    currentMode = searchMode,
    currentFilters = filters,
    currentSort = sort,
    currentPage = page
  ) => {
    setIsSearching(true);
    setSearchError(null);
    // Clear stale results immediately so user doesn't see old items
    setSearchResponse(null);
    try {
      const response = await searchProducts({
        query: q,
        mode: currentMode,
        filters: currentFilters,
        sort: currentSort,
        page: currentPage,
        pageSize,
        sessionId
      });
      setSearchResponse(response);
    } catch (err: any) {
      setSearchError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [query, searchMode, filters, sort, page, pageSize, sessionId]);

  // Execute query when query, searchMode, filters, sort, or page change
  useEffect(() => {
    executeQuery(query, searchMode, filters, sort, page);
  }, [query, searchMode, filters, sort, page, executeQuery]);

  // Load recommendations
  const refreshRecommendations = useCallback(async () => {
    try {
      const recs = await getRecommendations(sessionId, 8);
      setRecommendations(recs);
    } catch (e) {
      console.warn('Failed to load recommendations:', e);
    }
  }, [sessionId]);

  useEffect(() => {
    refreshRecommendations();
  }, [refreshRecommendations]);

  // Handle Save product toggle
  const toggleSaveProduct = (product: Product) => {
    setSavedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      let updated: Product[];
      if (exists) {
        updated = prev.filter((p) => p.id !== product.id);
      } else {
        updated = [product, ...prev];
        // Record save interaction event
        recordInteraction({
          session_id: sessionId,
          product_id: product.id,
          event_type: 'save',
          timestamp: new Date().toISOString()
        });
        // Trigger recommendations refresh after user interest change
        setTimeout(refreshRecommendations, 500);
      }
      localStorage.setItem('shopsense_saved_products', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle Compare toggle
  const toggleCompareProduct = (product: Product) => {
    setCompareProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 3) {
        alert('You can compare up to 3 products at a time.');
        return prev;
      }
      recordInteraction({
        session_id: sessionId,
        product_id: product.id,
        event_type: 'compare',
        timestamp: new Date().toISOString()
      });
      return [...prev, product];
    });
  };

  const handleOpenExplain = (product: Product, explanation?: ExplanationSignals) => {
    setExplainProduct(product);
    setExplainSignals(explanation || null);
  };

  const handleSelectProduct = (product: Product) => {
    setActiveDetailProduct(product);
  };

  const handleCategoryClick = (cat: string) => {
    const nextFilters = { ...filters, category: cat };
    setFilters(nextFilters);
    setPage(1);
  };

  const availableCategories = [
    'desks', 'chairs', 'sofas', 'beds', 'storage', 'dining', 'lighting', 'rugs', 'shelves', 'accessories'
  ];

  const availableBrands = [
    'NordicCraft', 'UrbanWood', 'Habitat Living', 'Studio Forma', 'ArtisanTeak', 'Loom & Weft', 'Elysian Home', 'Vanguard Studio', 'Minimalia', 'Timber & Steel'
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Global Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedProducts.length}
        compareCount={compareProducts.length}
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenSaved={() => setIsSavedDrawerOpen(true)}
      />

      {/* Main Tab Content */}
      {activeTab === 'evaluation' ? (
        <EvaluationDashboard />
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          {/* Prominent Discovery Search Section */}
          <div className="pt-2 pb-4">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <span className="text-[11px] font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
                Intelligent Discovery &amp; Ranking
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white mt-1">
                Discover Furniture Designed for Your Life
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
                Natural-language retrieval, dense semantic vector embeddings, and Reciprocal Rank Fusion relevance ranking.
              </p>
            </div>

            <SearchBar
              query={query}
              onQueryChange={setQuery}
              onSearch={(q) => {
                if (q !== undefined) setQuery(q);
                setPage(1);
              }}
              mode={searchMode}
              onModeChange={(m) => {
                setSearchMode(m);
                setPage(1);
              }}
              isLoading={isSearching}
            />
          </div>

          {/* Category Navigation Pills */}
          {!query && Object.keys(filters).length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Explore by Category
                </h3>
                <span className="text-xs text-stone-400">525 Handcrafted Designs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                {availableCategories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat] || Compass;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 hover:shadow-md transition-all flex flex-col items-center text-center group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors mb-1.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold capitalize text-stone-800 dark:text-stone-200 group-hover:text-amber-500 transition-colors">
                        {cat}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Interpretation Diagnostics Bar */}
          {searchResponse && (
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {searchResponse.total_results} Products Found
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono text-[11px]">
                  Mode: <strong className="capitalize text-amber-500">{searchResponse.search_mode_used}</strong>
                  {searchResponse.search_mode_used === 'hybrid' && ' (RRF k=60)'}
                </span>

                {searchResponse.fallback_reason && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-medium animate-pulse" title={searchResponse.fallback_reason}>
                    Fallback: {searchResponse.fallback_reason}
                  </span>
                )}

                {searchResponse.pgvector_enabled && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                    pgvector
                  </span>
                )}

                <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono text-[11px]" title="High-resolution monotonic timer (performance.now)">
                  Latency: <strong>{searchResponse.latency_ms}ms (monotonic)</strong>
                </span>

                {query.trim() && (
                  <span className="text-[11px] text-stone-400 font-mono hidden lg:inline">
                    (Lexical: {searchResponse.active_candidates_count.lexical} | Dense: {searchResponse.active_candidates_count.dense})
                  </span>
                )}

                {/* Query understanding extracted pills */}
                {searchResponse.parsed_query.extracted_category && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium text-[11px]">
                    Category: {searchResponse.parsed_query.extracted_category}
                  </span>
                )}
                {searchResponse.parsed_query.extracted_price_max && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium text-[11px]">
                    Target &le; ₹{searchResponse.parsed_query.extracted_price_max.toLocaleString('en-IN')}
                  </span>
                )}
                {searchResponse.parsed_query.extracted_materials.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[11px]">
                    Material: {searchResponse.parsed_query.extracted_materials.join(', ')}
                  </span>
                )}
                {searchResponse.parsed_query.intent !== 'search' && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium text-[11px]">
                    Intent: {searchResponse.parsed_query.intent}
                  </span>
                )}
              </div>

              {/* Sort Selector & Mobile Filter Button */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-xs font-medium"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as SortOption);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs text-stone-800 dark:text-stone-200 focus:outline-none"
                  >
                    <option value="relevance">Sort: Relevance (RRF)</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating_desc">Highest Rated</option>
                    <option value="popularity">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Search Body: Filter Sidebar + Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Desktop Filters Sidebar */}
            <div className="hidden md:block">
              <FiltersSidebar
                filters={filters}
                onChange={(f) => {
                  setFilters(f);
                  setPage(1);
                }}
                onClear={() => {
                  setFilters({});
                  setPage(1);
                }}
                availableCategories={availableCategories}
                availableBrands={availableBrands}
                totalResultsCount={searchResponse?.total_results || 0}
              />
            </div>

            {/* Mobile Filters Drawer Modal */}
            {mobileFilterOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-stone-950/70 p-4 overflow-y-auto">
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-4">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setMobileFilterOpen(false)}
                      className="text-xs px-3 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 font-semibold"
                    >
                      Done
                    </button>
                  </div>
                  <FiltersSidebar
                    filters={filters}
                    onChange={(f) => {
                      setFilters(f);
                      setPage(1);
                    }}
                    onClear={() => {
                      setFilters({});
                      setPage(1);
                    }}
                    availableCategories={availableCategories}
                    availableBrands={availableBrands}
                    totalResultsCount={searchResponse?.total_results || 0}
                  />
                </div>
              </div>
            )}

            {/* Main Products Grid */}
            <div className="md:col-span-3 space-y-6">
              {isSearching ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-80 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : searchError ? (
                <div className="p-8 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl">
                  <p className="text-sm font-semibold text-red-500">Search Error</p>
                  <p className="text-xs text-stone-400 mt-1">{searchError}</p>
                </div>
              ) : !searchResponse || searchResponse.results.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl space-y-3">
                  <Package className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-600" />
                  <h4 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
                    No matching products found
                  </h4>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    Try broadening your search term or adjusting filters. Check out our example queries below:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        setQuery('comfortable sofa');
                        setFilters({});
                      }}
                      className="px-3 py-1 text-xs rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/20 text-stone-600 dark:text-stone-300"
                    >
                      "comfortable sofa"
                    </button>
                    <button
                      onClick={() => {
                        setQuery('wooden desk');
                        setFilters({});
                      }}
                      className="px-3 py-1 text-xs rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/20 text-stone-600 dark:text-stone-300"
                    >
                      "wooden desk"
                    </button>
                    <button
                      onClick={() => {
                        setQuery('reading lamp');
                        setFilters({});
                      }}
                      className="px-3 py-1 text-xs rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/20 text-stone-600 dark:text-stone-300"
                    >
                      "reading lamp"
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {searchResponse.results.map((item) => (
                    <ProductCard
                      key={item.product.id}
                      product={item.product}
                      rank={item.rank}
                      score={item.score}
                      rrfScore={item.rrf_score}
                      explanation={item.explanation}
                      onSelect={handleSelectProduct}
                      onExplain={handleOpenExplain}
                      isCompared={compareProducts.some((p) => p.id === item.product.id)}
                      onToggleCompare={toggleCompareProduct}
                      isSaved={savedProducts.some((p) => p.id === item.product.id)}
                      onToggleSave={toggleSaveProduct}
                    />
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {searchResponse && searchResponse.total_pages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800 text-xs">
                  <span className="text-stone-400">
                    Showing {(page - 1) * pageSize + 1} -{' '}
                    {Math.min(page * pageSize, searchResponse.total_results)} of{' '}
                    {searchResponse.total_results}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold px-2">
                      {page} / {searchResponse.total_pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(searchResponse.total_pages, p + 1))}
                      disabled={page === searchResponse.total_pages}
                      className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 disabled:opacity-30 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Recommendations Engine Showcase */}
          {recommendations && recommendations.recommendations.length > 0 && (
            <div className="pt-8 border-t border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                    Recommended For You
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold border border-amber-500/30 capitalize">
                    {recommendations.strategy_used.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs text-stone-400">
                  {recommendations.strategy_used === 'interaction_personalized'
                    ? 'Adaptive personalization trained on your active browsing history'
                    : 'Curated cold-start discoveries across premier categories'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {recommendations.recommendations.map((item, idx) => (
                  <ProductCard
                    key={idx}
                    product={item.product}
                    onSelect={handleSelectProduct}
                    onExplain={handleOpenExplain}
                    isCompared={compareProducts.some((p) => p.id === item.product.id)}
                    onToggleCompare={toggleCompareProduct}
                    isSaved={savedProducts.some((p) => p.id === item.product.id)}
                    onToggleSave={toggleSaveProduct}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Saved Items Drawer */}
      {isSavedDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-500" />
                  <h3 className="font-serif text-lg font-bold">Saved Items ({savedProducts.length})</h3>
                </div>
                <button
                  onClick={() => setIsSavedDrawerOpen(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto max-h-[75vh]">
                {savedProducts.length === 0 ? (
                  <div className="py-16 text-center text-stone-400">
                    <Bookmark className="w-10 h-10 mx-auto text-stone-600 mb-2" />
                    <p className="text-xs">No saved products yet.</p>
                  </div>
                ) : (
                  savedProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setIsSavedDrawerOpen(false);
                        handleSelectProduct(p);
                      }}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 flex items-center gap-3 cursor-pointer hover:border-amber-500/50"
                    >
                      <img
                        src={p.images?.[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80'}
                        alt={p.title}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-semibold truncate">{p.title}</h5>
                        <span className="text-xs font-bold text-amber-500">
                          ₹{p.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setIsSavedDrawerOpen(false)}
              className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold"
            >
              Close Tray
            </button>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      <ProductDetailModal
        product={activeDetailProduct}
        onClose={() => setActiveDetailProduct(null)}
        onSelectSimilar={(p) => setActiveDetailProduct(p)}
        sessionId={sessionId}
        isCompared={activeDetailProduct ? compareProducts.some((p) => p.id === activeDetailProduct.id) : false}
        onToggleCompare={toggleCompareProduct}
        isSaved={activeDetailProduct ? savedProducts.some((p) => p.id === activeDetailProduct.id) : false}
        onToggleSave={toggleSaveProduct}
      />

      {/* Explainability Diagnostics Modal */}
      <ExplainabilityModal
        product={explainProduct}
        explanation={explainSignals}
        onClose={() => {
          setExplainProduct(null);
          setExplainSignals(null);
        }}
      />

      {/* Comparison Drawer */}
      <CompareDrawer
        products={compareProducts}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onRemove={(id) => setCompareProducts((prev) => prev.filter((p) => p.id !== id))}
        onClear={() => setCompareProducts([])}
        onSelectProduct={(p) => {
          setIsCompareOpen(false);
          setActiveDetailProduct(p);
        }}
      />

      {/* Editorial Footer */}
      <footer className="mt-16 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 py-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-900 dark:text-stone-100">ShopSense</span>
            <span>— Intelligent Product Discovery &amp; Recommendation Engine</span>
          </div>
          <div className="text-[11px] text-stone-400 text-center sm:text-right">
            Certified synthetic dataset (525 catalog records) for Information Retrieval evaluation &amp; benchmarking.
          </div>
        </div>
      </footer>
    </div>
  );
}
