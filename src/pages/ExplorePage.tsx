import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { ToolCardSkeleton } from '../components/LoadingSkeleton';
import { ToolCard } from '../components/ToolCard';
import { useDirectory } from '../context/DirectoryContext';
import { PricingFilter, SortOption } from '../types/directory';
import {
  buildExploreUrl,
  filterAndSortTools,
  normalizeCategoryName,
} from '../utils/directory';

const PRICING_OPTIONS: Array<PricingFilter> = [
  'All',
  'Free',
  'Freemium',
  'Paid',
];

function parsePricingParam(value: string | null): PricingFilter {
  if (
    value === 'Free' ||
    value === 'Freemium' ||
    value === 'Paid' ||
    value === 'Free & Freemium'
  ) {
    return value;
  }
  return 'All';
}

export function ExplorePage() {
  const {
    tools,
    categories,
    favorites,
    searchParams,
    setSeoMeta,
    isLoading,
    directoryError,
    retryDirectoryLoad,
    setSubmitModalOpen,
    trackSearchQuery,
  } = useDirectory();

  const parseCatParam = (raw: string | null) =>
    raw && raw !== 'All' ? normalizeCategoryName(raw) : 'All';

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [selectedCategory, setSelectedCategory] = useState(
    () => parseCatParam(searchParams.get('category'))
  );
  const [selectedPricing, setSelectedPricing] = useState<PricingFilter>(() =>
    parsePricingParam(searchParams.get('pricing'))
  );
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const s = searchParams.get('sort');
    return s === 'rating' || s === 'reviews' || s === 'newest' || s === 'name'
      ? s
      : 'featured';
  });
  const [favoritesOnly, setFavoritesOnly] = useState(
    () => searchParams.get('saved') === '1'
  );

  // Sync URL query params when navigating from homepage, footer, or category links
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
    setSelectedCategory(parseCatParam(searchParams.get('category')));
    setSelectedPricing(parsePricingParam(searchParams.get('pricing')));
    const s = searchParams.get('sort');
    setSortBy(
      s === 'rating' || s === 'reviews' || s === 'newest' || s === 'name'
        ? s
        : 'featured'
    );
    setFavoritesOnly(searchParams.get('saved') === '1');
  }, [searchParams]);

  // Debounced real search keyword logging
  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) return;
    const handle = window.setTimeout(() => {
      trackSearchQuery(clean);
    }, 600);
    return () => window.clearTimeout(handle);
  }, [query, trackSearchQuery]);

  // Keep browser URL synchronized with current filters without scrolling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targetUrl = buildExploreUrl({
      query,
      category: selectedCategory,
      pricing: selectedPricing,
      sortBy,
      favoritesOnly,
    });
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== targetUrl) {
      window.history.replaceState({}, '', targetUrl);
    }
  }, [query, selectedCategory, selectedPricing, sortBy, favoritesOnly]);

  useEffect(() => {
    const titlePrefix =
      selectedCategory !== 'All' ? `${selectedCategory} Tools` : 'Explore AI Tools';
    setSeoMeta(
      `${titlePrefix} | AIVORA AI Directory`,
      `Browse, search, filter, and compare verified ${titlePrefix.toLowerCase()} by pricing model, user rating, and use case.`,
      { canonicalPath: '/explore' }
    );
  }, [selectedCategory, setSeoMeta]);

  const filteredTools = useMemo(
    () =>
      filterAndSortTools(tools, {
        query,
        category: selectedCategory,
        pricing: selectedPricing,
        sortBy,
        favoritesOnly,
        favoriteIds: favorites,
      }),
    [tools, query, selectedCategory, selectedPricing, sortBy, favoritesOnly, favorites]
  );

  const hasActiveFilters =
    query.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedPricing !== 'All' ||
    favoritesOnly;

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('All');
    setSelectedPricing('All');
    setSortBy('featured');
    setFavoritesOnly(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-8 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Explore AI Tools
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Search, filter, and compare <span className="tabular-nums font-medium">{tools.length}</span> curated AI products across <span className="tabular-nums font-medium">{categories.length}</span> categories.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSubmitModalOpen(true)}
          className="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Submit AI Tool</span>
        </button>
      </div>

      {directoryError && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <span>{directoryError}</span>
          <button
            type="button"
            onClick={retryDirectoryLoad}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1 font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Search input */}
          <div className="relative lg:col-span-5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="directory-search" className="sr-only">
              Search directory
            </label>
            <input
              id="directory-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tool name or description..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Pricing segmented filter */}
          <div
            role="group"
            aria-label="Filter by pricing model"
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900"
          >
            {PRICING_OPTIONS.map((option) => {
              const active = selectedPricing === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedPricing(option)}
                  aria-pressed={active}
                  className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Sort & Favorites */}
          <div className="flex items-center gap-2 lg:col-span-3">
            <div className="relative flex-1">
              <label htmlFor="directory-sort" className="sr-only">
                Sort tools
              </label>
              <select
                id="directory-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="featured">Sort: Featured</option>
                <option value="rating">Sort: Highest Rated</option>
                <option value="reviews">Sort: Most Reviewed</option>
                <option value="newest">Sort: Recently Added</option>
                <option value="name">Sort: Name (A–Z)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              aria-pressed={favoritesOnly}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                favoritesOnly
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/70 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark
                className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              <span className="tabular-nums">Saved ({favorites.length})</span>
            </button>
          </div>
        </div>

        {/* Category filter buttons */}
        <div
          role="group"
          aria-label="Filter by category"
          className="flex flex-wrap items-center gap-1.5 pt-1"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            aria-pressed={selectedCategory === 'All'}
            className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === 'All'
                ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const active = selectedCategory === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results meta bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Showing{' '}
            <strong className="font-semibold text-slate-900 tabular-nums dark:text-white">
              {filteredTools.length}
            </strong>{' '}
            {filteredTools.length === 1 ? 'AI tool' : 'AI tools'}
            {selectedPricing === 'Free & Freemium' && (
              <>
                {' · '}
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  Free &amp; Freemium
                </span>
              </>
            )}
          </span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Grid / Loading / Empty State */}
      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <ToolCardSkeleton key={idx} />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/70 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            No matching AI tools found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            {favoritesOnly
              ? 'You have no bookmarked tools matching the active filters yet.'
              : 'Try broadening your search terms or clearing the category and pricing filters.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Reset All Filters
            </button>
            <button
              type="button"
              onClick={() => setSubmitModalOpen(true)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Submit Missing Tool
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
