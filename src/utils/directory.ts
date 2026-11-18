import type {
  AdvertisingInquiry,
  AffiliateClickRecord,
  AITool,
  AnalyticsEvent,
  AnalyticsSummary,
  BlogCategory,
  BlogPost,
  ContactInquiry,
  FilterCriteria,
  ListingTier,
  NewsletterSubscriber,
  PricingModel,
  PublicationStatus,
  ToolReview,
} from '../types/directory.ts';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CATEGORY_ALIASES: Record<string, string> = {
  'ai image generation': 'Image Generation',
  'image generation': 'Image Generation',
  'ai video generation': 'AI Video',
  'ai video': 'AI Video',
  'ai coding': 'Coding and Development',
  'coding and development': 'Coding and Development',
  'ai productivity': 'Productivity',
  'productivity': 'Productivity',
  'ai marketing': 'Marketing and SEO',
  'marketing and seo': 'Marketing and SEO',
  'ai writing': 'AI Writing',
  'ai audio and music': 'AI Audio and Music',
  'ai business': 'AI Business',
  'ai education': 'AI Education',
  'ai chatbots': 'AI Chatbots',
};

export function normalizeCategoryName(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return '';
  return CATEGORY_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function normalizeWebsiteKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    return `${host}${pathname}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function findDuplicateTool(
  candidate: { name: string; websiteUrl: string; id?: string },
  existingTools: Array<Pick<AITool, 'id' | 'slug' | 'name' | 'websiteUrl'>>
): Pick<AITool, 'id' | 'slug' | 'name' | 'websiteUrl'> | null {
  const candidateName = candidate.name.trim().toLowerCase();
  const candidateSlug = slugify(candidate.name);
  const candidateSite = normalizeWebsiteKey(candidate.websiteUrl);

  for (const existing of existingTools) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (candidateName && existing.name.trim().toLowerCase() === candidateName) {
      return existing;
    }
    if (candidateSlug && existing.slug.toLowerCase() === candidateSlug) {
      return existing;
    }
    if (candidateSite && normalizeWebsiteKey(existing.websiteUrl) === candidateSite) {
      return existing;
    }
  }
  return null;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Resolves the canonical public base URL for local development and production.
 * Prefers explicit SITE_URL (ignoring empty or placeholder values) before falling
 * back to the current request origin, APP_URL, or http://localhost:<port>.
 */
export function resolveSiteUrl(options: {
  siteUrl?: string;
  appUrl?: string;
  requestOrigin?: string;
  port?: number;
}): string {
  const cleanCandidate = (raw?: string): string => {
    const trimmed = (raw || '').trim().replace(/\/+$/, '');
    if (!trimmed || trimmed === 'MY_APP_URL') return '';
    return isValidHttpUrl(trimmed) ? trimmed : '';
  };

  return (
    cleanCandidate(options.siteUrl) ||
    cleanCandidate(options.requestOrigin) ||
    cleanCandidate(options.appUrl) ||
    `http://localhost:${options.port || 3000}`
  );
}


/**
 * Resolves the real outbound target URL for a tool.
 * Never fabricates affiliate URLs or tracking parameters:
 * only returns an affiliate URL when explicitly configured and valid.
 */
export function resolveOutboundUrl(tool: Pick<
  AITool,
  'websiteUrl' | 'affiliateUrl' | 'affiliateProgram' | 'affiliateTrackingId'
>): {
  targetUrl: string;
  isAffiliate: boolean;
  affiliateProgram?: string;
  affiliateTrackingId?: string;
} {
  const configuredAffiliate = tool.affiliateUrl?.trim() ?? '';
  if (configuredAffiliate && isValidHttpUrl(configuredAffiliate)) {
    return {
      targetUrl: configuredAffiliate,
      isAffiliate: true,
      affiliateProgram: tool.affiliateProgram?.trim() || undefined,
      affiliateTrackingId: tool.affiliateTrackingId?.trim() || undefined,
    };
  }
  return {
    targetUrl: tool.websiteUrl.trim(),
    isAffiliate: false,
    affiliateProgram: tool.affiliateProgram?.trim() || undefined,
    affiliateTrackingId: tool.affiliateTrackingId?.trim() || undefined,
  };
}

export function buildOutboundRedirectPath(toolSlug: string, sourcePage = 'directory'): string {
  const sp = new URLSearchParams();
  if (sourcePage.trim()) sp.set('src', sourcePage.trim());
  const qs = sp.toString();
  return `/go/${encodeURIComponent(toolSlug)}${qs ? `?${qs}` : ''}`;
}

export function isToolSponsorActive(tool: AITool, referenceDateIso?: string): boolean {
  if (tool.listingTier !== 'Sponsored') return false;
  if (tool.sponsorStatus && tool.sponsorStatus !== 'approved') return false;
  const today = (referenceDateIso ?? new Date().toISOString()).slice(0, 10);
  if (tool.campaignStart && today < tool.campaignStart) return false;
  if (tool.campaignEnd && today > tool.campaignEnd) return false;
  return true;
}

export function getListingPriorityScore(tool: AITool, referenceDateIso?: string): number {
  if (isToolSponsorActive(tool, referenceDateIso)) return 4;
  if (tool.listingTier === 'Featured' && (!tool.sponsorStatus || tool.sponsorStatus === 'approved')) {
    return 3;
  }
  if (tool.isFeatured) return 2;
  if (tool.isTrending) return 1;
  return 0;
}

export function isToolPublished(tool: Pick<AITool, 'status'>): boolean {
  return tool.status !== 'draft';
}

export type AdminToolSortOption = 'newest' | 'name-asc' | 'name-desc';

export interface AdminToolFilterCriteria {
  query: string;
  category: string;
  pricing: 'All' | PricingModel;
  status: 'All' | PublicationStatus;
  sortBy: AdminToolSortOption;
}

export function filterAndSortAdminTools(
  tools: AITool[],
  criteria: AdminToolFilterCriteria
): AITool[] {
  const normalizedQuery = criteria.query.trim().toLowerCase();

  const filtered = tools.filter((tool) => {
    if (normalizedQuery && !tool.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    if (
      criteria.category &&
      criteria.category !== 'All' &&
      normalizeCategoryName(tool.category).toLowerCase() !==
        normalizeCategoryName(criteria.category).toLowerCase()
    ) {
      return false;
    }

    if (criteria.pricing && criteria.pricing !== 'All' && tool.pricing !== criteria.pricing) {
      return false;
    }

    if (criteria.status && criteria.status !== 'All') {
      const toolStatus: PublicationStatus = tool.status === 'draft' ? 'draft' : 'published';
      if (toolStatus !== criteria.status) {
        return false;
      }
    }

    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (criteria.sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'newest':
      default:
        return b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name);
    }
  });

  return sorted;
}

export function filterAndSortTools(
  tools: AITool[],
  criteria: FilterCriteria
): AITool[] {
  const normalizedQuery = criteria.query.trim().toLowerCase();
  const favSet = new Set(criteria.favoriteIds ?? []);

  const filtered = tools.filter((tool) => {
    if (!isToolPublished(tool)) {
      return false;
    }

    if (criteria.favoritesOnly && !favSet.has(tool.id)) {
      return false;
    }

    if (
      criteria.category &&
      criteria.category !== 'All' &&
      normalizeCategoryName(tool.category).toLowerCase() !==
        normalizeCategoryName(criteria.category).toLowerCase()
    ) {
      return false;
    }

    if (criteria.pricing && criteria.pricing !== 'All') {
      if (criteria.pricing === 'Free & Freemium') {
        if (tool.pricing === 'Paid') return false;
      } else if (tool.pricing !== criteria.pricing) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      tool.name,
      tool.tagline,
      tool.shortDescription,
      tool.description,
      tool.category,
      tool.pricing,
      ...tool.tags,
      ...tool.features,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (criteria.sortBy) {
      case 'rating':
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      case 'reviews':
        return b.reviewCount - a.reviewCount || b.rating - a.rating;
      case 'newest':
        return b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'featured':
      default: {
        if (normalizedQuery) {
          const aNameMatch = a.name.toLowerCase().includes(normalizedQuery) ? 1 : 0;
          const bNameMatch = b.name.toLowerCase().includes(normalizedQuery) ? 1 : 0;
          if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;
        }
        const scoreA = getListingPriorityScore(a);
        const scoreB = getListingPriorityScore(b);
        return scoreB - scoreA || b.rating - a.rating || b.reviewCount - a.reviewCount;
      }
    }
  });

  return sorted;
}

export function buildExploreUrl(params: {
  query?: string;
  category?: string;
  pricing?: string;
  sortBy?: string;
  favoritesOnly?: boolean;
}): string {
  const sp = new URLSearchParams();
  if (params.query?.trim()) sp.set('q', params.query.trim());
  if (params.category && params.category !== 'All') sp.set('category', params.category);
  if (params.pricing && params.pricing !== 'All') sp.set('pricing', params.pricing);
  if (params.sortBy && params.sortBy !== 'featured') sp.set('sort', params.sortBy);
  if (params.favoritesOnly) sp.set('saved', '1');
  const qs = sp.toString();
  return qs ? `/explore?${qs}` : '/explore';
}

export function getSimilarTools(
  target: AITool,
  allTools: AITool[],
  limit = 3
): AITool[] {
  const targetTags = new Set(target.tags.map((t) => t.toLowerCase()));

  return allTools
    .filter((candidate) => candidate.id !== target.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.category === target.category) score += 5;
      if (candidate.pricing === target.pricing) score += 1;
      for (const tag of candidate.tags) {
        if (targetTags.has(tag.toLowerCase())) {
          score += 2;
        }
      }
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || b.candidate.rating - a.candidate.rating)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export function getToolRatingSummary(
  tool: AITool,
  allReviews: ToolReview[]
): { averageRating: number; totalReviews: number; toolReviews: ToolReview[] } {
  const toolReviews = allReviews
    .filter((r) => r.toolId === tool.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (toolReviews.length === 0) {
    return {
      averageRating: tool.reviewCount > 0 ? tool.rating : 0,
      totalReviews: tool.reviewCount,
      toolReviews: [],
    };
  }

  const baseWeight = Math.max(tool.reviewCount, 0);
  const sumUserRatings = toolReviews.reduce((sum, r) => sum + r.rating, 0);
  const weightedTotal = tool.rating * baseWeight + sumUserRatings;
  const totalReviews = baseWeight + toolReviews.length;
  const averageRating = Math.round((weightedTotal / totalReviews) * 10) / 10;

  return {
    averageRating,
    totalReviews,
    toolReviews,
  };
}

/**
 * Aggregates ONLY real recorded events and database records.
 * Never fabricates or estimates visitor, search, or click counts.
 */
export function aggregateAnalytics(params: {
  events: AnalyticsEvent[];
  clicks: AffiliateClickRecord[];
  tools: AITool[];
  subscribers: NewsletterSubscriber[];
  userCount: number;
}): AnalyticsSummary {
  const { events, clicks, tools, subscribers, userCount } = params;
  const toolMap = new Map(tools.map((t) => [t.slug, t]));

  const visitorSessions = new Set<string>();
  let totalPageViews = 0;
  let totalToolViews = 0;
  let totalSearches = 0;
  let signupEvents = 0;

  const toolViewsMap = new Map<string, number>();
  const categoryViewsMap = new Map<string, number>();
  const keywordCountsMap = new Map<string, number>();

  for (const ev of events) {
    if (ev.sessionHash) visitorSessions.add(ev.sessionHash);
    if (ev.eventType === 'page_view') {
      totalPageViews += 1;
    } else if (ev.eventType === 'tool_view') {
      totalToolViews += 1;
      if (ev.toolSlug) {
        toolViewsMap.set(ev.toolSlug, (toolViewsMap.get(ev.toolSlug) ?? 0) + 1);
      }
      if (ev.category) {
        categoryViewsMap.set(ev.category, (categoryViewsMap.get(ev.category) ?? 0) + 1);
      }
    } else if (ev.eventType === 'search' && ev.keyword?.trim()) {
      totalSearches += 1;
      const kw = ev.keyword.trim().toLowerCase();
      keywordCountsMap.set(kw, (keywordCountsMap.get(kw) ?? 0) + 1);
    } else if (ev.eventType === 'user_signup') {
      signupEvents += 1;
    }
  }

  const mostViewedTools = Array.from(toolViewsMap.entries())
    .map(([toolSlug, views]) => {
      const tool = toolMap.get(toolSlug);
      return {
        toolSlug,
        toolName: tool?.name ?? toolSlug,
        category: tool?.category ?? 'Uncategorized',
        views,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const topKeywords = Array.from(keywordCountsMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword))
    .slice(0, 10);

  const popularCategories = Array.from(categoryViewsMap.entries())
    .map(([category, views]) => ({ category, views }))
    .sort((a, b) => b.views - a.views || a.category.localeCompare(b.category))
    .slice(0, 10);

  const clicksByToolMap = new Map<
    string,
    { toolSlug: string; toolName: string; clicks: number; affiliateProgram?: string }
  >();
  for (const c of clicks) {
    const prev = clicksByToolMap.get(c.toolSlug);
    if (prev) {
      prev.clicks += 1;
    } else {
      clicksByToolMap.set(c.toolSlug, {
        toolSlug: c.toolSlug,
        toolName: c.toolName || toolMap.get(c.toolSlug)?.name || c.toolSlug,
        clicks: 1,
        affiliateProgram: c.affiliateProgram,
      });
    }
  }

  const affiliateClicksByTool = Array.from(clicksByToolMap.values()).sort(
    (a, b) => b.clicks - a.clicks
  );

  const sortedRecentClicks = [...clicks]
    .sort((a, b) => b.clickedAt.localeCompare(a.clickedAt))
    .slice(0, 20);

  return {
    totalVisitors: visitorSessions.size,
    totalPageViews,
    totalToolViews,
    totalAffiliateClicks: clicks.length,
    totalSearches,
    newUserRegistrations: Math.max(userCount, signupEvents),
    newsletterSubscriptions: subscribers.length,
    mostViewedTools,
    topKeywords,
    popularCategories,
    affiliateClicksByTool,
    recentClicks: sortedRecentClicks,
  };
}

export function hasAdminPrivileges(role?: string | null): boolean {
  return role === 'admin';
}

// SEO Builders
export function buildCanonicalUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function buildWebsiteJsonLd(baseUrl: string): Record<string, unknown> {
  const canonical = buildCanonicalUrl(baseUrl, '/');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AIVORA AI',
    description:
      'Discover the Future of Artificial Intelligence. Search, compare, and explore curated AI tools.',
    url: canonical,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${buildCanonicalUrl(baseUrl, '/explore')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildToolJsonLd(
  tool: AITool,
  ratingSummary: { averageRating: number; totalReviews: number },
  baseUrl: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.shortDescription,
    applicationCategory: tool.category,
    operatingSystem: 'Web',
    url: buildCanonicalUrl(baseUrl, `/tool/${tool.slug}`),
    sameAs: tool.websiteUrl,
    offers: {
      '@type': 'Offer',
      price: tool.pricing === 'Free' ? '0' : undefined,
      category: tool.pricing,
      description: tool.pricingSummary,
    },
    aggregateRating:
      ratingSummary.totalReviews > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: ratingSummary.averageRating,
            reviewCount: ratingSummary.totalReviews,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

export function buildArticleJsonLd(
  post: BlogPost,
  baseUrl: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    articleSection: post.category,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author,
      jobTitle: post.authorRole,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AIVORA AI',
    },
    mainEntityOfPage: post.canonicalUrl || buildCanonicalUrl(baseUrl, `/blog/${post.slug}`),
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(
  baseUrl: string,
  tools: Array<Pick<AITool, 'slug' | 'addedAt'>>,
  posts: Array<Pick<BlogPost, 'slug' | 'publishedAt'>>
): string {
  const staticPaths = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/explore', priority: '0.9', changefreq: 'daily' },
    { path: '/categories', priority: '0.8', changefreq: 'weekly' },
    { path: '/blog', priority: '0.8', changefreq: 'daily' },
    { path: '/advertise', priority: '0.7', changefreq: 'monthly' },
    { path: '/about', priority: '0.5', changefreq: 'monthly' },
    { path: '/contact', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  ];

  const entries: string[] = [];

  for (const s of staticPaths) {
    entries.push(
      `  <url>\n    <loc>${escapeXml(buildCanonicalUrl(baseUrl, s.path))}</loc>\n    <changefreq>${s.changefreq}</changefreq>\n    <priority>${s.priority}</priority>\n  </url>`
    );
  }

  for (const t of tools) {
    entries.push(
      `  <url>\n    <loc>${escapeXml(buildCanonicalUrl(baseUrl, `/tool/${t.slug}`))}</loc>\n    <lastmod>${escapeXml(t.addedAt)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }

  for (const p of posts) {
    entries.push(
      `  <url>\n    <loc>${escapeXml(buildCanonicalUrl(baseUrl, `/blog/${p.slug}`))}</loc>\n    <lastmod>${escapeXml(p.publishedAt)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

// Form Validators
export interface ToolFormInput {
  name: string;
  tagline: string;
  shortDescription: string;
  description: string;
  category: string;
  pricing: PricingModel;
  pricingSummary: string;
  websiteUrl: string;
  logoUrl?: string;
  affiliateUrl?: string;
  status?: PublicationStatus;
}

const VALID_PRICING_MODELS: PricingModel[] = ['Free', 'Freemium', 'Paid'];

export function validateToolInput(input: ToolFormInput): string | null {
  if (!input.name.trim()) return 'Tool name is required.';
  if (!input.shortDescription.trim()) return 'Short description is required.';
  if (!input.category.trim()) return 'Category is required.';
  if (!VALID_PRICING_MODELS.includes(input.pricing)) {
    return 'Pricing type must be Free, Freemium, or Paid.';
  }
  if (!isValidHttpUrl(input.websiteUrl)) {
    return 'Please enter a valid official URL starting with https:// or http://.';
  }
  if (input.logoUrl?.trim() && !isValidHttpUrl(input.logoUrl)) {
    return 'Logo or image URL must start with https:// or http:// (or leave blank).';
  }
  if (input.affiliateUrl?.trim() && !isValidHttpUrl(input.affiliateUrl)) {
    return 'Affiliate URL must start with https:// or http:// (or leave blank).';
  }
  if (input.status && input.status !== 'published' && input.status !== 'draft') {
    return 'Publication status must be Published or Draft.';
  }
  return null;
}

export interface ReviewFormInput {
  author: string;
  rating: number;
  title: string;
  comment: string;
}

export function validateReviewInput(input: ReviewFormInput): string | null {
  if (!input.author.trim()) return 'Please enter your name.';
  if (input.rating < 1 || input.rating > 5) return 'Rating must be between 1 and 5.';
  if (!input.title.trim()) return 'Please add a short review headline.';
  if (input.comment.trim().length < 10) {
    return 'Review comment must be at least 10 characters.';
  }
  return null;
}

export interface SubmissionFormInput {
  name: string;
  websiteUrl: string;
  category: string;
  shortDescription: string;
  submitterEmail: string;
  requestedTier?: ListingTier;
  campaignDurationDays?: number;
}

export function validateSubmissionInput(input: SubmissionFormInput): string | null {
  if (!input.name.trim()) return 'Tool name is required.';
  if (!isValidHttpUrl(input.websiteUrl)) {
    return 'Valid official website URL (https://...) is required.';
  }
  if (!input.category.trim()) return 'Please select a category.';
  if (input.shortDescription.trim().length < 12) {
    return 'Please describe what the tool does (at least 12 characters).';
  }
  if (!validateEmail(input.submitterEmail)) {
    return 'Please provide a valid contact email.';
  }
  if (
    input.requestedTier === 'Sponsored' &&
    (!input.campaignDurationDays || input.campaignDurationDays < 7)
  ) {
    return 'Sponsored campaigns require a campaign duration of at least 7 days.';
  }
  return null;
}

export function validateContactInquiry(
  input: Pick<ContactInquiry, 'name' | 'email' | 'message'>
): string | null {
  if (!input.name.trim()) return 'Please enter your name.';
  if (!validateEmail(input.email)) return 'Please enter a valid email address.';
  if (input.message.trim().length < 15) {
    return 'Please include a brief message (at least 15 characters).';
  }
  return null;
}

export function validateAdvertisingInquiry(
  input: Omit<AdvertisingInquiry, 'id' | 'status' | 'createdAt'>
): string | null {
  if (!input.companyName.trim()) return 'Company or product name is required.';
  if (!input.contactName.trim()) return 'Contact name is required.';
  if (!validateEmail(input.email)) return 'Please provide a valid work email.';
  if (!isValidHttpUrl(input.websiteUrl)) {
    return 'Please enter a valid product website URL (https://...).';
  }
  if (!input.campaignDurationDays || input.campaignDurationDays < 7) {
    return 'Campaign duration must be at least 7 days.';
  }
  if (input.goals.trim().length < 15) {
    return 'Please share your campaign objectives (at least 15 characters).';
  }
  return null;
}

export function validateBlogPostInput(input: {
  title: string;
  excerpt: string;
  body: string;
  category: BlogCategory;
  canonicalUrl?: string;
}): string | null {
  if (!input.title.trim()) return 'Please enter an article headline.';
  if (!input.excerpt.trim()) return 'Please add a brief article summary.';
  if (input.body.trim().length < 20) {
    return 'Please write at least 20 characters for the article body.';
  }
  if (input.canonicalUrl?.trim() && !isValidHttpUrl(input.canonicalUrl)) {
    return 'Canonical URL must be a valid https:// or http:// URL (or leave blank).';
  }
  return null;
}
