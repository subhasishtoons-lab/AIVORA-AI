import { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ToolCard } from '../components/ToolCard';
import { useDirectory } from '../context/DirectoryContext';
import { buildArticleJsonLd, isToolPublished } from '../utils/directory';

export function BlogArticlePage({ slug }: { slug: string }) {
  const { blogPosts, tools, configStatus, navigate, setSeoMeta } = useDirectory();

  const post = useMemo(
    () => blogPosts.find((p) => p.slug === slug),
    [blogPosts, slug]
  );

  useEffect(() => {
    if (post) {
      setSeoMeta(
        post.seoTitle || `${post.title} | AIVORA AI Blog`,
        post.seoDescription || post.excerpt,
        {
          canonicalPath: post.canonicalUrl || `/blog/${post.slug}`,
          ogType: 'article',
          jsonLd: buildArticleJsonLd(post, configStatus.siteUrl),
        }
      );
    } else {
      setSeoMeta('Article Not Found | AIVORA AI', 'Requested article was not found.');
    }
  }, [post, configStatus.siteUrl, setSeoMeta]);

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Article Not Found
        </h1>
        <button
          type="button"
          onClick={() => navigate('/blog')}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Back to Blog
        </button>
      </div>
    );
  }

  const relatedTools = tools.filter(
    (t) => isToolPublished(t) && post.relatedToolSlugs.includes(t.slug)
  );
  const moreArticles = blogPosts
    .filter((p) => p.id !== post.id)
    .slice(0, 2);

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate('/blog')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Back to Journal</span>
      </button>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {post.category}
          </span>
          <span aria-hidden="true">·</span>
          <span>{post.publishedAt}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{post.readTimeMinutes} min read</span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl dark:text-white">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          {post.excerpt}
        </p>

        <div className="mt-5 flex items-center gap-3 border-y border-slate-200 py-4 text-sm dark:border-slate-800">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              {post.author}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {post.authorRole}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 aspect-16/9 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
        <img
          src={post.coverImage}
          alt={post.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mt-10 space-y-8">
        {post.sections.map((sec) => (
          <section key={sec.heading} className="space-y-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {sec.heading}
            </h2>
            {sec.paragraphs.map((p, idx) => (
              <p
                key={idx}
                className="text-base leading-relaxed text-slate-700 dark:text-slate-300"
              >
                {p}
              </p>
            ))}
            {sec.bullets && sec.bullets.length > 0 && (
              <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                {sec.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {relatedTools.length > 0 && (
        <section className="mt-14 border-t border-slate-200 pt-10 dark:border-slate-800">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Tools Mentioned in This Guide
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {relatedTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      )}

      {moreArticles.length > 0 && (
        <section className="mt-12 border-t border-slate-200 pt-10 dark:border-slate-800">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Continue Reading
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {moreArticles.map((art) => (
              <a
                key={art.id}
                href={`/blog/${art.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/blog/${art.slug}`);
                }}
                className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-indigo-300 dark:border-slate-800 dark:hover:border-indigo-700"
              >
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {art.category}
                </p>
                <p className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {art.title}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
