import { ArrowUpRight, Bookmark, GitCompare, Star } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { AITool } from '../types/directory';
import {
  buildOutboundRedirectPath,
  getToolRatingSummary,
  isToolSponsorActive,
  resolveOutboundUrl,
} from '../utils/directory';
import { ToolLogo } from './ToolLogo';

interface ToolCardProps {
  tool: AITool;
}

function getPricingBadgeStyle(pricing: AITool['pricing']): string {
  switch (pricing) {
    case 'Free':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80';
    case 'Freemium':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80';
    case 'Paid':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80';
  }
}

export function ToolCard({ tool }: ToolCardProps) {
  const {
    navigate,
    favorites,
    toggleFavorite,
    compareIds,
    toggleCompare,
    reviews,
  } = useDirectory();

  const isSaved = favorites.includes(tool.id);
  const isComparing = compareIds.includes(tool.id);
  const { averageRating, totalReviews } = getToolRatingSummary(tool, reviews);
  const isSponsored = isToolSponsorActive(tool);
  const isFeaturedTier =
    !isSponsored &&
    (tool.listingTier === 'Featured' || tool.isFeatured);
  const outboundInfo = resolveOutboundUrl(tool);
  const outboundHref = buildOutboundRedirectPath(tool.slug, 'card');

  return (
    <article
      className={`group flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
        isSponsored
          ? 'border-indigo-300/90 hover:border-indigo-400 dark:border-indigo-800/80 dark:hover:border-indigo-700'
          : 'border-slate-200/90 hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-800/80'
      }`}
    >
      <div>
        {/* Card header: Logo + Pricing badge + Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <ToolLogo
              name={tool.name}
              logoColor={tool.logoColor}
              logoKey={tool.logoKey}
              logoUrl={tool.logoUrl}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-display text-base font-semibold text-slate-900 truncate dark:text-white">
                  <a
                    href={`/tool/${tool.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/tool/${tool.slug}`);
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-2 focus-visible:outline-indigo-600 rounded"
                  >
                    {tool.name}
                  </a>
                </h3>
              </div>
              <p className="text-xs font-medium text-slate-500 truncate dark:text-slate-400">
                {tool.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${getPricingBadgeStyle(
                tool.pricing
              )}`}
            >
              {tool.pricing}
            </span>
            <button
              type="button"
              onClick={() => toggleFavorite(tool.id)}
              aria-label={
                isSaved
                  ? `Remove ${tool.name} from bookmarks`
                  : `Bookmark ${tool.name}`
              }
              aria-pressed={isSaved}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                isSaved
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Bookmark
                className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Short description */}
        <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-300">
          {tool.shortDescription}
        </p>

        {/* Clean unboxed inline rating & placement metadata */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {totalReviews > 0 ? (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 tabular-nums dark:text-slate-200">
                <Star
                  className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                  aria-hidden="true"
                />
                {averageRating.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {totalReviews.toLocaleString()} {totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">No reviews yet</span>
          )}
          {isSponsored ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Sponsored
              </span>
            </>
          ) : isFeaturedTier ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Featured
              </span>
            </>
          ) : tool.isTrending ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                Trending
              </span>
            </>
          ) : null}
          {outboundInfo.isAffiliate && (
            <>
              <span aria-hidden="true">·</span>
              <span title="Outbound click may earn referral commission at no extra cost to you">
                Affiliate link
              </span>
            </>
          )}
        </div>
      </div>

      {/* Card actions */}
      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => navigate(`/tool/${tool.slug}`)}
          className="flex-1 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-600 dark:bg-slate-800 dark:text-white dark:hover:bg-indigo-600"
        >
          View Details
        </button>
        <a
          href={outboundHref}
          target="_blank"
          rel={
            outboundInfo.isAffiliate
              ? 'noopener noreferrer sponsored'
              : 'noopener noreferrer'
          }
          className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span>Visit Website</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={() => toggleCompare(tool.id)}
          aria-label={
            isComparing
              ? `Remove ${tool.name} from comparison`
              : `Compare ${tool.name}`
          }
          aria-pressed={isComparing}
          title={isComparing ? 'Selected for comparison' : 'Add to compare'}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            isComparing
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-300'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
