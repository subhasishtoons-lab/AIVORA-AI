import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Compass,
  Mail,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { ToolCardSkeleton } from '../components/LoadingSkeleton';
import { ToolCard } from '../components/ToolCard';
import { useDirectory } from '../context/DirectoryContext';
import {
  buildWebsiteJsonLd,
  filterAndSortTools,
  getListingPriorityScore,
  isToolPublished,
  normalizeCategoryName,
  validateEmail,
} from '../utils/directory';

const POPULAR_SEARCHES = [
  { label: 'ChatGPT', query: 'ChatGPT' },
  { label: 'Cursor', query: 'Cursor' },
  { label: 'AI Video', query: 'Video' },
  { label: 'ElevenLabs', query: 'ElevenLabs' },
  { label: 'Notion AI', query: 'Notion' },
];

export function HomePage() {
  const {
    tools,
    categories,
    blogPosts,
    configStatus,
    isLoading,
    directoryError,
    retryDirectoryLoad,
    navigate,
    setSeoMeta,
    subscribeNewsletter,
    setSubmitModalOpen,
    trackSearchQuery,
  } = useDirectory();

  const [heroQuery, setHeroQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  useEffect(() => {
    setSeoMeta(
      'AIVORA AI — Discover the Best AI Tools for Everything',
      'Discover the Future of Artificial Intelligence. Search, compare, and explore curated AI tools across writing, coding, image generation, video, audio, and productivity.',
      {
        canonicalPath: '/',
        jsonLd: buildWebsiteJsonLd(configStatus.siteUrl),
      }
    );
  }, [configStatus.siteUrl, setSeoMeta]);

  const publishedTools = useMemo(
    () => tools.filter(isToolPublished),
    [tools]
  );

  const featuredTools = useMemo(
    () =>
      [...publishedTools]
        .filter((t) => t.isFeatured || getListingPriorityScore(t) >= 2)
        .sort((a, b) => getListingPriorityScore(b) - getListingPriorityScore(a))
        .slice(0, 6),
    [publishedTools]
  );

  const popularTools = useMemo(() => {
    const trending = publishedTools.filter((t) => t.isTrending);
    if (trending.length >= 6) return trending.slice(0, 6);
    const seen = new Set(trending.map((t) => t.id));
    const extras = [...publishedTools]
      .filter((t) => !seen.has(t.id))
      .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
    return [...trending, ...extras].slice(0, 6);
  }, [publishedTools]);

  const recentTools = useMemo(
    () =>
      filterAndSortTools(publishedTools, {
        query: '',
        category: 'All',
        pricing: 'All',
        sortBy: 'newest',
      }).slice(0, 6),
    [publishedTools]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tool of publishedTools) {
      const normalized = normalizeCategoryName(tool.category);
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
    return counts;
  }, [publishedTools]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    if (q) trackSearchQuery(q);
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(newsletterEmail)) {
      setNewsletterError('Please enter a valid email address.');
      return;
    }
    setNewsletterError(null);
    const added = await subscribeNewsletter(newsletterEmail);
    if (added) {
      setNewsletterSuccess(true);
      setNewsletterEmail('');
    }
  };

  return (
    <div>
      {directoryError && (
        <div
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:px-6 lg:px-8">
            <span>{directoryError}</span>
            <button
              type="button"
              onClick={retryDirectoryLoad}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-mesh-light border-b border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-22 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Discover the Future of Artificial Intelligence
            </p>
            <h1
              className="mt-4 font-display font-bold tracking-tight text-slate-900 text-balance dark:text-white"
              style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.75rem)', lineHeight: 1.08 }}
            >
              Discover the Best AI Tools for Everything.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              Search, compare, and evaluate curated AI software across writing,
              coding, visual production, audio, and business workflows—with
              verified official links and transparent pricing snapshots.
            </p>

            {/* Large functional search bar */}
            <form
              onSubmit={handleHeroSearch}
              role="search"
              aria-label="Search AI tools"
              className="mx-auto mt-8 max-w-2xl"
            >
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-indigo-500/5 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-1 items-center gap-3 px-3">
                  <Search
                    className="h-5 w-5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <label htmlFor="hero-search-input" className="sr-only">
                    Search AI tools
                  </label>
                  <input
                    id="hero-search-input"
                    type="search"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Search 1,000+ AI tools..."
                    className="w-full bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-base dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Search Tools
                </button>
              </div>
            </form>

            {/* Popular search suggestions */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Popular searches:
              </span>
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    navigate(`/explore?q=${encodeURIComponent(item.query)}`)
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Primary & secondary hero actions */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/explore')}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-500 dark:hover:text-white"
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>Explore AI Tools</span>
              </button>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(true)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Submit an AI Tool</span>
              </button>
            </div>
          </div>

          {/* 4-column summary strip */}
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-6 border-t border-slate-200/80 pt-8 sm:grid-cols-4 dark:border-slate-800">
            <div>
              <p className="font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                {publishedTools.length}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Curated AI Tools Listed
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                {categories.length}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Specialized Categories
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                {publishedTools.filter((t) => t.pricing !== 'Paid').length}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Free & Freemium Options
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                {blogPosts.length}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Comparisons & Guides
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured AI Tools */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Editor&apos;s Selection</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Featured AI Tools
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              High-impact platforms trusted by software, design, and research teams.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <span>Browse all tools</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <ToolCardSkeleton key={idx} />
            ))}
          </div>
        ) : featuredTools.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            No featured AI tools are marked right now.{' '}
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Explore the full directory
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>

      {/* Browse by Category */}
      <section className="border-y border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Browse by Category
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Jump directly into the software discipline that matches your workflow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>All {categories.length} categories</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {categories.map((cat) => {
              const count = categoryCounts.get(cat.name) ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    navigate(`/explore?category=${encodeURIComponent(cat.name)}`)
                  }
                  className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: cat.accentColor }}
                  >
                    <CategoryIcon iconKey={cat.iconKey} className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                    {cat.description}
                  </p>
                  <span className="mt-3 text-xs font-medium text-slate-700 tabular-nums dark:text-slate-300">
                    {count} {count === 1 ? 'tool' : 'tools'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular AI Tools */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Rising Adoption</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Popular AI Tools
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              Widely adopted tools across developers, researchers, and media studios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/explore?sort=reviews')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <span>Most reviewed</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <ToolCardSkeleton key={idx} />
            ))}
          </div>
        ) : popularTools.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            No popular AI tools listed yet.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {popularTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Added */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Recently Added
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Fresh additions reviewed and indexed into the AIVORA AI directory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/explore?sort=newest')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>View newest</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {isLoading ? (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <ToolCardSkeleton key={idx} />
              ))}
            </div>
          ) : recentTools.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No AI tools added yet.
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Editorial Guides */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Comparisons & Field Guides
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              In-depth tool evaluations, workflow tutorials, and buying guides.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/blog')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <span>Read all articles</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {blogPosts.slice(0, 3).map((post) => (
            <article
              key={post.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <a
                href={`/blog/${post.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/blog/${post.slug}`);
                }}
                className="block aspect-4/3 overflow-hidden bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={post.coverImage}
                  alt={post.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </a>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {post.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{post.readTimeMinutes} min read</span>
                </div>
                <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug text-slate-900 dark:text-white">
                  <a
                    href={`/blog/${post.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/blog/${post.slug}`);
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {post.title}
                  </a>
                </h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2 dark:text-slate-400">
                  {post.excerpt}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Newsletter Subscription Section */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-6 py-12 sm:px-12 sm:py-14 dark:border-indigo-900/60 dark:from-indigo-950/60 dark:via-slate-900 dark:to-blue-950/50">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Stay ahead of the AI software landscape
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              Receive one concise weekly digest featuring vetted AI releases, pricing updates, and side-by-side workflow tests.
            </p>

            {newsletterSuccess ? (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                You are subscribed to the AIVORA AI weekly briefing.
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row"
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterError) setNewsletterError(null);
                  }}
                  placeholder="Enter your work or personal email"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Subscribe
                </button>
              </form>
            )}
            {newsletterError && (
              <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {newsletterError}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
