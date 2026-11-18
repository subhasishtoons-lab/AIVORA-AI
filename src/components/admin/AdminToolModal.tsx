import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ToolLogo } from '../ToolLogo';
import {
  AITool,
  CategoryInfo,
  ListingTier,
  PricingModel,
  PublicationStatus,
  SponsorApprovalStatus,
} from '../../types/directory';
import {
  findDuplicateTool,
  isValidHttpUrl,
  normalizeCategoryName,
  slugify,
  validateToolInput,
} from '../../utils/directory';

export interface AdminToolSavePayload {
  name: string;
  tagline: string;
  shortDescription: string;
  description: string;
  category: string;
  pricing: PricingModel;
  pricingSummary: string;
  websiteUrl: string;
  logoUrl?: string;
  logoColor: string;
  logoKey: string;
  affiliateUrl?: string;
  affiliateProgram?: string;
  affiliateTrackingId?: string;
  listingTier: ListingTier;
  sponsorStatus: SponsorApprovalStatus;
  campaignStart?: string;
  campaignEnd?: string;
  features: string[];
  isFeatured: boolean;
  isTrending: boolean;
  status: PublicationStatus;
  tags: string[];
}

interface AdminToolModalProps {
  isOpen: boolean;
  editingTool: AITool | null;
  categories: CategoryInfo[];
  existingTools: AITool[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: AdminToolSavePayload) => Promise<string | null>;
}

export function AdminToolModal({
  isOpen,
  editingTool,
  categories,
  existingTools,
  isSaving,
  onClose,
  onSave,
}: AdminToolModalProps) {
  const defaultCategory = categories[0]?.name ?? 'Productivity';

  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('https://');
  const [logoUrl, setLogoUrl] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [pricing, setPricing] = useState<PricingModel>('Freemium');
  const [pricingDetails, setPricingDetails] = useState('');
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [status, setStatus] = useState<PublicationStatus>('published');
  const [featuresText, setFeaturesText] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [affiliateProgram, setAffiliateProgram] = useState('');
  const [affiliateTrackingId, setAffiliateTrackingId] = useState('');
  const [listingTier, setListingTier] = useState<ListingTier>('Free');
  const [sponsorStatus, setSponsorStatus] = useState<SponsorApprovalStatus>('none');
  const [campaignStart, setCampaignStart] = useState('');
  const [campaignEnd, setCampaignEnd] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTool) {
      setName(editingTool.name);
      setShortDesc(editingTool.shortDescription);
      setFullDesc(editingTool.description);
      setWebsiteUrl(editingTool.websiteUrl);
      setLogoUrl(editingTool.logoUrl ?? '');
      setCategory(editingTool.category || defaultCategory);
      setPricing(editingTool.pricing);
      setPricingDetails(editingTool.pricingSummary);
      setFeatured(editingTool.isFeatured);
      setTrending(editingTool.isTrending);
      setStatus(editingTool.status === 'draft' ? 'draft' : 'published');
      setFeaturesText(editingTool.features.join('\n'));
      setAffiliateUrl(editingTool.affiliateUrl ?? '');
      setAffiliateProgram(editingTool.affiliateProgram ?? '');
      setAffiliateTrackingId(editingTool.affiliateTrackingId ?? '');
      setListingTier(editingTool.listingTier ?? 'Free');
      setSponsorStatus(editingTool.sponsorStatus ?? 'none');
      setCampaignStart(editingTool.campaignStart ?? '');
      setCampaignEnd(editingTool.campaignEnd ?? '');
    } else {
      setName('');
      setShortDesc('');
      setFullDesc('');
      setWebsiteUrl('https://');
      setLogoUrl('');
      setCategory(defaultCategory);
      setPricing('Freemium');
      setPricingDetails('');
      setFeatured(false);
      setTrending(false);
      setStatus('published');
      setFeaturesText('');
      setAffiliateUrl('');
      setAffiliateProgram('');
      setAffiliateTrackingId('');
      setListingTier('Free');
      setSponsorStatus('none');
      setCampaignStart('');
      setCampaignEnd('');
    }
    setFormError(null);
  }, [isOpen, editingTool, defaultCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const previewLogoUrl = logoUrl.trim() && isValidHttpUrl(logoUrl) ? logoUrl.trim() : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCategory = normalizeCategoryName(category);
    const validationError = validateToolInput({
      name,
      tagline: editingTool?.tagline || shortDesc,
      shortDescription: shortDesc,
      description: fullDesc || shortDesc,
      category: normalizedCategory,
      pricing,
      pricingSummary: pricingDetails || pricing,
      websiteUrl,
      logoUrl,
      affiliateUrl,
      status,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const duplicate = findDuplicateTool(
      { id: editingTool?.id, name, websiteUrl },
      existingTools
    );
    if (duplicate) {
      setFormError(
        `A directory entry for "${duplicate.name}" (${duplicate.websiteUrl}) already exists. Duplicate tools are not allowed.`
      );
      return;
    }

    setFormError(null);
    const parsedFeatures = featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const serverErr = await onSave({
      name: name.trim(),
      tagline: (editingTool?.tagline || shortDesc).trim(),
      shortDescription: shortDesc.trim(),
      description: (fullDesc || shortDesc).trim(),
      category: normalizedCategory,
      pricing,
      pricingSummary: pricingDetails.trim(),
      websiteUrl: websiteUrl.trim(),
      logoUrl: logoUrl.trim() || undefined,
      logoColor: editingTool?.logoColor || '#4F46E5',
      logoKey: editingTool?.logoKey || slugify(name),
      affiliateUrl: affiliateUrl.trim() || undefined,
      affiliateProgram: affiliateProgram.trim() || undefined,
      affiliateTrackingId: affiliateTrackingId.trim() || undefined,
      listingTier,
      sponsorStatus,
      campaignStart: campaignStart.trim() || undefined,
      campaignEnd: campaignEnd.trim() || undefined,
      features: parsedFeatures,
      isFeatured: featured,
      isTrending: trending,
      status,
      tags: [slugify(normalizedCategory), pricing.toLowerCase()],
    });

    if (serverErr) {
      setFormError(serverErr);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-tool-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2
              id="admin-tool-modal-title"
              className="font-display text-xl font-bold text-slate-900 dark:text-white"
            >
              {editingTool ? `Edit ${editingTool.name}` : 'Create New AI Tool'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Changes sync directly to the Supabase <code className="font-mono">ai_tools</code> catalog.
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label="Close tool editor"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
            >
              {formError}
            </div>
          )}

          {/* Core Identity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="adm-tool-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Tool Name *
              </label>
              <input
                id="adm-tool-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claude"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="adm-tool-url"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Website URL *
              </label>
              <input
                id="adm-tool-url"
                type="url"
                required
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Logo URL with live preview */}
          <div>
            <label
              htmlFor="adm-tool-logo-url"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Logo or Image URL (optional)
            </label>
            <div className="mt-1 flex items-center gap-3">
              <ToolLogo
                key={previewLogoUrl || name || 'preview'}
                name={name || 'AI'}
                logoColor={editingTool?.logoColor || '#4F46E5'}
                logoKey={editingTool?.logoKey || slugify(name)}
                logoUrl={previewLogoUrl}
                size="sm"
              />
              <input
                id="adm-tool-logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://cdn.example.com/logo.png (leave blank for monogram badge)"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Classification, Pricing & Publication Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="adm-tool-cat"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Category *
              </label>
              <select
                id="adm-tool-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-tool-pricing"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Pricing Type *
              </label>
              <select
                id="adm-tool-pricing"
                value={pricing}
                onChange={(e) => setPricing(e.target.value as PricingModel)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="Free">Free</option>
                <option value="Freemium">Freemium</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="adm-tool-status"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Publication Status *
              </label>
              <select
                id="adm-tool-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PublicationStatus)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Descriptions & Pricing Details */}
          <div>
            <label
              htmlFor="adm-tool-short-desc"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Short Description *
            </label>
            <input
              id="adm-tool-short-desc"
              type="text"
              required
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="Concise one-line summary shown in directory cards"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="adm-tool-full-desc"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Full Description
            </label>
            <textarea
              id="adm-tool-full-desc"
              rows={3}
              value={fullDesc}
              onChange={(e) => setFullDesc(e.target.value)}
              placeholder="Detailed overview displayed on the tool detail page"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="adm-tool-pricing-details"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Pricing Details
            </label>
            <input
              id="adm-tool-pricing-details"
              type="text"
              value={pricingDetails}
              onChange={(e) => setPricingDetails(e.target.value)}
              placeholder="e.g. Free plan available; Pro starts at $20/month"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Featured & Trending Controls */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <label
              htmlFor="adm-tool-featured"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              <input
                id="adm-tool-featured"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>Featured Tool (Show on Homepage)</span>
            </label>
            <label
              htmlFor="adm-tool-trending"
              className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <input
                id="adm-tool-trending"
                type="checkbox"
                checked={trending}
                onChange={(e) => setTrending(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>Mark as Trending</span>
            </label>
          </div>

          {/* Key Features */}
          <div>
            <label
              htmlFor="adm-tool-features"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Verified Features (one per line, optional)
            </label>
            <textarea
              id="adm-tool-features"
              rows={2}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="Verified features (one per line)"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Affiliate Configuration */}
          <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Affiliate Marketing Configuration (leave blank if no affiliate program)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="url"
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                placeholder="Affiliate URL (https://...)"
                aria-label="Affiliate URL"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 sm:col-span-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                value={affiliateProgram}
                onChange={(e) => setAffiliateProgram(e.target.value)}
                placeholder="Program (e.g. Impact, PartnerStack)"
                aria-label="Affiliate program"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 sm:col-span-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                value={affiliateTrackingId}
                onChange={(e) => setAffiliateTrackingId(e.target.value)}
                placeholder="Tracking ID"
                aria-label="Affiliate tracking ID"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Listing Tier & Sponsor Schedule */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select
              value={listingTier}
              onChange={(e) => setListingTier(e.target.value as ListingTier)}
              aria-label="Listing tier"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="Free">Tier: Free</option>
              <option value="Featured">Tier: Featured</option>
              <option value="Sponsored">Tier: Sponsored</option>
            </select>
            <select
              value={sponsorStatus}
              onChange={(e) => setSponsorStatus(e.target.value as SponsorApprovalStatus)}
              aria-label="Sponsor status"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="none">Sponsor: None</option>
              <option value="pending">Sponsor: Pending</option>
              <option value="approved">Sponsor: Approved</option>
              <option value="rejected">Sponsor: Rejected</option>
            </select>
            <input
              type="date"
              value={campaignStart}
              onChange={(e) => setCampaignStart(e.target.value)}
              aria-label="Campaign start date"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <input
              type="date"
              value={campaignEnd}
              onChange={(e) => setCampaignEnd(e.target.value)}
              aria-label="Campaign end date"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingTool ? 'Save Changes' : 'Create Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
