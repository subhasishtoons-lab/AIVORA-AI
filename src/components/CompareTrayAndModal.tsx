import { useEffect } from 'react';
import { ArrowUpRight, Check, GitCompare, Minus, X } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { getToolRatingSummary } from '../utils/directory';
import { ToolLogo } from './ToolLogo';

export function CompareTrayAndModal() {
  const {
    tools,
    reviews,
    compareIds,
    toggleCompare,
    clearCompare,
    isCompareModalOpen,
    setCompareModalOpen,
    navigate,
  } = useDirectory();

  useEffect(() => {
    if (!isCompareModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCompareModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCompareModalOpen, setCompareModalOpen]);

  const selectedTools = tools.filter((t) => compareIds.includes(t.id));

  if (selectedTools.length === 0) return null;

  return (
    <>
      {/* Compact bottom comparison tray */}
      <div
        role="region"
        aria-label="Tool comparison tray"
        className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md sm:bottom-4 sm:px-4 sm:py-3 dark:border-slate-700 dark:bg-slate-900/95"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
              <GitCompare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              Compare ({selectedTools.length}/3)
            </span>
            <div className="flex items-center gap-2 overflow-x-auto">
              {selectedTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => toggleCompare(tool.id)}
                  title={`Remove ${tool.name}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span className="max-w-[90px] truncate">{tool.name}</span>
                  <X className="h-3 w-3 text-slate-400" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selectedTools.length < 2}
              onClick={() => setCompareModalOpen(true)}
              className="whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Compare Side by Side
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-side comparison modal */}
      {isCompareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompareModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h2
                  id="compare-modal-title"
                  className="font-display text-xl font-bold text-slate-900 dark:text-white"
                >
                  Side-by-Side AI Tool Comparison
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Sample pricing snapshots shown for quick evaluation — verify final rates on vendor websites.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                aria-label="Close comparison dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="w-40 py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Attribute
                    </th>
                    {selectedTools.map((tool) => (
                      <th key={tool.id} className="py-3 px-4 align-top">
                        <div className="flex items-center gap-3">
                          <ToolLogo
                            name={tool.name}
                            logoColor={tool.logoColor}
                            logoKey={tool.logoKey}
                            logoUrl={tool.logoUrl}
                            size="sm"
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setCompareModalOpen(false);
                                navigate(`/tool/${tool.slug}`);
                              }}
                              className="font-display font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                            >
                              {tool.name}
                            </button>
                            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                              {tool.category}
                            </p>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3.5 pr-4 font-medium text-slate-700 dark:text-slate-300">
                      Pricing Model
                    </td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">{tool.pricing}</span>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {tool.pricingSummary}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-medium text-slate-700 dark:text-slate-300">
                      Community Rating
                    </td>
                    {selectedTools.map((tool) => {
                      const summary = getToolRatingSummary(tool, reviews);
                      return (
                        <td key={tool.id} className="py-3.5 px-4 tabular-nums text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">{summary.averageRating.toFixed(1)} / 5.0</span>{' '}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ({summary.totalReviews.toLocaleString()} {summary.totalReviews === 1 ? 'review' : 'reviews'})
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-medium text-slate-700 dark:text-slate-300 align-top">
                      Key Strengths
                    </td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="py-3.5 px-4 align-top">
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {tool.pros.slice(0, 3).map((pro) => (
                            <li key={pro} className="flex items-start gap-1.5">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-medium text-slate-700 dark:text-slate-300 align-top">
                      Limitations
                    </td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="py-3.5 px-4 align-top">
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {tool.cons.slice(0, 2).map((con) => (
                            <li key={con} className="flex items-start gap-1.5">
                              <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-medium text-slate-700 dark:text-slate-300 align-top">
                      Best Use Cases
                    </td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="py-3.5 px-4 align-top text-xs text-slate-600 dark:text-slate-300">
                        <ul className="list-disc pl-4 space-y-1">
                          {tool.bestUseCases.slice(0, 2).map((uc) => (
                            <li key={uc}>{uc}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 pr-4 font-medium text-slate-700 dark:text-slate-300">
                      Links
                    </td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="py-4 px-4">
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={tool.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            <span>Visit Site</span>
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setCompareModalOpen(false);
                              navigate(`/tool/${tool.slug}`);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Full Details
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
