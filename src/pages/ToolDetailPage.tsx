import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  GitCompare,
  Info,
  Minus,
  Star,
} from 'lucide-react';
import { ToolCard } from '../components/ToolCard';
import { ToolLogo } from '../components/ToolLogo';
import { useDirectory } from '../context/DirectoryContext';
import {
  buildOutboundRedirectPath,
  buildToolJsonLd,
  getSimilarTools,
  getToolRatingSummary,
  isToolPublished,
  isToolSponsorActive,
  resolveOutboundUrl,
  validateReviewInput,
} from '../utils/directory';

export function ToolDetailPage({ slug }: { slug: string }) {
  const {
    tools,
    blogPosts,
    reviews,
    favorites,
    compareIds,
    configStatus,
    toggleFavorite,
    toggleCompare,
    submitReview,
    recordToolView,
    currentUser,
    isAdmin,
    navigate,
    setSeoMeta,
  } = useDirectory();

  const tool = useMemo(() => tools.find((t) => t.slug === slug), [tools, slug]);

  const [author, setAuthor] = useState(currentUser?.fullName ?? '');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.fullName && !author) {
      setAuthor(currentUser.fullName);
    }
  }, [currentUser, author]);

  useEffect(() => {
    if (tool) {
      recordToolView(tool);
    }
  }, [tool?.id, recordToolView]);

  const ratingSummary = useMemo(
    () => (tool ? getToolRatingSummary(tool, reviews) : null),
    [tool, reviews]
  );

  useEffect(() => {
    if (tool && ratingSummary) {
      setSeoMeta(
        `${tool.name} — Features, Pricing & Reviews | AIVORA AI`,
        `${tool.shortDescription} Explore ${tool.name} features, pros and cons, sample pricing, and similar ${tool.category} alternatives.`,
        {
          canonicalPath: `/tool/${tool.slug}`,
          jsonLd: buildToolJsonLd(tool, ratingSummary, configStatus.siteUrl),
        }
      );
    } else {
      setSeoMeta('Tool Not Found | AIVORA AI', 'Requested AI tool could not be located.');
    }
  }, [tool, ratingSummary, configStatus.siteUrl, setSeoMeta]);

  if (!tool || (!isToolPublished(tool) && !isAdmin) || !ratingSummary) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          AI Tool Not Found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This listing may have been removed or renamed in the directory.
        </p>
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Back to AI Tools Directory
        </button>
      </div>
    );
  }

  const isSaved = favorites.includes(tool.id);
  const isComparing = compareIds.includes(tool.id);
  const { averageRating, totalReviews, toolReviews } = ratingSummary;
  const similarTools = getSimilarTools(tool, tools.filter(isToolPublished), 3);
  const relatedArticles = blogPosts.filter((p) =>
    p.relatedToolSlugs.includes(tool.slug)
  );
  const outboundInfo = resolveOutboundUrl(tool);
  const outboundHref = buildOutboundRedirectPath(tool.slug, 'detail');
  const isSponsored = isToolSponsorActive(tool);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateReviewInput({ author, rating, title, comment });
    if (err) {
      setReviewError(err);
      return;
    }
    setReviewError(null);
    await submitReview({
      toolId: tool.id,
      author: author.trim(),
      role: role.trim() || 'Community Reviewer',
      rating,
      title: title.trim(),
      comment: comment.trim(),
    });
    setTitle('');
    setComment('');
    setRole('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
      >
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="inline-flex items-center gap-1 font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Explore Tools</span>
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() =>
            navigate(`/explore?category=${encodeURIComponent(tool.category)}`)
          }
          className="hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {tool.category}
        </button>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-900 dark:text-white">{tool.name}</span>
      </nav>

      {/* Tool Hero Card */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <ToolLogo
              name={tool.name}
              logoColor={tool.logoColor}
              logoKey={tool.logoKey}
              logoUrl={tool.logoUrl}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  {tool.category}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {tool.pricing}
                </span>
                <span aria-hidden="true">·</span>
                {totalReviews > 0 ? (
                  <span className="inline-flex items-center gap-1 tabular-nums text-slate-700 dark:text-slate-200">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {averageRating.toFixed(1)} ({totalReviews.toLocaleString()} {totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">No reviews yet</span>
                )}
                {isSponsored && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Sponsored Listing
                    </span>
                  </>
                )}
                {!isToolPublished(tool) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Draft (Admin Preview)
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {tool.name}
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {tool.tagline}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={outboundHref}
              target="_blank"
              rel={
                outboundInfo.isAffiliate
                  ? 'noopener noreferrer sponsored'
                  : 'noopener noreferrer'
              }
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <span>Visit Official Website</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => toggleFavorite(tool.id)}
              aria-pressed={isSaved}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                isSaved
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
              <span>{isSaved ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleCompare(tool.id)}
              aria-pressed={isComparing}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                isComparing
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <GitCompare className="h-4 w-4" aria-hidden="true" />
              <span>{isComparing ? 'In Compare' : 'Compare'}</span>
            </button>
          </div>
        </div>

        {/* Clear Affiliate Disclosure */}
        <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span>
            <strong>Affiliate Disclosure:</strong> Outbound &ldquo;Visit Official Website&rdquo; links open in a new tab and record aggregate click metrics.{' '}
            {outboundInfo.isAffiliate
              ? `This listing uses an administrator-configured partner link${
                  outboundInfo.affiliateProgram ? ` (${outboundInfo.affiliateProgram})` : ''
                }; AIVORA AI may earn a referral fee at no additional cost to you.`
              : 'AIVORA AI may include partner tracking links when configured for a vendor, at zero extra cost to users.'}
          </span>
        </div>
      </section>

      {/* Main Content Split */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left 8 columns */}
        <div className="space-y-8 lg:col-span-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Overview
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {tool.description}
            </p>

            {tool.features.length > 0 && (
              <>
                <h3 className="mt-8 font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Main Features
                </h3>
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {tool.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Pros & Cons */}
          {(tool.pros.length > 0 || tool.cons.length > 0) && (
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {tool.pros.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Pros
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {tool.pros.map((pro) => (
                      <li key={pro} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tool.cons.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Cons &amp; Limitations
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {tool.cons.map((con) => (
                      <li key={con} className="flex items-start gap-2.5">
                        <Minus
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                          aria-hidden="true"
                        />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Best Use Cases */}
          {tool.bestUseCases.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Best Use Cases
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                {tool.bestUseCases.map((useCase, idx) => (
                  <li key={useCase} className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-xs font-semibold text-indigo-600 tabular-nums dark:text-indigo-400">
                      0{idx + 1}.
                    </span>
                    <span>{useCase}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Internal Links to Editorial Articles mentioning this tool */}
          {relatedArticles.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Featured In AIVORA AI Editorial Guides
              </h2>
              <div className="mt-4 space-y-3">
                {relatedArticles.map((art) => (
                  <a
                    key={art.id}
                    href={`/blog/${art.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/blog/${art.slug}`);
                    }}
                    className="block rounded-xl border border-slate-100 p-4 transition-colors hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-indigo-800 dark:hover:bg-slate-800/40"
                  >
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {art.category}
                    </p>
                    <p className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {art.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                      {art.excerpt}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* User Ratings & Reviews */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  User Ratings &amp; Reviews
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Share verified workflow notes on {tool.name}.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
                {totalReviews > 0 ? (
                  <>
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
                    <span className="font-display text-xl font-bold text-slate-900 tabular-nums dark:text-white">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      / 5.0 ({totalReviews.toLocaleString()})
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    No reviews yet
                  </span>
                )}
              </div>
            </div>

            <form
              onSubmit={handleReviewSubmit}
              className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Write a Review for {tool.name}
              </h3>

              {reviewError && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {reviewError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="rev-author" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Your Name
                  </label>
                  <input
                    id="rev-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Alex Rivera"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="rev-role" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Role (optional)
                  </label>
                  <input
                    id="rev-role"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Product Designer"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="rev-rating" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Rating
                  </label>
                  <select
                    id="rev-rating"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value={5}>5 Stars — Exceptional</option>
                    <option value={4}>4 Stars — Very Good</option>
                    <option value={3}>3 Stars — Useful</option>
                    <option value={2}>2 Stars — Limited</option>
                    <option value={1}>1 Star — Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="rev-title" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Review Headline
                </label>
                <input
                  id="rev-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="rev-comment" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Detailed Feedback
                </label>
                <textarea
                  id="rev-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What worked well, and where did you hit limits?"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                >
                  Publish Review
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-4">
              {toolReviews.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No written user reviews yet for {tool.name}. Be the first to share your experience above.
                </p>
              ) : (
                toolReviews.map((rev) => (
                  <article
                    key={rev.id}
                    className="rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                          {rev.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {rev.author} · {rev.role} · {rev.createdAt}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                        {rev.rating}.0
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {rev.comment}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right 4 columns: Pricing & Quick Facts */}
        <aside className="space-y-6 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Pricing Information
              </h2>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {tool.pricing}
              </span>
            </div>

            {tool.pricingSummary && (
              <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {tool.pricingSummary}
              </p>
            )}

            {tool.pricingSnapshotDate && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tool.pricingSnapshotDate}</span>
              </div>
            )}

            {tool.pricingTiers.length > 0 && (
              <div className="mt-4 space-y-3">
                {tool.pricingTiers.map((tier) => (
                  <div
                    key={tier.plan}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        {tier.plan}
                      </span>
                      <span className="font-mono text-sm font-semibold text-indigo-600 tabular-nums dark:text-indigo-400">
                        {tier.price}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {tier.details}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <a
              href={outboundHref}
              target="_blank"
              rel={
                outboundInfo.isAffiliate
                  ? 'noopener noreferrer sponsored'
                  : 'noopener noreferrer'
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600"
            >
              <span>Visit Official Website</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>

      {/* Similar AI Tools */}
      {similarTools.length > 0 && (
        <section className="mt-14 border-t border-slate-200 pt-12 dark:border-slate-800">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Similar AI Tools
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Alternatives and complementary tools in {tool.category}.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {similarTools.map((sim) => (
              <ToolCard key={sim.id} tool={sim} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
