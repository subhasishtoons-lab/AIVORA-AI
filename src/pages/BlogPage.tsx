import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { ALL_BLOG_CATEGORIES, BlogCategory } from '../types/directory';

const BLOG_FILTER_OPTIONS: Array<'All' | BlogCategory> = [
  'All',
  ...ALL_BLOG_CATEGORIES,
];

export function BlogPage() {
  const { blogPosts, navigate, setSeoMeta } = useDirectory();
  const [selectedCategory, setSelectedCategory] = useState<'All' | BlogCategory>('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setSeoMeta(
      'Editorial Blog — AI Reviews, Best Lists, Tutorials & News | AIVORA AI',
      'Read AI tool reviews, best AI tools lists, hands-on tutorials, latest AI news, tool comparisons, and beginner guides from AIVORA AI.',
      { canonicalPath: '/blog' }
    );
  }, [setSeoMeta]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return blogPosts.filter((post) => {
      if (selectedCategory !== 'All' && post.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        (post.focusKeyword?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [blogPosts, selectedCategory, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-end dark:border-slate-800">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            AIVORA AI Journal
          </h1>
          <p className="mt-2.5 text-base text-slate-600 dark:text-slate-300">
            In-depth AI tool reviews, curated best-of lists, step-by-step tutorials, industry news, comparisons, and beginner playbooks.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="blog-search" className="sr-only">
            Search articles
          </label>
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Category tabs across all 6 content marketing tracks */}
      <div
        role="group"
        aria-label="Filter articles by topic"
        className="mt-6 flex flex-wrap gap-2"
      >
        {BLOG_FILTER_OPTIONS.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={active}
              className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/70 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            No articles match your filter
          </h2>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setQuery('');
            }}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Show All Articles
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
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
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </a>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {post.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{post.publishedAt}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{post.readTimeMinutes} min read</span>
                  </div>
                  <h2 className="mt-2.5 font-display text-lg font-bold leading-snug text-slate-900 dark:text-white">
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
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3 dark:text-slate-400">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {post.author}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <span>Read Article</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
