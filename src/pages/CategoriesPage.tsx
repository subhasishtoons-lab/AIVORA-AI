import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { ToolLogo } from '../components/ToolLogo';
import { useDirectory } from '../context/DirectoryContext';
import { isToolPublished, normalizeCategoryName } from '../utils/directory';

export function CategoriesPage() {
  const { categories, tools, navigate, setSeoMeta } = useDirectory();

  useEffect(() => {
    setSeoMeta(
      'AI Tool Categories | AIVORA AI',
      'Explore AI software categories including AI Writing, Image Generation, AI Video, Coding and Development, Productivity, Marketing and SEO, Audio, Business, Education, and Chatbots.',
      { canonicalPath: '/categories' }
    );
  }, [setSeoMeta]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          AI Categories
        </h1>
        <p className="mt-2.5 text-base text-slate-600 dark:text-slate-300">
          Browse curated software organized across <span className="tabular-nums font-medium">{categories.length}</span> core artificial intelligence domains.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {categories.map((cat) => {
          const catTools = tools.filter(
            (t) =>
              isToolPublished(t) &&
              normalizeCategoryName(t.category) === normalizeCategoryName(cat.name)
          );
          return (
            <section
              key={cat.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: cat.accentColor }}
                    >
                      <CategoryIcon iconKey={cat.iconKey} className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                        {cat.name}
                      </h2>
                      <p className="text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
                        {catTools.length} listed {catTools.length === 1 ? 'tool' : 'tools'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/explore?category=${encodeURIComponent(cat.name)}`)
                    }
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                  >
                    <span>Explore</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <p className="mt-3.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {cat.description}
                </p>

                {catTools.length > 0 && (
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {catTools.slice(0, 3).map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => navigate(`/tool/${tool.slug}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ToolLogo
                            name={tool.name}
                            logoColor={tool.logoColor}
                            logoKey={tool.logoKey}
                            logoUrl={tool.logoUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate dark:text-white">
                              {tool.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate dark:text-slate-400">
                              {tool.shortDescription}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {tool.pricing}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
