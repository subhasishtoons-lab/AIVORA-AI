import { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Edit3,
  ExternalLink,
  Link2,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { ToolLogo } from '../ToolLogo';
import {
  AITool,
  CategoryInfo,
  PricingModel,
  PublicationStatus,
} from '../../types/directory';
import {
  AdminToolSortOption,
  filterAndSortAdminTools,
  isToolPublished,
} from '../../utils/directory';

interface AdminToolsManagerProps {
  tools: AITool[];
  categories: CategoryInfo[];
  supabaseSchemaReady?: boolean;
  supabaseToolsCount: number | null;
  onSyncStarterTools: () => Promise<boolean>;
  onCreateNew: () => void;
  onEdit: (tool: AITool) => void;
  onQuickUpdate: (id: string, patch: Partial<AITool>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const PRICING_BADGE_CLASSES: Record<PricingModel, string> = {
  Free: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  Freemium:
    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300',
  Paid: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function AdminToolsManager({
  tools,
  categories,
  supabaseSchemaReady,
  supabaseToolsCount,
  onSyncStarterTools,
  onCreateNew,
  onEdit,
  onQuickUpdate,
  onDelete,
}: AdminToolsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [pricingFilter, setPricingFilter] = useState<'All' | PricingModel>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | PublicationStatus>('All');
  const [sortBy, setSortBy] = useState<AdminToolSortOption>('newest');

  const [pendingDeleteTool, setPendingDeleteTool] = useState<AITool | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyToolId, setBusyToolId] = useState<string | null>(null);
  const [isSyncingStarter, setIsSyncingStarter] = useState(false);

  useEffect(() => {
    if (!pendingDeleteTool) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) setPendingDeleteTool(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDeleteTool, isDeleting]);

  const filteredTools = useMemo(
    () =>
      filterAndSortAdminTools(tools, {
        query: searchQuery,
        category: categoryFilter,
        pricing: pricingFilter,
        status: statusFilter,
        sortBy,
      }),
    [tools, searchQuery, categoryFilter, pricingFilter, statusFilter, sortBy]
  );

  const publishedCount = useMemo(
    () => tools.filter((t) => isToolPublished(t)).length,
    [tools]
  );
  const draftCount = tools.length - publishedCount;
  const featuredCount = useMemo(
    () => tools.filter((t) => t.isFeatured).length,
    [tools]
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    categoryFilter !== 'All' ||
    pricingFilter !== 'All' ||
    statusFilter !== 'All' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setPricingFilter('All');
    setStatusFilter('All');
    setSortBy('newest');
  };

  const handleToggleFeatured = async (tool: AITool) => {
    setBusyToolId(tool.id);
    await onQuickUpdate(tool.id, { isFeatured: !tool.isFeatured });
    setBusyToolId(null);
  };

  const handleToggleStatus = async (tool: AITool) => {
    const nextStatus: PublicationStatus = isToolPublished(tool) ? 'draft' : 'published';
    setBusyToolId(tool.id);
    await onQuickUpdate(tool.id, { status: nextStatus });
    setBusyToolId(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTool) return;
    setIsDeleting(true);
    const ok = await onDelete(pendingDeleteTool.id);
    setIsDeleting(false);
    if (ok) {
      setPendingDeleteTool(null);
    }
  };

  const handleSyncStarter = async () => {
    setIsSyncingStarter(true);
    await onSyncStarterTools();
    setIsSyncingStarter(false);
  };

  return (
    <div className="space-y-5">
      {/* Empty Supabase Catalog Sync Prompt */}
      {supabaseSchemaReady && supabaseToolsCount === 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 sm:flex-row sm:items-center dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Supabase <code className="font-mono text-xs">ai_tools</code> table is currently empty
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Showing built-in starter catalog defaults. Sync them into PostgreSQL or create a new tool to store rows in Supabase.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSyncingStarter}
            onClick={handleSyncStarter}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSyncingStarter ? 'Syncing...' : 'Sync Starter Catalog to Supabase'}
          </button>
        </div>
      )}

      {/* Main Management Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        {/* Header & Primary Action */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Tools Management
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>
                <strong className="font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                  {tools.length}
                </strong>{' '}
                total
              </span>
              <span>
                <strong className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {publishedCount}
                </strong>{' '}
                published
              </span>
              <span>
                <strong className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                  {draftCount}
                </strong>{' '}
                draft
              </span>
              <span>
                <strong className="font-semibold text-indigo-600 tabular-nums dark:text-indigo-400">
                  {featuredCount}
                </strong>{' '}
                featured
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create New AI Tool</span>
          </button>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="admin-tools-search" className="sr-only">
              Search tools by name
            </label>
            <input
              id="admin-tools-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools by name..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="admin-tools-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="admin-tools-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="admin-tools-pricing" className="sr-only">
              Filter by pricing
            </label>
            <select
              id="admin-tools-pricing"
              value={pricingFilter}
              onChange={(e) => setPricingFilter(e.target.value as 'All' | PricingModel)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">All Pricing</option>
              <option value="Free">Free</option>
              <option value="Freemium">Freemium</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="admin-tools-status" className="sr-only">
              Filter by publication status
            </label>
            <select
              id="admin-tools-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'All' | PublicationStatus)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="admin-tools-sort" className="sr-only">
              Sort tools
            </label>
            <select
              id="admin-tools-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AdminToolSortOption)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="newest">Sort: Newest</option>
              <option value="name-asc">Sort: Name (A–Z)</option>
              <option value="name-desc">Sort: Name (Z–A)</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            Showing {filteredTools.length} of {tools.length} tools
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Empty Filtered State */}
        {filteredTools.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center dark:border-slate-800 dark:bg-slate-950/40">
            <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
              No AI tools match the current filters
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Adjust your tool name query, category, pricing, or publication status filter.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={onCreateNew}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Create New AI Tool
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Clean Management Table */}
            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">Tool</th>
                    <th className="py-2.5 px-3 font-medium">Category</th>
                    <th className="py-2.5 px-3 font-medium">Pricing</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Featured</th>
                    <th className="py-2.5 pl-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTools.map((tool) => {
                    const published = isToolPublished(tool);
                    const isBusy = busyToolId === tool.id;
                    return (
                      <tr
                        key={tool.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <ToolLogo
                              name={tool.name}
                              logoColor={tool.logoColor}
                              logoKey={tool.logoKey}
                              logoUrl={tool.logoUrl}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {tool.name}
                              </p>
                              <a
                                href={tool.affiliateUrl || tool.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-[220px] items-center gap-1 truncate text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                              >
                                {tool.affiliateUrl ? (
                                  <Link2 className="h-3 w-3 shrink-0 text-indigo-500" aria-hidden="true" />
                                ) : (
                                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                                )}
                                <span className="truncate">
                                  {tool.affiliateUrl || tool.websiteUrl}
                                </span>
                              </a>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-xs text-slate-700 dark:text-slate-300">
                          {tool.category}
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-medium ${PRICING_BADGE_CLASSES[tool.pricing]}`}
                          >
                            {tool.pricing}
                          </span>
                          {tool.pricingSummary && (
                            <p className="mt-1 max-w-[160px] truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {tool.pricingSummary}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            disabled={isBusy}
                            aria-label={`Toggle publication status for ${tool.name}`}
                            aria-pressed={published}
                            onClick={() => handleToggleStatus(tool)}
                            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                              published
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {published ? 'Published' : 'Draft'}
                          </button>
                        </td>

                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            disabled={isBusy}
                            aria-label={`Toggle featured status for ${tool.name}`}
                            aria-pressed={tool.isFeatured}
                            onClick={() => handleToggleFeatured(tool)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                              tool.isFeatured
                                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Star
                              className={`h-3 w-3 ${tool.isFeatured ? 'fill-amber-500 text-amber-500' : ''}`}
                              aria-hidden="true"
                            />
                            <span>{tool.isFeatured ? 'Featured' : 'Standard'}</span>
                          </button>
                        </td>

                        <td className="py-3.5 pl-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEdit(tool)}
                              aria-label={`Edit ${tool.name}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteTool(tool)}
                              aria-label={`Delete ${tool.name}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Stacked Cards */}
            <div className="mt-5 space-y-3 md:hidden">
              {filteredTools.map((tool) => {
                const published = isToolPublished(tool);
                const isBusy = busyToolId === tool.id;
                return (
                  <article
                    key={tool.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ToolLogo
                          name={tool.name}
                          logoColor={tool.logoColor}
                          logoKey={tool.logoKey}
                          logoUrl={tool.logoUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold text-slate-900 dark:text-white">
                            {tool.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {tool.category}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-medium ${PRICING_BADGE_CLASSES[tool.pricing]}`}
                      >
                        {tool.pricing}
                      </span>
                    </div>

                    <p className="mt-2.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                      {tool.shortDescription}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleStatus(tool)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                          published
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {published ? 'Published' : 'Draft'}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleFeatured(tool)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                          tool.isFeatured
                            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <Star
                          className={`h-3 w-3 ${tool.isFeatured ? 'fill-amber-500 text-amber-500' : ''}`}
                          aria-hidden="true"
                        />
                        <span>{tool.isFeatured ? 'Featured' : 'Standard'}</span>
                      </button>

                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(tool)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteTool(tool)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {pendingDeleteTool && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-tool-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setPendingDeleteTool(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3
              id="delete-tool-dialog-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Delete &ldquo;{pendingDeleteTool.name}&rdquo;?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This will permanently remove <strong>{pendingDeleteTool.name}</strong> from the Supabase{' '}
              <code className="font-mono text-xs">ai_tools</code> directory. You can alternatively switch its status to Draft to unpublish without deleting.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDeleteTool(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
