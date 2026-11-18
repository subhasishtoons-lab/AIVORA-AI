import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { ListingTier, PricingModel } from '../types/directory';
import { validateSubmissionInput } from '../utils/directory';

export function SubmitToolModal() {
  const {
    isSubmitModalOpen,
    setSubmitModalOpen,
    categories,
    submitToolProposal,
  } = useDirectory();

  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Productivity');
  const [pricing, setPricing] = useState<PricingModel>('Freemium');
  const [requestedTier, setRequestedTier] = useState<ListingTier>('Free');
  const [campaignDurationDays, setCampaignDurationDays] = useState<number>(30);
  const [shortDescription, setShortDescription] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.name === category)) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  useEffect(() => {
    if (!isSubmitModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSubmitModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitModalOpen, setSubmitModalOpen]);

  if (!isSubmitModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSubmissionInput({
      name,
      websiteUrl,
      category,
      shortDescription,
      submitterEmail,
      requestedTier,
      campaignDurationDays:
        requestedTier === 'Free' ? undefined : campaignDurationDays,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const result = await submitToolProposal({
      name: name.trim(),
      websiteUrl: websiteUrl.trim(),
      category,
      pricing,
      requestedTier,
      campaignDurationDays:
        requestedTier === 'Free' ? undefined : campaignDurationDays,
      shortDescription: shortDescription.trim(),
      submitterEmail: submitterEmail.trim(),
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setName('');
    setWebsiteUrl('');
    setShortDescription('');
    setSubmitterEmail('');
    setRequestedTier('Free');
    setError(null);
    setSubmitModalOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-tool-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSubmitModalOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="submit-tool-title"
              className="font-display text-xl font-bold text-slate-900 dark:text-white"
            >
              Submit an AI Tool
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              All submissions—including Featured and Sponsored requests—require administrator review before publishing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitModalOpen(false)}
            aria-label="Close submission dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="sub-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tool Name
            </label>
            <input
              id="sub-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Granola"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="sub-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Official Website URL
            </label>
            <input
              id="sub-url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sub-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                id="sub-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sub-pricing" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Pricing Model
              </label>
              <select
                id="sub-pricing"
                value={pricing}
                onChange={(e) => setPricing(e.target.value as PricingModel)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="Free">Free</option>
                <option value="Freemium">Freemium</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sub-tier" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Listing Tier
              </label>
              <select
                id="sub-tier"
                value={requestedTier}
                onChange={(e) => setRequestedTier(e.target.value as ListingTier)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="Free">Free Listing (Standard)</option>
                <option value="Featured">Featured Listing (Priority Review)</option>
                <option value="Sponsored">Sponsored Listing (Campaign)</option>
              </select>
            </div>
            {requestedTier !== 'Free' && (
              <div>
                <label htmlFor="sub-duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Campaign Duration
                </label>
                <select
                  id="sub-duration"
                  value={campaignDurationDays}
                  onChange={(e) => setCampaignDurationDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="sub-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Short Description
            </label>
            <textarea
              id="sub-desc"
              rows={3}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Summarize what the tool does and who it helps..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="sub-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Your Contact Email
            </label>
            <input
              id="sub-email"
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="you@company.com"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSubmitModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
