import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Layers, Cpu, FileText, ArrowRight } from 'lucide-react';
import { SearchMode } from '../types/index.js';
import { getSuggestions } from '../services/api.js';

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q?: string) => void;
  mode: SearchMode;
  onModeChange: (m: SearchMode) => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  'A compact wooden desk for a small apartment under 15000 rupees',
  'Comfortable beige sofa for a modern living room',
  'Storage bed with drawers for a small bedroom',
  'Find a similar dining table but cheaper',
  'Show alternatives to this chair with better reviews',
  'Minimalist lamps suitable for a warm reading corner'
];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  onSearch,
  mode,
  onModeChange,
  isLoading
}) => {
  const [inputValue, setInputValue] = useState(query);
  const [suggestions, setSuggestions] = useState<{ text: string; type: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal input value with prop query
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Debounced auto-suggestions
  useEffect(() => {
    if (!inputValue.trim() || inputValue.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await getSuggestions(inputValue.trim());
        setSuggestions(results);
      } catch (e) {
        console.error('Failed to fetch suggestions:', e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    onQueryChange(inputValue);
    onSearch(inputValue);
  };

  const handleSelectSuggestion = (text: string) => {
    setInputValue(text);
    setShowDropdown(false);
    onQueryChange(text);
    onSearch(text);
  };

  const handleSelectExample = (example: string) => {
    setInputValue(example);
    setShowDropdown(false);
    onQueryChange(example);
    onSearch(example);
  };

  const clearInput = () => {
    setInputValue('');
    onQueryChange('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative z-30">
        <div className="relative flex items-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-lg shadow-stone-200/50 dark:shadow-stone-950/50 hover:border-amber-500/50 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 transition-all">
          <div className="pl-4 sm:pl-5 text-stone-400">
            <Search className={`w-5 h-5 ${isLoading ? 'animate-pulse text-amber-500' : ''}`} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Describe what you're looking for (e.g. 'compact wooden desk under 15000', 'comfortable beige sofa')..."
            className="w-full py-4 pl-3.5 pr-28 sm:pr-36 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 bg-transparent text-sm sm:text-base focus:outline-none"
          />

          {inputValue && (
            <button
              type="button"
              onClick={clearInput}
              className="p-1.5 mr-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="pr-2 sm:pr-3">
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs sm:text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all"
            >
              <span>Search</span>
              <ArrowRight className="w-4 h-4 hidden sm:inline" />
            </button>
          </div>
        </div>

        {/* Live Auto-Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl py-2 z-50 overflow-hidden"
          >
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-stone-400 dark:text-stone-500">
              Matching Suggestions
            </div>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(item.text)}
                className="w-full text-left px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between text-sm text-stone-800 dark:text-stone-200 transition-colors"
              >
                <span className="truncate">{item.text}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-mono capitalize">
                  {item.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Retrieval Mode Selector */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1 sm:space-x-2 bg-stone-100 dark:bg-stone-900/90 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
          <span className="px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Mode:
          </span>

          <button
            type="button"
            onClick={() => onModeChange('hybrid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'hybrid'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hybrid (RRF)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-950/20 text-stone-900 font-bold">
              Default
            </span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('semantic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'semantic'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Semantic (Dense)</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('keyword')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === 'keyword'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Keyword (Lexical)</span>
          </button>
        </div>

        <div className="text-[11px] text-stone-500 dark:text-stone-400 italic hidden md:block">
          {mode === 'hybrid' && 'Reciprocal Rank Fusion (k=60) combining lexical BM25 & dense cosine vectors.'}
          {mode === 'semantic' && 'Dense 64-dim semantic embeddings with cosine similarity distance.'}
          {mode === 'keyword' && 'Weighted full-text search with title, category, and field weights.'}
        </div>
      </div>

      {/* Curated Prompt Examples */}
      <div className="mt-3.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 text-xs no-scrollbar">
          <span className="text-stone-400 text-[11px] whitespace-nowrap font-medium">Try queries:</span>
          {EXAMPLE_QUERIES.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectExample(ex)}
              className="whitespace-nowrap px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-850 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 transition-colors text-[11px]"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
