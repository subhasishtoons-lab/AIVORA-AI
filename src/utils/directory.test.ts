import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_BLOG_META } from '../data/blogMeta';
import { INITIAL_TOOLS } from '../data/tools';
import { ALL_BLOG_CATEGORIES } from '../types/directory';
import {
  aggregateAnalytics,
  buildCanonicalUrl,
  buildExploreUrl,
  buildOutboundRedirectPath,
  buildSitemapXml,
  buildToolJsonLd,
  filterAndSortAdminTools,
  filterAndSortTools,
  findDuplicateTool,
  getListingPriorityScore,
  isToolPublished,
  getSimilarTools,
  getToolRatingSummary,
  hasAdminPrivileges,
  normalizeCategoryName,
  resolveOutboundUrl,
  resolveSiteUrl,
  slugify,
  validateAdvertisingInquiry,
  validateBlogPostInput,
  validateContactInquiry,
  validateEmail,
  validateReviewInput,
  validateSubmissionInput,
  validateToolInput,
} from './directory';

test('INITIAL_TOOLS includes at least 30 AI tools and never invents affiliate links', () => {
  assert.ok(INITIAL_TOOLS.length >= 30, `Expected >= 30 tools, got ${INITIAL_TOOLS.length}`);
  for (const tool of INITIAL_TOOLS) {
    assert.equal(
      tool.affiliateUrl,
      undefined,
      `Tool ${tool.name} should not have an invented default affiliate URL`
    );
  }
  const requiredBrands = [
    'ChatGPT',
    'Gemini',
    'Claude',
    'Midjourney',
    'Canva Magic Studio',
    'Runway',
    'ElevenLabs',
    'Perplexity',
    'Cursor',
    'Suno',
  ];
  for (const brand of requiredBrands) {
    assert.ok(
      INITIAL_TOOLS.some((t) => t.name === brand),
      `Missing expected recognizable tool: ${brand}`
    );
  }
});

test('INITIAL_BLOG_META covers all 6 required content marketing categories', () => {
  const presentCategories = new Set(INITIAL_BLOG_META.map((p) => p.category));
  for (const category of ALL_BLOG_CATEGORIES) {
    assert.ok(
      presentCategories.has(category),
      `Missing blog article for category: ${category}`
    );
  }
});

test('resolveOutboundUrl uses configured affiliate URL or falls back to official website', () => {
  const cursor = INITIAL_TOOLS.find((t) => t.slug === 'cursor')!;
  const fallback = resolveOutboundUrl(cursor);
  assert.equal(fallback.isAffiliate, false);
  assert.equal(fallback.targetUrl, cursor.websiteUrl);

  const configured = resolveOutboundUrl({
    websiteUrl: 'https://example.com',
    affiliateUrl: 'https://partner.example.com/?ref=aivora42',
    affiliateProgram: 'Impact Partner',
    affiliateTrackingId: 'aivora42',
  });
  assert.equal(configured.isAffiliate, true);
  assert.equal(configured.targetUrl, 'https://partner.example.com/?ref=aivora42');
  assert.equal(configured.affiliateProgram, 'Impact Partner');
  assert.equal(configured.affiliateTrackingId, 'aivora42');

  assert.equal(
    buildOutboundRedirectPath('cursor', 'detail_page'),
    '/go/cursor?src=detail_page'
  );
});

test('listing tier priority respects approved Sponsored and Featured campaigns', () => {
  const baseTool = { ...INITIAL_TOOLS[0], isFeatured: false, isTrending: false };
  const pendingSponsor = {
    ...baseTool,
    listingTier: 'Sponsored' as const,
    sponsorStatus: 'pending' as const,
  };
  const activeSponsor = {
    ...baseTool,
    id: 'tool-sponsor-active',
    listingTier: 'Sponsored' as const,
    sponsorStatus: 'approved' as const,
    campaignStart: '2026-11-01',
    campaignEnd: '2026-11-30',
  };
  const expiredSponsor = {
    ...baseTool,
    listingTier: 'Sponsored' as const,
    sponsorStatus: 'approved' as const,
    campaignStart: '2025-01-01',
    campaignEnd: '2025-01-31',
  };
  const featuredTool = {
    ...baseTool,
    id: 'tool-featured-paid',
    listingTier: 'Featured' as const,
    sponsorStatus: 'approved' as const,
  };

  assert.equal(getListingPriorityScore(pendingSponsor, '2026-11-15'), 0);
  assert.equal(getListingPriorityScore(expiredSponsor, '2026-11-15'), 0);
  assert.equal(getListingPriorityScore(featuredTool, '2026-11-15'), 3);
  assert.equal(getListingPriorityScore(activeSponsor, '2026-11-15'), 4);
});

test('aggregateAnalytics reports zero when no events exist and aggregates real clicks/views/searches', () => {
  const emptySummary = aggregateAnalytics({
    events: [],
    clicks: [],
    tools: INITIAL_TOOLS,
    subscribers: [],
    userCount: 0,
  });
  assert.equal(emptySummary.totalVisitors, 0);
  assert.equal(emptySummary.totalPageViews, 0);
  assert.equal(emptySummary.totalAffiliateClicks, 0);
  assert.equal(emptySummary.mostViewedTools.length, 0);
  assert.equal(emptySummary.topKeywords.length, 0);

  const realSummary = aggregateAnalytics({
    events: [
      {
        id: 'e1',
        eventType: 'page_view',
        path: '/',
        sessionHash: 'sess-1',
        createdAt: '2026-11-15T10:00:00Z',
      },
      {
        id: 'e2',
        eventType: 'tool_view',
        toolSlug: 'cursor',
        category: 'Coding and Development',
        sessionHash: 'sess-1',
        createdAt: '2026-11-15T10:01:00Z',
      },
      {
        id: 'e3',
        eventType: 'search',
        keyword: 'Cursor',
        sessionHash: 'sess-2',
        createdAt: '2026-11-15T10:02:00Z',
      },
    ],
    clicks: [
      {
        id: 'c1',
        toolId: 'tool-cursor',
        toolSlug: 'cursor',
        toolName: 'Cursor',
        targetUrl: 'https://www.cursor.com',
        isAffiliate: false,
        sourcePage: 'explore',
        clickedAt: '2026-11-15T10:03:00Z',
      },
    ],
    tools: INITIAL_TOOLS,
    subscribers: [{ id: 's1', email: 'a@b.com', subscribedAt: '2026-11-15' }],
    userCount: 3,
  });

  assert.equal(realSummary.totalVisitors, 2);
  assert.equal(realSummary.totalPageViews, 1);
  assert.equal(realSummary.totalToolViews, 1);
  assert.equal(realSummary.totalSearches, 1);
  assert.equal(realSummary.totalAffiliateClicks, 1);
  assert.equal(realSummary.newsletterSubscriptions, 1);
  assert.equal(realSummary.newUserRegistrations, 3);
  assert.equal(realSummary.mostViewedTools[0].toolSlug, 'cursor');
  assert.equal(realSummary.topKeywords[0].keyword, 'cursor');
});

test('hasAdminPrivileges strictly requires role === admin', () => {
  assert.equal(hasAdminPrivileges('admin'), true);
  assert.equal(hasAdminPrivileges('user'), false);
  assert.equal(hasAdminPrivileges(undefined), false);
  assert.equal(hasAdminPrivileges(null), false);
});

test('SEO helpers generate valid canonical URLs, JSON-LD, and XML sitemap', () => {
  const canonical = buildCanonicalUrl('https://aivora.ai/', 'tool/cursor');
  assert.equal(canonical, 'https://aivora.ai/tool/cursor');

  const cursor = INITIAL_TOOLS.find((t) => t.slug === 'cursor')!;
  const jsonLd = buildToolJsonLd(cursor, { averageRating: 4.8, totalReviews: 120 }, 'https://aivora.ai');
  assert.equal(jsonLd['@type'], 'SoftwareApplication');
  assert.equal(jsonLd.url, 'https://aivora.ai/tool/cursor');

  const xml = buildSitemapXml('https://aivora.ai', [cursor], INITIAL_BLOG_META);
  assert.ok(xml.includes('<loc>https://aivora.ai/tool/cursor</loc>'));
  assert.ok(xml.includes('<loc>https://aivora.ai/advertise</loc>'));
});

test('filterAndSortTools filters by search query, category, pricing, and favorites', () => {
  const codingFree = filterAndSortTools(INITIAL_TOOLS, {
    query: 'cursor',
    category: 'Coding and Development',
    pricing: 'Freemium',
    sortBy: 'featured',
  });
  assert.ok(codingFree.length >= 1);
  assert.equal(codingFree[0].slug, 'cursor');

  const descOnlyMatch = filterAndSortTools(INITIAL_TOOLS, {
    query: 'Composer',
    category: 'All',
    pricing: 'All',
    sortBy: 'featured',
  });
  assert.ok(
    descOnlyMatch.some((t) => t.slug === 'cursor'),
    'Expected search query matching full description ("Composer") to return Cursor'
  );

  const sortedByName = filterAndSortTools(INITIAL_TOOLS, {
    query: '',
    category: 'All',
    pricing: 'All',
    sortBy: 'name',
  });
  for (let i = 1; i < sortedByName.length; i += 1) {
    assert.ok(
      sortedByName[i - 1].name.localeCompare(sortedByName[i].name) <= 0,
      'Expected alphabetical ordering for sortBy="name"'
    );
  }

  const sortedByNewest = filterAndSortTools(INITIAL_TOOLS, {
    query: '',
    category: 'All',
    pricing: 'All',
    sortBy: 'newest',
  });
  for (let i = 1; i < sortedByNewest.length; i += 1) {
    assert.ok(
      sortedByNewest[i - 1].addedAt >= sortedByNewest[i].addedAt,
      'Expected newest-first addedAt ordering for sortBy="newest"'
    );
  }

  const favoritesFiltered = filterAndSortTools(INITIAL_TOOLS, {
    query: '',
    category: 'All',
    pricing: 'All',
    sortBy: 'name',
    favoritesOnly: true,
    favoriteIds: ['tool-claude', 'tool-runway'],
  });
  assert.deepEqual(
    favoritesFiltered.map((t) => t.slug),
    ['claude', 'runway']
  );
});

test('getSimilarTools excludes target tool and prioritizes same category', () => {
  const cursor = INITIAL_TOOLS.find((t) => t.slug === 'cursor')!;
  const similar = getSimilarTools(cursor, INITIAL_TOOLS, 3);
  assert.equal(similar.length, 3);
  assert.ok(similar.every((t) => t.id !== cursor.id));
  assert.equal(similar[0].category, 'Coding and Development');
});

test('getToolRatingSummary computes combined review totals', () => {
  const cursor = INITIAL_TOOLS.find((t) => t.slug === 'cursor')!;
  const summary = getToolRatingSummary(cursor, [
    {
      id: 'r-test',
      toolId: cursor.id,
      author: 'Alex',
      role: 'Engineer',
      rating: 5,
      title: 'Great IDE',
      comment: 'Super fast multi-file edits.',
      createdAt: '2026-11-12',
    },
  ]);
  assert.equal(summary.totalReviews, cursor.reviewCount + 1);
  assert.equal(summary.toolReviews.length, 1);
});

test('validation helpers validate tools, affiliates, advertising, contact, blog SEO, and reviews', () => {
  assert.equal(slugify('v0 by Vercel!'), 'v0-by-vercel');
  assert.equal(validateEmail('team@aivora.ai'), true);
  assert.equal(validateEmail('invalid-email'), false);

  assert.ok(
    validateToolInput({
      name: 'Test Tool',
      tagline: 'Fast AI',
      shortDescription: 'Does something useful',
      description: 'Full description',
      category: 'Coding and Development',
      pricing: 'Freemium',
      pricingSummary: 'Free tier',
      websiteUrl: 'https://example.com',
      affiliateUrl: 'javascript:alert(1)',
    }) !== null
  );

  assert.equal(
    validateAdvertisingInquiry({
      companyName: 'Acme AI',
      contactName: 'Dana',
      email: 'dana@acme.ai',
      websiteUrl: 'https://acme.ai',
      requestedTier: 'Sponsored',
      campaignDurationDays: 30,
      monthlyBudget: '$1,500',
      goals: 'Launch our new AI code review assistant to engineering leaders.',
    }),
    null
  );

  assert.ok(
    validateContactInquiry({
      name: 'Sam',
      email: 'bad',
      message: 'Hi there, how are you?',
    }) !== null
  );

  assert.ok(
    validateBlogPostInput({
      title: 'Guide',
      excerpt: 'Short summary',
      body: 'Valid body content with enough length to pass validation cleanly.',
      category: 'AI Tool Reviews',
      canonicalUrl: 'not-a-url',
    }) !== null
  );

  assert.ok(
    validateReviewInput({
      author: 'Sam',
      rating: 5,
      title: 'Nice',
      comment: 'Too short',
    }) !== null
  );

  assert.equal(
    validateSubmissionInput({
      name: 'Acme AI',
      websiteUrl: 'https://acme.ai',
      category: 'AI Business',
      shortDescription: 'Automates weekly spreadsheet reporting cleanly.',
      submitterEmail: 'founder@acme.ai',
      requestedTier: 'Sponsored',
      campaignDurationDays: 14,
    }),
    null
  );
});

test('buildExploreUrl omits default parameters and preserves active filters', () => {
  assert.equal(
    buildExploreUrl({ query: '', category: 'All', pricing: 'All', sortBy: 'featured' }),
    '/explore'
  );
  assert.equal(
    buildExploreUrl({
      query: 'cursor',
      category: 'Coding and Development',
      pricing: 'Freemium',
      sortBy: 'rating',
      favoritesOnly: true,
    }),
    '/explore?q=cursor&category=Coding+and+Development&pricing=Freemium&sort=rating&saved=1'
  );
});

test('resolveSiteUrl handles local development, placeholder values, request origin, and production SITE_URL', () => {
  assert.equal(
    resolveSiteUrl({
      siteUrl: 'https://aivora.ai/',
      appUrl: 'http://localhost:5173',
      requestOrigin: 'http://localhost:3000',
    }),
    'https://aivora.ai'
  );
  assert.equal(
    resolveSiteUrl({
      siteUrl: '',
      appUrl: 'http://localhost:5173',
      requestOrigin: 'http://localhost:3000',
    }),
    'http://localhost:3000'
  );
  assert.equal(
    resolveSiteUrl({
      siteUrl: '',
      appUrl: 'MY_APP_URL',
      requestOrigin: 'http://localhost:3000',
    }),
    'http://localhost:3000'
  );
  assert.equal(
    resolveSiteUrl({
      siteUrl: '',
      appUrl: 'https://staging.aivora.ai/',
      requestOrigin: '',
      port: 3000,
    }),
    'https://staging.aivora.ai'
  );
  assert.equal(
    resolveSiteUrl({
      siteUrl: '',
      appUrl: '',
      requestOrigin: '',
      port: 3000,
    }),
    'http://localhost:3000'
  );
});

test('normalizeCategoryName maps legacy category names and findDuplicateTool prevents duplicate tools', () => {
  assert.equal(normalizeCategoryName('AI Coding'), 'Coding and Development');
  assert.equal(normalizeCategoryName('AI Marketing'), 'Marketing and SEO');
  assert.equal(normalizeCategoryName('Image Generation'), 'Image Generation');

  assert.ok(
    findDuplicateTool(
      { name: 'Cursor AI', websiteUrl: 'https://www.cursor.com/' },
      INITIAL_TOOLS
    ),
    'Expected duplicate detection by normalized domain/path'
  );
  assert.ok(
    findDuplicateTool(
      { name: 'chatgpt', websiteUrl: 'https://other.example.com' },
      INITIAL_TOOLS
    ),
    'Expected duplicate detection by case-insensitive name'
  );
  assert.equal(
    findDuplicateTool(
      { id: 'tool-cursor', name: 'Cursor', websiteUrl: 'https://cursor.com' },
      INITIAL_TOOLS
    ),
    null,
    'Expected self-edit of the same tool id not to trigger duplicate rejection'
  );
  assert.equal(
    findDuplicateTool(
      { name: 'Brand New Verified Tool', websiteUrl: 'https://unique-tool.example.com' },
      INITIAL_TOOLS
    ),
    null
  );
});

test('getToolRatingSummary handles unrated tools cleanly without inventing ratings', () => {
  const newTool = {
    ...INITIAL_TOOLS[0],
    id: 'tool-brand-new',
    rating: 0,
    reviewCount: 0,
  };
  const noReviews = getToolRatingSummary(newTool, []);
  assert.equal(noReviews.averageRating, 0);
  assert.equal(noReviews.totalReviews, 0);

  const oneReview = getToolRatingSummary(newTool, [
    {
      id: 'rev-1',
      toolId: 'tool-brand-new',
      author: 'Taylor',
      role: 'Designer',
      rating: 4,
      title: 'Solid tool',
      comment: 'Works reliably for our daily creative workflow.',
      createdAt: '2026-11-15',
    },
  ]);
  assert.equal(oneReview.averageRating, 4);
  assert.equal(oneReview.totalReviews, 1);
});

test('isToolPublished and filterAndSortTools exclude draft tools from public directory', () => {
  const baseTool = INITIAL_TOOLS[0];
  const draftTool = {
    ...baseTool,
    id: 'tool-draft-only',
    slug: 'draft-secret-tool',
    name: 'Draft Secret AI',
    status: 'draft' as const,
  };
  const publishedTool = {
    ...baseTool,
    id: 'tool-published-explicit',
    slug: 'published-ai',
    name: 'Published AI',
    status: 'published' as const,
  };

  assert.equal(isToolPublished({ status: undefined }), true);
  assert.equal(isToolPublished(publishedTool), true);
  assert.equal(isToolPublished(draftTool), false);

  const publicResults = filterAndSortTools([draftTool, publishedTool], {
    query: '',
    category: 'All',
    pricing: 'All',
    sortBy: 'featured',
  });
  assert.deepEqual(
    publicResults.map((t) => t.id),
    ['tool-published-explicit']
  );
});

test('filterAndSortAdminTools searches strictly by name, filters by category/pricing/status, and sorts cleanly', () => {
  const sampleTools = [
    {
      ...INITIAL_TOOLS[0],
      id: 't1',
      name: 'Zeta Writer',
      shortDescription: 'Mentions Alpha inside description only',
      category: 'AI Writing',
      pricing: 'Freemium' as const,
      status: 'published' as const,
      addedAt: '2026-11-10',
    },
    {
      ...INITIAL_TOOLS[0],
      id: 't2',
      name: 'Alpha Studio',
      shortDescription: 'Draft image suite',
      category: 'Image Generation',
      pricing: 'Paid' as const,
      status: 'draft' as const,
      addedAt: '2026-11-14',
    },
    {
      ...INITIAL_TOOLS[0],
      id: 't3',
      name: 'Beta Coder',
      shortDescription: 'Free coding assistant',
      category: 'Coding and Development',
      pricing: 'Free' as const,
      status: 'published' as const,
      addedAt: '2026-11-12',
    },
  ];

  // Search strictly matches tool name (so "Alpha" matches Alpha Studio, not Zeta Writer's description)
  const byNameOnly = filterAndSortAdminTools(sampleTools, {
    query: 'alpha',
    category: 'All',
    pricing: 'All',
    status: 'All',
    sortBy: 'newest',
  });
  assert.deepEqual(
    byNameOnly.map((t) => t.id),
    ['t2']
  );

  // Filter by status = draft
  const drafts = filterAndSortAdminTools(sampleTools, {
    query: '',
    category: 'All',
    pricing: 'All',
    status: 'draft',
    sortBy: 'newest',
  });
  assert.deepEqual(
    drafts.map((t) => t.id),
    ['t2']
  );

  // Filter by category & pricing
  const freeCoding = filterAndSortAdminTools(sampleTools, {
    query: '',
    category: 'Coding and Development',
    pricing: 'Free',
    status: 'published',
    sortBy: 'newest',
  });
  assert.deepEqual(
    freeCoding.map((t) => t.id),
    ['t3']
  );

  // Sort by newest
  const newest = filterAndSortAdminTools(sampleTools, {
    query: '',
    category: 'All',
    pricing: 'All',
    status: 'All',
    sortBy: 'newest',
  });
  assert.deepEqual(
    newest.map((t) => t.id),
    ['t2', 't3', 't1']
  );

  // Sort A-Z and Z-A
  const asc = filterAndSortAdminTools(sampleTools, {
    query: '',
    category: 'All',
    pricing: 'All',
    status: 'All',
    sortBy: 'name-asc',
  });
  assert.deepEqual(
    asc.map((t) => t.name),
    ['Alpha Studio', 'Beta Coder', 'Zeta Writer']
  );

  const desc = filterAndSortAdminTools(sampleTools, {
    query: '',
    category: 'All',
    pricing: 'All',
    status: 'All',
    sortBy: 'name-desc',
  });
  assert.deepEqual(
    desc.map((t) => t.name),
    ['Zeta Writer', 'Beta Coder', 'Alpha Studio']
  );
});

test('validateToolInput validates required fields, websiteUrl, logoUrl, and publication status', () => {
  const validInput = {
    name: 'Test AI',
    tagline: 'Smart assistant',
    shortDescription: 'Helps teams summarize complex workflows.',
    description: 'Full description of Test AI.',
    category: 'AI Writing',
    pricing: 'Freemium' as const,
    pricingSummary: 'Free tier; Pro $15/mo',
    websiteUrl: 'https://example.com',
    logoUrl: 'https://example.com/logo.png',
    status: 'draft' as const,
  };

  assert.equal(validateToolInput(validInput), null);
  assert.equal(validateToolInput({ ...validInput, logoUrl: '' }), null);

  assert.ok(validateToolInput({ ...validInput, name: '   ' }) !== null);
  assert.ok(validateToolInput({ ...validInput, shortDescription: '' }) !== null);
  assert.ok(validateToolInput({ ...validInput, websiteUrl: 'ftp://example.com' }) !== null);
  assert.ok(validateToolInput({ ...validInput, logoUrl: 'javascript:alert(1)' }) !== null);
});

