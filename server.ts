import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import { INITIAL_BLOG_META } from './src/data/blogMeta.ts';
import { INITIAL_CATEGORIES } from './src/data/categories.ts';
import { INITIAL_TOOLS } from './src/data/tools.ts';
import type {
  AdvertisingInquiry,
  AffiliateClickRecord,
  AITool,
  AnalyticsEvent,
  AnalyticsEventType,
  BlogPost,
  CategoryInfo,
  ContactInquiry,
  NewsletterSubscriber,
  SponsoredListingRequest,
  ToolSubmission,
  UserProfile,
} from './src/types/directory.ts';
import {
  aggregateAnalytics,
  buildSitemapXml,
  findDuplicateTool,
  hasAdminPrivileges,
  isToolPublished,
  isValidHttpUrl,
  normalizeCategoryName,
  resolveOutboundUrl,
  resolveSiteUrl,
  slugify,
  validateAdvertisingInquiry,
  validateContactInquiry,
  validateEmail,
  validateSubmissionInput,
  validateToolInput,
} from './src/utils/directory.ts';

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_PUBLISHABLE_KEY = (
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const supabaseClientConfigured =
  Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) && isValidHttpUrl(SUPABASE_URL);

function createSupabaseRlsClient(accessToken?: string): SupabaseClient | null {
  if (!supabaseClientConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

const supabasePublic = createSupabaseRlsClient();

// Runtime server store used when Supabase publishable key is not yet configured.
// Analytics and click logs strictly start at zero — never fabricated.
const runtimeStore = {
  tools: [...INITIAL_TOOLS] as AITool[],
  categories: [...INITIAL_CATEGORIES] as CategoryInfo[],
  blogPosts: INITIAL_BLOG_META.map((m) => ({ ...m, coverImage: '' })) as BlogPost[],
  submissions: [] as ToolSubmission[],
  sponsoredListings: [] as SponsoredListingRequest[],
  subscribers: [] as NewsletterSubscriber[],
  contactInquiries: [] as ContactInquiry[],
  advertisingInquiries: [] as AdvertisingInquiry[],
  affiliateClicks: [] as AffiliateClickRecord[],
  analyticsEvents: [] as AnalyticsEvent[],
  users: [] as UserProfile[],
};

interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    role: string;
  };
  db?: SupabaseClient;
}

function hashSession(req: Request, provided?: string): string {
  if (provided && provided.trim().length >= 6) {
    return provided.trim().slice(0, 64);
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ua = req.get('user-agent') || 'ua';
  return crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 24);
}

function getBaseUrlFromRequest(req: Request): string {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  const requestOrigin = host ? `${proto}://${host}` : undefined;
  return resolveSiteUrl({
    siteUrl: process.env.SITE_URL || process.env.VITE_SITE_URL,
    appUrl: process.env.APP_URL,
    requestOrigin,
    port: PORT,
  });
}

/**
 * Enforces real backend administrator authorization on all /api/admin/* routes
 * using Supabase Auth JWT verification + Row Level Security (publishable key only).
 * Never exposes or requires SUPABASE_SERVICE_ROLE_KEY.
 */
async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!supabaseClientConfigured) {
    res.status(503).json({
      error:
        'Admin API requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key) to be configured.',
      code: 'SUPABASE_UNCONFIGURED',
    });
    return;
  }

  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    res.status(401).json({
      error: 'Authentication required. Sign in with an administrator account.',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  const userDb = createSupabaseRlsClient(token);
  if (!userDb) {
    res.status(503).json({
      error: 'Supabase client unavailable.',
      code: 'SUPABASE_UNCONFIGURED',
    });
    return;
  }

  try {
    const { data: userData, error: userErr } = await userDb.auth.getUser(token);
    if (userErr || !userData.user) {
      res.status(401).json({
        error: 'Invalid or expired authentication session.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    const { data: profile, error: profileErr } = await userDb
      .from('profiles')
      .select('id, email, role')
      .eq('id', userData.user.id)
      .single();

    if (profileErr || !profile || !hasAdminPrivileges(profile.role)) {
      res.status(403).json({
        error: 'Administrator privileges required to access this endpoint.',
        code: 'FORBIDDEN',
      });
      return;
    }

    req.adminUser = {
      id: profile.id as string,
      email: (profile.email as string) || userData.user.email || '',
      role: profile.role as string,
    };
    req.db = userDb;
    next();
  } catch {
    res.status(500).json({
      error: 'Failed to verify administrator credentials.',
      code: 'AUTH_CHECK_FAILED',
    });
  }
}

async function fetchToolsForServer(): Promise<AITool[]> {
  if (supabasePublic) {
    const { data, error } = await supabasePublic
      .from('ai_tools')
      .select('*')
      .order('added_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(mapDbToolToModel);
    }
  }
  return runtimeStore.tools;
}

function mapDbToolToModel(row: Record<string, unknown>): AITool {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    tagline: String(row.tagline || ''),
    shortDescription: String(row.short_description || ''),
    description: String(row.description || ''),
    category: normalizeCategoryName(String(row.category || '')),
    pricing: (row.pricing as AITool['pricing']) || 'Freemium',
    pricingSummary: String(row.pricing_summary || ''),
    pricingTiers: Array.isArray(row.pricing_tiers) ? (row.pricing_tiers as AITool['pricingTiers']) : [],
    pricingSnapshotDate: String(row.pricing_snapshot_date || ''),
    websiteUrl: String(row.website_url || ''),
    affiliateUrl: row.affiliate_url ? String(row.affiliate_url) : undefined,
    affiliateProgram: row.affiliate_program ? String(row.affiliate_program) : undefined,
    affiliateTrackingId: row.affiliate_tracking_id ? String(row.affiliate_tracking_id) : undefined,
    listingTier: (row.listing_tier as AITool['listingTier']) || 'Free',
    sponsorTagline: row.sponsor_tagline ? String(row.sponsor_tagline) : undefined,
    campaignStart: row.campaign_start ? String(row.campaign_start) : undefined,
    campaignEnd: row.campaign_end ? String(row.campaign_end) : undefined,
    campaignDurationDays:
      typeof row.campaign_duration_days === 'number' ? row.campaign_duration_days : undefined,
    sponsorStatus: (row.sponsor_status as AITool['sponsorStatus']) || 'none',
    logoColor: String(row.logo_color || '#4F46E5'),
    logoTextColor: row.logo_text_color ? String(row.logo_text_color) : undefined,
    logoKey: String(row.logo_key || ''),
    logoUrl: row.logo_url ? String(row.logo_url) : undefined,
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    pros: Array.isArray(row.pros) ? (row.pros as string[]) : [],
    cons: Array.isArray(row.cons) ? (row.cons as string[]) : [],
    bestUseCases: Array.isArray(row.best_use_cases) ? (row.best_use_cases as string[]) : [],
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    status: row.status === 'draft' ? 'draft' : 'published',
    addedAt: String(row.added_at || new Date().toISOString().slice(0, 10)),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  };
}

function isMissingStatusColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('status') && (error.code === 'PGRST204' || error.code === '42703' || msg.includes('column'));
}

function mapToolToDbRow(tool: Partial<AITool>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (tool.id !== undefined) row.id = tool.id;
  if (tool.slug !== undefined) row.slug = tool.slug;
  if (tool.name !== undefined) row.name = tool.name;
  if (tool.tagline !== undefined) row.tagline = tool.tagline;
  if (tool.shortDescription !== undefined) row.short_description = tool.shortDescription;
  if (tool.description !== undefined) row.description = tool.description;
  if (tool.category !== undefined) row.category = tool.category;
  if (tool.pricing !== undefined) row.pricing = tool.pricing;
  if (tool.pricingSummary !== undefined) row.pricing_summary = tool.pricingSummary;
  if (tool.pricingTiers !== undefined) row.pricing_tiers = tool.pricingTiers;
  if (tool.pricingSnapshotDate !== undefined) row.pricing_snapshot_date = tool.pricingSnapshotDate;
  if (tool.websiteUrl !== undefined) row.website_url = tool.websiteUrl;
  if ('affiliateUrl' in tool) row.affiliate_url = tool.affiliateUrl || null;
  if ('affiliateProgram' in tool) row.affiliate_program = tool.affiliateProgram || null;
  if ('affiliateTrackingId' in tool) row.affiliate_tracking_id = tool.affiliateTrackingId || null;
  if (tool.listingTier !== undefined) row.listing_tier = tool.listingTier;
  if ('sponsorTagline' in tool) row.sponsor_tagline = tool.sponsorTagline || null;
  if ('campaignStart' in tool) row.campaign_start = tool.campaignStart || null;
  if ('campaignEnd' in tool) row.campaign_end = tool.campaignEnd || null;
  if ('campaignDurationDays' in tool) {
    row.campaign_duration_days = tool.campaignDurationDays ?? null;
  }
  if (tool.sponsorStatus !== undefined) row.sponsor_status = tool.sponsorStatus;
  if (tool.logoColor !== undefined) row.logo_color = tool.logoColor;
  if (tool.logoTextColor !== undefined) row.logo_text_color = tool.logoTextColor;
  if (tool.logoKey !== undefined) row.logo_key = tool.logoKey;
  if ('logoUrl' in tool) row.logo_url = tool.logoUrl?.trim() || null;
  if (tool.features !== undefined) row.features = tool.features;
  if (tool.pros !== undefined) row.pros = tool.pros;
  if (tool.cons !== undefined) row.cons = tool.cons;
  if (tool.bestUseCases !== undefined) row.best_use_cases = tool.bestUseCases;
  if (tool.rating !== undefined) row.rating = tool.rating;
  if (tool.reviewCount !== undefined) row.review_count = tool.reviewCount;
  if (tool.isFeatured !== undefined) row.is_featured = tool.isFeatured;
  if (tool.isTrending !== undefined) row.is_trending = tool.isTrending;
  if (tool.status !== undefined) row.status = tool.status === 'draft' ? 'draft' : 'published';
  if (tool.addedAt !== undefined) row.added_at = tool.addedAt;
  if (tool.tags !== undefined) row.tags = tool.tags;
  return row;
}

async function createAppServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));

  // Health & Config Status (never leaks secrets)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      supabaseClientConfigured,
    });
  });

  app.get('/api/config/status', async (req, res) => {
    let supabaseSchemaReady = false;
    let supabaseStatusMessage =
      'Supabase client credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured.';

    if (supabaseClientConfigured && supabasePublic) {
      try {
        const { error, status } = await supabasePublic
          .from('ai_tools')
          .select('id')
          .limit(1);
        if (!error && status >= 200 && status < 300) {
          supabaseSchemaReady = true;
          supabaseStatusMessage = 'Connected to Supabase with verified directory schema.';
        } else {
          supabaseSchemaReady = false;
          supabaseStatusMessage =
            'Supabase project is connected, but required tables are not created yet. Run /supabase/schema.sql in the Supabase SQL Editor.';
        }
      } catch {
        supabaseSchemaReady = false;
        supabaseStatusMessage =
          'Supabase client configured, but unable to verify database tables right now.';
      }
    }

    res.json({
      supabaseClientConfigured,
      supabaseSchemaReady,
      supabaseStatusMessage,
      siteUrl: getBaseUrlFromRequest(req),
    });
  });

  // SEO: robots.txt & dynamic XML sitemap
  app.get('/robots.txt', (req, res) => {
    const baseUrl = getBaseUrlFromRequest(req);
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /dashboard',
        'Disallow: /api/',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n') + '\n'
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    const baseUrl = getBaseUrlFromRequest(req);
    const tools = (await fetchToolsForServer()).filter(isToolPublished);
    let posts: Array<Pick<BlogPost, 'slug' | 'publishedAt'>> = runtimeStore.blogPosts;

    if (supabasePublic) {
      const { data, error } = await supabasePublic
        .from('blog_posts')
        .select('slug, published_at');
      if (!error && data && data.length > 0) {
        posts = data.map((row) => ({
          slug: String(row.slug),
          publishedAt: String(row.published_at || new Date().toISOString().slice(0, 10)),
        }));
      }
    }

    const xml = buildSitemapXml(baseUrl, tools, posts);
    res.type('application/xml').send(xml);
  });

  // Outbound Affiliate / Official Website Redirect & Real Click Logger
  app.get('/go/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').trim();
    const sourcePage = String(req.query.src || 'directory').slice(0, 64);
    const tools = (await fetchToolsForServer()).filter(isToolPublished);
    const tool = tools.find((t) => t.slug === slug);

    if (!tool) {
      res.redirect(302, '/explore');
      return;
    }

    const resolved = resolveOutboundUrl(tool);
    if (!isValidHttpUrl(resolved.targetUrl)) {
      res.redirect(302, `/tool/${encodeURIComponent(tool.slug)}`);
      return;
    }

    const sessionHash = hashSession(req);
    const clickRecord: AffiliateClickRecord = {
      id: `clk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      toolId: tool.id,
      toolSlug: tool.slug,
      toolName: tool.name,
      affiliateProgram: resolved.affiliateProgram,
      affiliateTrackingId: resolved.affiliateTrackingId,
      targetUrl: resolved.targetUrl,
      isAffiliate: resolved.isAffiliate,
      sourcePage,
      referrer: req.get('referer') || undefined,
      clickedAt: new Date().toISOString(),
    };

    runtimeStore.affiliateClicks.unshift(clickRecord);
    if (runtimeStore.affiliateClicks.length > 1000) {
      runtimeStore.affiliateClicks.length = 1000;
    }

    if (supabasePublic) {
      await Promise.all([
        supabasePublic.from('affiliate_clicks').insert({
          tool_id: clickRecord.toolId,
          tool_slug: clickRecord.toolSlug,
          tool_name: clickRecord.toolName,
          affiliate_program: clickRecord.affiliateProgram || null,
          affiliate_tracking_id: clickRecord.affiliateTrackingId || null,
          target_url: clickRecord.targetUrl,
          is_affiliate: clickRecord.isAffiliate,
          source_page: clickRecord.sourcePage,
          referrer: clickRecord.referrer || null,
          session_hash: sessionHash,
        }),
        supabasePublic.from('analytics_events').insert({
          event_type: 'affiliate_click',
          path: `/go/${tool.slug}`,
          tool_id: tool.id,
          tool_slug: tool.slug,
          category: tool.category,
          session_hash: sessionHash,
        }),
      ]);
    }

    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, resolved.targetUrl);
  });

  // Real Analytics Event Ingestion (zero fake counts)
  app.post('/api/analytics/event', async (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    const eventType = String(body?.eventType || '') as AnalyticsEventType;
    const allowed: AnalyticsEventType[] = [
      'page_view',
      'tool_view',
      'search',
      'affiliate_click',
      'user_signup',
      'newsletter_signup',
    ];
    if (!allowed.includes(eventType)) {
      res.status(400).json({ error: 'Invalid analytics eventType.' });
      return;
    }

    const sessionHash = hashSession(req, typeof body?.sessionHash === 'string' ? body.sessionHash : undefined);
    const event: AnalyticsEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType,
      path: typeof body?.path === 'string' ? body.path.slice(0, 200) : undefined,
      toolId: typeof body?.toolId === 'string' ? body.toolId.slice(0, 100) : undefined,
      toolSlug: typeof body?.toolSlug === 'string' ? body.toolSlug.slice(0, 120) : undefined,
      category: typeof body?.category === 'string' ? body.category.slice(0, 80) : undefined,
      keyword: typeof body?.keyword === 'string' ? body.keyword.trim().slice(0, 120) : undefined,
      sessionHash,
      createdAt: new Date().toISOString(),
    };

    runtimeStore.analyticsEvents.unshift(event);
    if (runtimeStore.analyticsEvents.length > 5000) {
      runtimeStore.analyticsEvents.length = 5000;
    }

    if (supabasePublic) {
      await supabasePublic.from('analytics_events').insert({
        event_type: event.eventType,
        path: event.path || null,
        tool_id: event.toolId || null,
        tool_slug: event.toolSlug || null,
        category: event.category || null,
        keyword: event.keyword || null,
        session_hash: event.sessionHash,
      });
    }

    res.status(201).json({ ok: true });
  });

  // Public Form Endpoints (with validation + RLS-protected Supabase persistence)
  app.post('/api/newsletter', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!validateEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const record: NewsletterSubscriber = {
      id: `nl-${Date.now()}`,
      email,
      subscribedAt: new Date().toISOString().slice(0, 10),
    };

    if (!runtimeStore.subscribers.some((s) => s.email.toLowerCase() === email)) {
      runtimeStore.subscribers.unshift(record);
    }

    if (supabasePublic) {
      const { error } = await supabasePublic.from('newsletter_subscribers').insert({
        id: record.id,
        email: record.email,
        subscribed_at: record.subscribedAt,
      });
      if (error && error.code !== '23505') {
        res.status(500).json({ error: 'Failed to store newsletter subscription.' });
        return;
      }
    }

    res.status(201).json({ ok: true, subscriber: record });
  });

  app.post('/api/submissions', async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const input = {
      name: String(body.name || ''),
      websiteUrl: String(body.websiteUrl || ''),
      category: String(body.category || ''),
      pricing: (body.pricing as AITool['pricing']) || 'Freemium',
      shortDescription: String(body.shortDescription || ''),
      submitterEmail: String(body.submitterEmail || ''),
      requestedTier: (body.requestedTier as ToolSubmission['requestedTier']) || 'Free',
      campaignDurationDays:
        typeof body.campaignDurationDays === 'number'
          ? body.campaignDurationDays
          : Number(body.campaignDurationDays) || undefined,
      companyName: typeof body.companyName === 'string' ? body.companyName.trim() : undefined,
    };

    const err = validateSubmissionInput(input);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }

    const existingTools = await fetchToolsForServer();
    const duplicate = findDuplicateTool(
      { name: input.name, websiteUrl: input.websiteUrl },
      existingTools
    );
    if (duplicate) {
      res.status(409).json({
        error: `"${duplicate.name}" is already listed in the AIVORA AI directory.`,
      });
      return;
    }

    const submission: ToolSubmission = {
      id: `sub-${Date.now()}`,
      name: input.name.trim(),
      websiteUrl: input.websiteUrl.trim(),
      category: normalizeCategoryName(input.category),
      pricing: input.pricing,
      shortDescription: input.shortDescription.trim(),
      submitterEmail: input.submitterEmail.trim(),
      requestedTier: input.requestedTier,
      campaignDurationDays: input.campaignDurationDays,
      companyName: input.companyName,
      status: 'pending',
      submittedAt: new Date().toISOString().slice(0, 10),
    };

    runtimeStore.submissions.unshift(submission);

    let sponsoredRequest: SponsoredListingRequest | null = null;
    if (input.requestedTier === 'Featured' || input.requestedTier === 'Sponsored') {
      sponsoredRequest = {
        id: `spon-${Date.now()}`,
        toolName: submission.name,
        toolSlug: slugify(submission.name),
        websiteUrl: submission.websiteUrl,
        category: submission.category,
        pricing: submission.pricing,
        shortDescription: submission.shortDescription,
        listingTier: input.requestedTier,
        campaignDurationDays: input.campaignDurationDays || 30,
        companyName: input.companyName || submission.name,
        contactEmail: submission.submitterEmail,
        billingStatus: 'admin_managed',
        approvalStatus: 'pending',
        createdAt: new Date().toISOString(),
      };
      runtimeStore.sponsoredListings.unshift(sponsoredRequest);
    }

    if (supabasePublic) {
      await supabasePublic.from('tool_submissions').insert({
        id: submission.id,
        name: submission.name,
        website_url: submission.websiteUrl,
        category: submission.category,
        pricing: submission.pricing,
        short_description: submission.shortDescription,
        submitter_email: submission.submitterEmail,
        requested_tier: submission.requestedTier || 'Free',
        campaign_duration_days: submission.campaignDurationDays || null,
        status: 'pending',
        submitted_at: submission.submittedAt,
      });

      if (sponsoredRequest) {
        await supabasePublic.from('sponsored_listings').insert({
          id: sponsoredRequest.id,
          tool_name: sponsoredRequest.toolName,
          tool_slug: sponsoredRequest.toolSlug || null,
          website_url: sponsoredRequest.websiteUrl,
          category: sponsoredRequest.category,
          pricing: sponsoredRequest.pricing,
          short_description: sponsoredRequest.shortDescription,
          listing_tier: sponsoredRequest.listingTier,
          campaign_duration_days: sponsoredRequest.campaignDurationDays,
          company_name: sponsoredRequest.companyName,
          contact_email: sponsoredRequest.contactEmail,
          billing_status: sponsoredRequest.billingStatus,
          approval_status: 'pending',
        });
      }
    }

    res.status(201).json({
      ok: true,
      submission,
      sponsoredRequest,
      requiresAdminApproval: Boolean(sponsoredRequest),
    });
  });

  app.post('/api/contact', async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const payload = {
      name: String(body.name || ''),
      email: String(body.email || ''),
      topic: String(body.topic || 'General Feedback'),
      message: String(body.message || ''),
    };
    const err = validateContactInquiry(payload);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }

    const inquiry: ContactInquiry = {
      id: `ct-${Date.now()}`,
      name: payload.name.trim(),
      email: payload.email.trim(),
      topic: payload.topic.trim(),
      message: payload.message.trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    runtimeStore.contactInquiries.unshift(inquiry);

    if (supabasePublic) {
      const { error } = await supabasePublic.from('contact_inquiries').insert({
        id: inquiry.id,
        name: inquiry.name,
        email: inquiry.email,
        topic: inquiry.topic,
        message: inquiry.message,
        status: 'new',
      });
      if (error) {
        res.status(500).json({ error: 'Unable to persist contact inquiry.' });
        return;
      }
    }

    res.status(201).json({
      ok: true,
      persistedToDatabase: supabaseClientConfigured,
      inquiry,
    });
  });

  app.post('/api/advertising', async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const payload = {
      companyName: String(body.companyName || ''),
      contactName: String(body.contactName || ''),
      email: String(body.email || ''),
      websiteUrl: String(body.websiteUrl || ''),
      requestedTier:
        (body.requestedTier as AdvertisingInquiry['requestedTier']) || 'Sponsored',
      campaignDurationDays: Number(body.campaignDurationDays || 30),
      monthlyBudget: String(body.monthlyBudget || ''),
      goals: String(body.goals || ''),
    };

    const err = validateAdvertisingInquiry(payload);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }

    const inquiry: AdvertisingInquiry = {
      id: `adv-${Date.now()}`,
      ...payload,
      companyName: payload.companyName.trim(),
      contactName: payload.contactName.trim(),
      email: payload.email.trim(),
      websiteUrl: payload.websiteUrl.trim(),
      monthlyBudget: payload.monthlyBudget.trim(),
      goals: payload.goals.trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    runtimeStore.advertisingInquiries.unshift(inquiry);

    if (supabasePublic) {
      const { error } = await supabasePublic.from('advertising_inquiries').insert({
        id: inquiry.id,
        company_name: inquiry.companyName,
        contact_name: inquiry.contactName,
        email: inquiry.email,
        website_url: inquiry.websiteUrl,
        requested_tier: inquiry.requestedTier,
        campaign_duration_days: inquiry.campaignDurationDays,
        monthly_budget: inquiry.monthlyBudget,
        goals: inquiry.goals,
        status: 'new',
      });
      if (error) {
        res.status(500).json({ error: 'Unable to persist advertising inquiry.' });
        return;
      }
    }

    res.status(201).json({
      ok: true,
      persistedToDatabase: supabaseClientConfigured,
      inquiry,
    });
  });

  // =========================================================================
  // ADMIN-PROTECTED ROUTES (/api/admin/*) — Strictly Verified via Supabase JWT + RLS
  // =========================================================================
  const adminRouter = express.Router();
  adminRouter.use(requireAdmin);

  adminRouter.get('/overview', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const [
      toolsRes,
      clicksRes,
      eventsRes,
      subsRes,
      sponsorsRes,
      submissionsRes,
      subscribersRes,
      contactRes,
      adRes,
      usersRes,
    ] = await Promise.all([
      db.from('ai_tools').select('*').order('added_at', { ascending: false }),
      db.from('affiliate_clicks').select('*').order('clicked_at', { ascending: false }).limit(500),
      db.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(2000),
      db.from('tool_submissions').select('*').order('submitted_at', { ascending: false }),
      db.from('sponsored_listings').select('*').order('created_at', { ascending: false }),
      db.from('tool_submissions').select('*').order('submitted_at', { ascending: false }),
      db.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }),
      db.from('contact_inquiries').select('*').order('created_at', { ascending: false }),
      db.from('advertising_inquiries').select('*').order('created_at', { ascending: false }),
      db.from('profiles').select('*').order('created_at', { ascending: false }),
    ]);

    const tools = (toolsRes.data || []).map(mapDbToolToModel);
    const clicks: AffiliateClickRecord[] = (clicksRes.data || []).map((c) => ({
      id: String(c.id),
      toolId: String(c.tool_id),
      toolSlug: String(c.tool_slug),
      toolName: String(c.tool_name),
      affiliateProgram: c.affiliate_program ? String(c.affiliate_program) : undefined,
      affiliateTrackingId: c.affiliate_tracking_id ? String(c.affiliate_tracking_id) : undefined,
      targetUrl: String(c.target_url),
      isAffiliate: Boolean(c.is_affiliate),
      sourcePage: String(c.source_page || 'directory'),
      referrer: c.referrer ? String(c.referrer) : undefined,
      clickedAt: String(c.clicked_at),
    }));

    const events: AnalyticsEvent[] = (eventsRes.data || []).map((e) => ({
      id: String(e.id),
      eventType: e.event_type as AnalyticsEventType,
      path: e.path ? String(e.path) : undefined,
      toolId: e.tool_id ? String(e.tool_id) : undefined,
      toolSlug: e.tool_slug ? String(e.tool_slug) : undefined,
      category: e.category ? String(e.category) : undefined,
      keyword: e.keyword ? String(e.keyword) : undefined,
      sessionHash: String(e.session_hash),
      createdAt: String(e.created_at),
    }));

    const subscribers: NewsletterSubscriber[] = (subscribersRes.data || []).map((s) => ({
      id: String(s.id),
      email: String(s.email),
      subscribedAt: String(s.subscribed_at),
    }));

    const users: UserProfile[] = (usersRes.data || []).map((u) => ({
      id: String(u.id),
      email: String(u.email),
      fullName: String(u.full_name || ''),
      avatarUrl: u.avatar_url ? String(u.avatar_url) : undefined,
      company: u.company ? String(u.company) : undefined,
      bio: u.bio ? String(u.bio) : undefined,
      role: (u.role === 'admin' ? 'admin' : 'user'),
      createdAt: String(u.created_at),
    }));

    const analytics = aggregateAnalytics({
      events,
      clicks,
      tools: tools.length > 0 ? tools : runtimeStore.tools,
      subscribers,
      userCount: users.length,
    });

    res.json({
      tools,
      supabaseToolsCount: tools.length,
      analytics,
      affiliateClicks: clicks,
      sponsoredListings: (sponsorsRes.data || []).map((s) => ({
        id: String(s.id),
        toolName: String(s.tool_name),
        toolSlug: s.tool_slug ? String(s.tool_slug) : undefined,
        websiteUrl: String(s.website_url),
        category: String(s.category),
        pricing: s.pricing,
        shortDescription: String(s.short_description),
        listingTier: s.listing_tier,
        campaignDurationDays: Number(s.campaign_duration_days || 30),
        campaignStart: s.campaign_start ? String(s.campaign_start) : undefined,
        campaignEnd: s.campaign_end ? String(s.campaign_end) : undefined,
        companyName: String(s.company_name || ''),
        contactEmail: String(s.contact_email),
        billingStatus: String(s.billing_status),
        approvalStatus: String(s.approval_status),
        adminNotes: s.admin_notes ? String(s.admin_notes) : undefined,
        createdAt: String(s.created_at),
      })),
      submissions: (submissionsRes.data || subsRes.data || []).map((sub) => ({
        id: String(sub.id),
        name: String(sub.name),
        websiteUrl: String(sub.website_url),
        category: String(sub.category),
        pricing: sub.pricing,
        shortDescription: String(sub.short_description),
        submitterEmail: String(sub.submitter_email),
        requestedTier: sub.requested_tier || 'Free',
        campaignDurationDays: sub.campaign_duration_days || undefined,
        status: sub.status,
        submittedAt: String(sub.submitted_at),
      })),
      subscribers,
      contactInquiries: (contactRes.data || []).map((c) => ({
        id: String(c.id),
        name: String(c.name),
        email: String(c.email),
        topic: String(c.topic),
        message: String(c.message),
        status: c.status,
        createdAt: String(c.created_at),
      })),
      advertisingInquiries: (adRes.data || []).map((a) => ({
        id: String(a.id),
        companyName: String(a.company_name),
        contactName: String(a.contact_name),
        email: String(a.email),
        websiteUrl: String(a.website_url),
        requestedTier: a.requested_tier,
        campaignDurationDays: Number(a.campaign_duration_days || 30),
        monthlyBudget: String(a.monthly_budget || ''),
        goals: String(a.goals),
        status: a.status,
        createdAt: String(a.created_at),
      })),
      users,
    });
  });

  adminRouter.post('/tools/sync-starter', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const rows = INITIAL_TOOLS.map((t) =>
      mapToolToDbRow({ ...t, status: t.status || 'published' })
    );
    let { data, error } = await db
      .from('ai_tools')
      .upsert(rows, { onConflict: 'id' })
      .select()
      .order('added_at', { ascending: false });

    if (error && isMissingStatusColumnError(error)) {
      const fallbackRows = rows.map(({ status: _s, ...rest }) => rest);
      const retry = await db
        .from('ai_tools')
        .upsert(fallbackRows, { onConflict: 'id' })
        .select()
        .order('added_at', { ascending: false });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    const syncedTools = (data || []).map((r) => mapDbToolToModel(r as Record<string, unknown>));
    res.json({ ok: true, count: syncedTools.length, tools: syncedTools });
  });

  adminRouter.post('/tools', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const tool = req.body as AITool;
    const normalizedCategory = normalizeCategoryName(tool.category || '');
    const status = tool.status === 'draft' ? 'draft' : 'published';
    const err = validateToolInput({
      name: tool.name || '',
      tagline: tool.tagline || tool.shortDescription || '',
      shortDescription: tool.shortDescription || '',
      description: tool.description || tool.shortDescription || '',
      category: normalizedCategory,
      pricing: tool.pricing || 'Freemium',
      pricingSummary: tool.pricingSummary || '',
      websiteUrl: tool.websiteUrl || '',
      logoUrl: tool.logoUrl,
      affiliateUrl: tool.affiliateUrl,
      status,
    });
    if (err) {
      res.status(400).json({ error: err });
      return;
    }

    const { data: existingRows } = await db
      .from('ai_tools')
      .select('id, slug, name, website_url');
    const existingList = (existingRows || []).map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      name: String(r.name),
      websiteUrl: String(r.website_url || ''),
    }));
    const duplicate = findDuplicateTool(
      { id: tool.id, name: tool.name || '', websiteUrl: tool.websiteUrl || '' },
      existingList
    );
    if (duplicate) {
      res.status(409).json({
        error: `Duplicate tool blocked: "${duplicate.name}" already uses this name or official website.`,
      });
      return;
    }

    const sanitizedTool: AITool = {
      ...tool,
      id: tool.id || `tool-${Date.now()}`,
      slug: tool.slug || slugify(tool.name || '') || `tool-${Date.now()}`,
      name: tool.name.trim(),
      tagline: (tool.tagline || tool.shortDescription || '').trim(),
      shortDescription: tool.shortDescription.trim(),
      description: (tool.description || tool.shortDescription || '').trim(),
      category: normalizedCategory,
      websiteUrl: tool.websiteUrl.trim(),
      logoUrl: tool.logoUrl?.trim() || undefined,
      status,
      addedAt: tool.addedAt || new Date().toISOString().slice(0, 10),
      rating: typeof tool.rating === 'number' ? tool.rating : 0,
      reviewCount: typeof tool.reviewCount === 'number' ? tool.reviewCount : 0,
      features: Array.isArray(tool.features) ? tool.features : [],
      pros: Array.isArray(tool.pros) ? tool.pros : [],
      cons: Array.isArray(tool.cons) ? tool.cons : [],
      bestUseCases: Array.isArray(tool.bestUseCases) ? tool.bestUseCases : [],
      pricingTiers: Array.isArray(tool.pricingTiers) ? tool.pricingTiers : [],
    };

    const dbRow = mapToolToDbRow(sanitizedTool);
    let { data, error } = await db
      .from('ai_tools')
      .upsert(dbRow)
      .select()
      .single();

    if (error && isMissingStatusColumnError(error)) {
      if (sanitizedTool.status === 'draft') {
        res.status(400).json({
          error:
            'Saving as Draft requires the updated /supabase/schema.sql migration (adds the status column to public.ai_tools).',
        });
        return;
      }
      const { status: _s, ...rowWithoutStatus } = dbRow;
      const retry = await db
        .from('ai_tools')
        .upsert(rowWithoutStatus)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ tool: mapDbToolToModel(data as Record<string, unknown>) });
  });

  adminRouter.put('/tools/:id', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const patch = { ...(req.body as Partial<AITool>) };
    if (patch.category !== undefined) {
      patch.category = normalizeCategoryName(patch.category);
    }
    if (patch.pricing !== undefined && !['Free', 'Freemium', 'Paid'].includes(patch.pricing)) {
      res.status(400).json({ error: 'Pricing type must be Free, Freemium, or Paid.' });
      return;
    }
    if (patch.status !== undefined && patch.status !== 'published' && patch.status !== 'draft') {
      res.status(400).json({ error: 'Publication status must be Published or Draft.' });
      return;
    }
    if (patch.name !== undefined && !patch.name.trim()) {
      res.status(400).json({ error: 'Tool name is required.' });
      return;
    }
    if (patch.shortDescription !== undefined && !patch.shortDescription.trim()) {
      res.status(400).json({ error: 'Short description is required.' });
      return;
    }
    if (patch.websiteUrl !== undefined && !isValidHttpUrl(patch.websiteUrl)) {
      res.status(400).json({ error: 'Invalid websiteUrl. Must start with http:// or https://.' });
      return;
    }
    if (patch.logoUrl?.trim() && !isValidHttpUrl(patch.logoUrl)) {
      res.status(400).json({ error: 'Invalid logoUrl. Must start with http:// or https://.' });
      return;
    }
    if (patch.affiliateUrl?.trim() && !isValidHttpUrl(patch.affiliateUrl)) {
      res.status(400).json({ error: 'Invalid affiliateUrl.' });
      return;
    }

    if (patch.name !== undefined || patch.websiteUrl !== undefined) {
      const { data: existingRows } = await db
        .from('ai_tools')
        .select('id, slug, name, website_url');
      const currentRow = (existingRows || []).find((r) => String(r.id) === req.params.id);
      const checkName = patch.name ?? (currentRow ? String(currentRow.name) : '');
      const checkUrl = patch.websiteUrl ?? (currentRow ? String(currentRow.website_url || '') : '');
      if (checkName && checkUrl) {
        const duplicate = findDuplicateTool(
          { id: req.params.id, name: checkName, websiteUrl: checkUrl },
          (existingRows || []).map((r) => ({
            id: String(r.id),
            slug: String(r.slug),
            name: String(r.name),
            websiteUrl: String(r.website_url || ''),
          }))
        );
        if (duplicate) {
          res.status(409).json({
            error: `Duplicate tool blocked: "${duplicate.name}" already uses this name or official website.`,
          });
          return;
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      ...mapToolToDbRow(patch),
      updated_at: new Date().toISOString(),
    };
    let { data, error } = await db
      .from('ai_tools')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();

    if (error && isMissingStatusColumnError(error)) {
      if (patch.status === 'draft') {
        res.status(400).json({
          error:
            'Setting status to Draft requires running the updated /supabase/schema.sql migration (adds the status column to public.ai_tools).',
        });
        return;
      }
      const { status: _s, ...payloadWithoutStatus } = updatePayload;
      const retry = await db
        .from('ai_tools')
        .update(payloadWithoutStatus)
        .eq('id', req.params.id)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      const starter = INITIAL_TOOLS.find((t) => t.id === req.params.id);
      if (!starter) {
        res.status(404).json({ error: 'Tool not found in Supabase ai_tools table.' });
        return;
      }
      const merged: AITool = {
        ...starter,
        ...patch,
        id: starter.id,
        slug: starter.slug,
        status: patch.status ?? starter.status ?? 'published',
      };
      const row = mapToolToDbRow(merged);
      let upserted = await db.from('ai_tools').upsert(row).select().single();
      if (upserted.error && isMissingStatusColumnError(upserted.error)) {
        if (merged.status === 'draft') {
          res.status(400).json({
            error:
              'Setting status to Draft requires running the updated /supabase/schema.sql migration.',
          });
          return;
        }
        const { status: _s, ...rowNoStatus } = row;
        upserted = await db.from('ai_tools').upsert(rowNoStatus).select().single();
      }
      if (upserted.error) {
        res.status(500).json({ error: upserted.error.message });
        return;
      }
      res.json({ tool: mapDbToolToModel(upserted.data as Record<string, unknown>) });
      return;
    }

    res.json({ tool: mapDbToolToModel(data as Record<string, unknown>) });
  });

  adminRouter.delete('/tools/:id', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const { error } = await db
      .from('ai_tools')
      .delete()
      .eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  adminRouter.post('/categories', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const cat = req.body as CategoryInfo;
    const { error } = await db.from('categories').upsert({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      icon_key: cat.iconKey,
      accent_color: cat.accentColor,
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ category: cat });
  });

  adminRouter.put('/categories/:id', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const patch = req.body as Partial<CategoryInfo>;
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.accentColor !== undefined) row.accent_color = patch.accentColor;
    const { error } = await db
      .from('categories')
      .update(row)
      .eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  adminRouter.delete('/categories/:id', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const { error } = await db
      .from('categories')
      .delete()
      .eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  adminRouter.post('/blog', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const post = req.body as BlogPost;
    const { error } = await db.from('blog_posts').upsert({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      author: post.author,
      author_role: post.authorRole,
      published_at: post.publishedAt,
      read_time_minutes: post.readTimeMinutes,
      cover_image: post.coverImage,
      related_tool_slugs: post.relatedToolSlugs,
      sections: post.sections,
      seo_title: post.seoTitle || null,
      seo_description: post.seoDescription || null,
      canonical_url: post.canonicalUrl || null,
      focus_keyword: post.focusKeyword || null,
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ post });
  });

  adminRouter.put('/blog/:id', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const patch = req.body as Partial<BlogPost>;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.excerpt !== undefined) row.excerpt = patch.excerpt;
    if (patch.category !== undefined) row.category = patch.category;
    if (patch.sections !== undefined) row.sections = patch.sections;
    if (patch.relatedToolSlugs !== undefined) row.related_tool_slugs = patch.relatedToolSlugs;
    if ('seoTitle' in patch) row.seo_title = patch.seoTitle || null;
    if ('seoDescription' in patch) row.seo_description = patch.seoDescription || null;
    if ('canonicalUrl' in patch) row.canonical_url = patch.canonicalUrl || null;
    if ('focusKeyword' in patch) row.focus_keyword = patch.focusKeyword || null;

    const { error } = await db
      .from('blog_posts')
      .update(row)
      .eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  adminRouter.delete('/blog/:id', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const { error } = await db
      .from('blog_posts')
      .delete()
      .eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  });

  adminRouter.post('/submissions/:id/decision', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';
    const { error } = await db
      .from('tool_submissions')
      .update({ status: decision })
      .eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true, status: decision });
  });

  adminRouter.post('/sponsored/:id/decision', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const rawDecision = req.body?.decision;
    const decision =
      rawDecision === 'approved'
        ? 'approved'
        : rawDecision === 'pending'
          ? 'pending'
          : 'rejected';
    const campaignStart = new Date().toISOString().slice(0, 10);
    const { data: sponsorRow, error } = await db
      .from('sponsored_listings')
      .update({
        approval_status: decision,
        campaign_start: decision === 'approved' ? campaignStart : null,
        admin_notes:
          typeof req.body?.notes === 'string' ? req.body.notes.slice(0, 500) : null,
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error || !sponsorRow) {
      res.status(500).json({ error: error?.message || 'Sponsored listing not found.' });
      return;
    }

    const toolSlug = String(sponsorRow.tool_slug || slugify(String(sponsorRow.tool_name)));

    if (decision === 'approved') {
      const duration = Number(sponsorRow.campaign_duration_days || 30);
      const endDate = new Date(Date.now() + duration * 86400000).toISOString().slice(0, 10);

      await db
        .from('sponsored_listings')
        .update({ campaign_end: endDate })
        .eq('id', req.params.id);

      const { data: existingTool } = await db
        .from('ai_tools')
        .select('id')
        .eq('slug', toolSlug)
        .maybeSingle();

      if (existingTool) {
        await db
          .from('ai_tools')
          .update({
            listing_tier: sponsorRow.listing_tier,
            sponsor_status: 'approved',
            is_featured:
              sponsorRow.listing_tier === 'Featured' || sponsorRow.listing_tier === 'Sponsored',
            campaign_start: campaignStart,
            campaign_end: endDate,
            campaign_duration_days: duration,
          })
          .eq('id', existingTool.id);
      } else {
        await db.from('ai_tools').insert({
          id: `tool-${Date.now()}`,
          slug: toolSlug,
          name: sponsorRow.tool_name,
          tagline: sponsorRow.short_description,
          short_description: sponsorRow.short_description,
          description: sponsorRow.short_description,
          category: normalizeCategoryName(String(sponsorRow.category || '')),
          pricing: sponsorRow.pricing,
          pricing_summary: '',
          pricing_tiers: [],
          pricing_snapshot_date: '',
          website_url: sponsorRow.website_url,
          listing_tier: sponsorRow.listing_tier,
          sponsor_status: 'approved',
          campaign_start: campaignStart,
          campaign_end: endDate,
          campaign_duration_days: duration,
          logo_color: '#4F46E5',
          logo_key: toolSlug,
          features: [],
          pros: [],
          cons: [],
          best_use_cases: [],
          rating: 0,
          review_count: 0,
          is_featured: true,
          is_trending: false,
          added_at: campaignStart,
          tags: [slugify(String(sponsorRow.category))],
        });
      }
    } else {
      // If paused/pending or rejected, revert linked tool promotion without deleting the tool
      await db
        .from('ai_tools')
        .update({
          sponsor_status: decision,
          listing_tier: 'Free',
          is_featured: false,
        })
        .eq('slug', toolSlug);
    }

    res.json({ ok: true, decision });
  });

  adminRouter.patch('/users/:id/role', async (req: AuthenticatedRequest, res) => {
    const db = req.db!;
    const role = req.body?.role === 'admin' ? 'admin' : 'user';
    const { error } = await db
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true, role });
  });

  app.use('/api/admin', adminRouter);

  // Vite / Static SPA Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AIVORA AI server listening on http://0.0.0.0:${PORT}`);
  });
}

// Keep unused fs import guard clean if needed or check dist existence gracefully
void fs;
createAppServer().catch((err) => {
  console.error('Failed to start AIVORA AI server:', err);
  process.exit(1);
});
