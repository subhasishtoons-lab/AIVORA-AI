import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Megaphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { AdvertisingInquiry, ListingTier, PricingModel } from '../types/directory';
import {
  validateAdvertisingInquiry,
  validateSubmissionInput,
} from '../utils/directory';

export function PromoteAdvertisePage() {
  const {
    categories,
    submitToolProposal,
    submitAdvertisingInquiry,
    setSeoMeta,
  } = useDirectory();

  const [activeForm, setActiveForm] = useState<'listing' | 'advertising'>('listing');

  // Premium Listing submission state
  const [toolName, setToolName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Productivity');
  const [pricing, setPricing] = useState<PricingModel>('Freemium');
  const [requestedTier, setRequestedTier] = useState<ListingTier>('Featured');
  const [campaignDurationDays, setCampaignDurationDays] = useState(30);
  const [companyName, setCompanyName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [listingError, setListingError] = useState<string | null>(null);
  const [listingSubmitted, setListingSubmitted] = useState(false);

  // Business Advertising Enquiry state
  const [adCompany, setAdCompany] = useState('');
  const [adContact, setAdContact] = useState('');
  const [adEmail, setAdEmail] = useState('');
  const [adWebsite, setAdWebsite] = useState('');
  const [adTier, setAdTier] = useState<AdvertisingInquiry['requestedTier']>('Sponsored');
  const [adDuration, setAdDuration] = useState(30);
  const [adBudget, setAdBudget] = useState('$1,000 – $2,500 / campaign');
  const [adGoals, setAdGoals] = useState('');
  const [adError, setAdError] = useState<string | null>(null);
  const [adSubmitted, setAdSubmitted] = useState(false);

  useEffect(() => {
    setSeoMeta(
      'Promote Your AI Tool & Business Advertising | AIVORA AI',
      'Compare Free, Featured, and Sponsored AI tool listings or submit a business advertising enquiry on AIVORA AI.',
      { canonicalPath: '/advertise' }
    );
  }, [setSeoMeta]);

  const handleListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateSubmissionInput({
      name: toolName,
      websiteUrl,
      category,
      shortDescription,
      submitterEmail,
      requestedTier,
      campaignDurationDays: requestedTier === 'Free' ? undefined : campaignDurationDays,
    });
    if (err) {
      setListingError(err);
      return;
    }
    setListingError(null);
    const res = await submitToolProposal({
      name: toolName.trim(),
      websiteUrl: websiteUrl.trim(),
      category,
      pricing,
      requestedTier,
      campaignDurationDays: requestedTier === 'Free' ? undefined : campaignDurationDays,
      companyName: companyName.trim() || undefined,
      shortDescription: shortDescription.trim(),
      submitterEmail: submitterEmail.trim(),
    });
    if (res.error) {
      setListingError(res.error);
      return;
    }
    setListingSubmitted(true);
    setToolName('');
    setWebsiteUrl('');
    setShortDescription('');
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      companyName: adCompany,
      contactName: adContact,
      email: adEmail,
      websiteUrl: adWebsite,
      requestedTier: adTier,
      campaignDurationDays: adDuration,
      monthlyBudget: adBudget,
      goals: adGoals,
    };
    const err = validateAdvertisingInquiry(payload);
    if (err) {
      setAdError(err);
      return;
    }
    setAdError(null);
    const serverErr = await submitAdvertisingInquiry(payload);
    if (serverErr) {
      setAdError(serverErr);
      return;
    }
    setAdSubmitted(true);
    setAdGoals('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Monetization &amp; Sponsorships
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Promote Your AI Product on AIVORA AI
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Choose between standard Free Directory Inclusion, priority Featured Placement, or dedicated Sponsored Campaigns. Every promoted listing undergoes administrator review before publishing.
        </p>
      </div>

      {/* Three Listing Tiers */}
      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Free Listing */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span>Standard Tier</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
              Free Listing
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Standard organic discovery across search, category pages, and tool comparisons.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>Basic tool listing with dedicated SEO page</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>Standard directory placement &amp; category indexing</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>Direct official website outbound link</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => {
              setRequestedTier('Free');
              setActiveForm('listing');
              setListingSubmitted(false);
            }}
            className="mt-8 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Submit Free Listing
          </button>
        </section>

        {/* Featured Listing */}
        <section className="flex flex-col justify-between rounded-2xl border-2 border-indigo-600 bg-white p-7 shadow-md dark:border-indigo-500 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Priority Tier</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
              Featured Listing
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Elevated editorial placement across homepage sections and category sorting.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <span>Homepage Featured placement &amp; priority sort ranking</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <span>Clear &ldquo;Featured&rdquo; badge across directory cards</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <span>Admin approval required prior to activation</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => {
              setRequestedTier('Featured');
              setActiveForm('listing');
              setListingSubmitted(false);
            }}
            className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Request Featured Placement
          </button>
        </section>

        {/* Sponsored Listing */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              <span>Campaign Tier</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
              Sponsored Listing
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Time-bound promotional campaigns with transparent Sponsored disclosure and tracking.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                <span>Top-of-feed promotional placement &amp; Sponsored label</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                <span>Scheduled campaign duration (7 / 14 / 30 / 60 days)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                <span>Real outbound click attribution &amp; admin approval gate</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => {
              setRequestedTier('Sponsored');
              setActiveForm('listing');
              setListingSubmitted(false);
            }}
            className="mt-8 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 dark:bg-slate-800"
          >
            Submit Sponsored Campaign
          </button>
        </section>
      </div>

      {/* Admin-Managed Promoted Listings Notice */}
      <div className="mt-8 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-4 text-xs leading-relaxed text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              Administrator-Managed Placements (No Online Payment Required)
            </p>
            <p className="mt-0.5">
              All Free, Featured, and Sponsored listing requests and campaign durations are reviewed, scheduled, and activated directly by AIVORA AI administrators inside the Admin Control Panel prior to going live.
            </p>
          </div>
        </div>
      </div>

      {/* Form Switcher */}
      <div className="mt-10 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveForm('listing')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
            activeForm === 'listing'
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          Submit Tool / Listing Tier
        </button>
        <button
          type="button"
          onClick={() => setActiveForm('advertising')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
            activeForm === 'advertising'
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          Business Advertising Enquiry
        </button>
      </div>

      {/* Listing Submission Form */}
      {activeForm === 'listing' ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {listingSubmitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
              <h2 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                Submission Queued for Admin Approval
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
                Your {requestedTier} listing request has been submitted. Administrators review all listings before publishing them to the live directory.
              </p>
              <button
                type="button"
                onClick={() => setListingSubmitted(false)}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Submit Another Listing
              </button>
            </div>
          ) : (
            <form onSubmit={handleListingSubmit} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Listing Submission ({requestedTier} Tier)
              </h2>
              {listingError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                  {listingError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="prom-tier" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Listing Option
                  </label>
                  <select
                    id="prom-tier"
                    value={requestedTier}
                    onChange={(e) => setRequestedTier(e.target.value as ListingTier)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Free">Free Listing</option>
                    <option value="Featured">Featured Listing</option>
                    <option value="Sponsored">Sponsored Listing</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prom-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tool Name *
                  </label>
                  <input
                    id="prom-name"
                    type="text"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    placeholder="e.g. Synthesia Studio"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="prom-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Official Website URL *
                  </label>
                  <input
                    id="prom-url"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="prom-cat" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    id="prom-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prom-pricing" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Pricing Model
                  </label>
                  <select
                    id="prom-pricing"
                    value={pricing}
                    onChange={(e) => setPricing(e.target.value as PricingModel)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Free">Free</option>
                    <option value="Freemium">Freemium</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                {requestedTier !== 'Free' && (
                  <div>
                    <label htmlFor="prom-dur" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Campaign Duration
                    </label>
                    <select
                      id="prom-dur"
                      value={campaignDurationDays}
                      onChange={(e) => setCampaignDurationDays(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value={7}>7 Days</option>
                      <option value={14}>14 Days</option>
                      <option value={30}>30 Days</option>
                      <option value={60}>60 Days</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="prom-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Company Name
                  </label>
                  <input
                    id="prom-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Labs Inc."
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="prom-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Contact Email *
                  </label>
                  <input
                    id="prom-email"
                    type="email"
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    placeholder="growth@company.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="prom-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Short Description *
                </label>
                <textarea
                  id="prom-desc"
                  rows={3}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Describe your AI tool's core capability and target users..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Submit for Admin Approval
                </button>
              </div>
            </form>
          )}
        </section>
      ) : (
        /* Business Advertising Enquiry Form */
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {adSubmitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
              <h2 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                Advertising Enquiry Received
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
                Thank you. Our partnerships team reviews business advertising requests in the Admin Control Panel.
              </p>
              <button
                type="button"
                onClick={() => setAdSubmitted(false)}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Submit Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdSubmit} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Business Advertising Enquiry
              </h2>
              {adError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                  {adError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ad-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Company Name *
                  </label>
                  <input
                    id="ad-company"
                    type="text"
                    value={adCompany}
                    onChange={(e) => setAdCompany(e.target.value)}
                    placeholder="Acme AI Inc."
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="ad-contact" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Contact Name *
                  </label>
                  <input
                    id="ad-contact"
                    type="text"
                    value={adContact}
                    onChange={(e) => setAdContact(e.target.value)}
                    placeholder="Jordan Taylor"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ad-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Work Email *
                  </label>
                  <input
                    id="ad-email"
                    type="email"
                    value={adEmail}
                    onChange={(e) => setAdEmail(e.target.value)}
                    placeholder="partnerships@acme.ai"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="ad-website" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Product Website *
                  </label>
                  <input
                    id="ad-website"
                    type="url"
                    value={adWebsite}
                    onChange={(e) => setAdWebsite(e.target.value)}
                    placeholder="https://acme.ai"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="ad-tier" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Campaign Format
                  </label>
                  <select
                    id="ad-tier"
                    value={adTier}
                    onChange={(e) =>
                      setAdTier(e.target.value as AdvertisingInquiry['requestedTier'])
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Sponsored">Sponsored Placement</option>
                    <option value="Featured">Featured Placement</option>
                    <option value="Custom Bundle">Custom Newsletter + Directory</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ad-dur" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Duration (Days)
                  </label>
                  <select
                    id="ad-dur"
                    value={adDuration}
                    onChange={(e) => setAdDuration(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ad-budget" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Target Budget
                  </label>
                  <input
                    id="ad-budget"
                    type="text"
                    value={adBudget}
                    onChange={(e) => setAdBudget(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ad-goals" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Campaign Goals &amp; Target Audience *
                </label>
                <textarea
                  id="ad-goals"
                  rows={3}
                  value={adGoals}
                  onChange={(e) => setAdGoals(e.target.value)}
                  placeholder="Share product launch timing, target categories, and KPIs..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Send Advertising Enquiry
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
