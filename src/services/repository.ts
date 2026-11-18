import { INITIAL_BLOG_POSTS } from '../data/blogPosts';
import { INITIAL_CATEGORIES } from '../data/categories';
import { INITIAL_REVIEWS, INITIAL_TOOLS } from '../data/tools';
import { isSupabaseClientConfigured, supabase } from '../lib/supabase';
import { normalizeCategoryName } from '../utils/directory';
import {
  AITool,
  BlogPost,
  CategoryInfo,
  DirectoryRepository,
  NewsletterSubscriber,
  ToolReview,
  ToolSubmission,
  UserProfile,
} from '../types/directory';

const STORAGE_KEYS = {
  tools: 'aivora_tools_v2',
  categories: 'aivora_categories_v2',
  blogPosts: 'aivora_blog_posts_v2',
  reviews: 'aivora_reviews_v2',
  favorites: 'aivora_favorites_v2',
  recentlyViewed: 'aivora_recently_viewed_v1',
  submissions: 'aivora_submissions_v2',
  subscribers: 'aivora_subscribers_v2',
  sessionHash: 'aivora_session_hash_v1',
};

const INITIAL_SUBMISSIONS: ToolSubmission[] = [
  {
    id: 'sub-demo-1',
    name: 'Granola',
    websiteUrl: 'https://www.granola.ai',
    category: 'Productivity',
    pricing: 'Freemium',
    shortDescription:
      'AI notepad for back-to-back meetings that enhances your rough notes without intrusive bots.',
    submitterEmail: 'community@granola.ai',
    requestedTier: 'Free',
    status: 'pending',
    submittedAt: '2026-11-12',
  },
  {
    id: 'sub-demo-2',
    name: 'Luma Dream Machine',
    websiteUrl: 'https://lumalabs.ai/dream-machine',
    category: 'AI Video',
    pricing: 'Freemium',
    shortDescription:
      'High-speed keyframe and text-to-video generation model with realistic camera motion.',
    submitterEmail: 'creators@lumalabs.ai',
    requestedTier: 'Featured',
    campaignDurationDays: 30,
    status: 'pending',
    submittedAt: '2026-11-13',
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues cleanly
  }
}

export function getOrCreateVisitorSessionHash(): string {
  if (typeof window === 'undefined') return 'server-session';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEYS.sessionHash);
    if (existing) return existing;
    const created = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_KEYS.sessionHash, created);
    return created;
  } catch {
    return `v-${Date.now().toString(36)}`;
  }
}

function mapSupabaseTool(row: Record<string, unknown>): AITool {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    tagline: String(row.tagline || ''),
    shortDescription: String(row.short_description || ''),
    description: String(row.description || ''),
    category: String(row.category || ''),
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

let allowSupabaseCatalogQueries = false;

export function setSupabaseSchemaReady(ready: boolean): void {
  allowSupabaseCatalogQueries = ready;
}

export class HybridDirectoryRepository implements DirectoryRepository {
  async getTools(): Promise<AITool[]> {
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries) {
      const { data, error } = await supabase
        .from('ai_tools')
        .select('*')
        .order('added_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((row) => mapSupabaseTool(row as Record<string, unknown>));
      }
    }
    const stored = readJson<AITool[] | null>(STORAGE_KEYS.tools, null);
    if (!stored || stored.length === 0) {
      writeJson(STORAGE_KEYS.tools, INITIAL_TOOLS);
      return INITIAL_TOOLS;
    }
    return stored.map((t) => ({
      ...t,
      category: normalizeCategoryName(t.category),
    }));
  }

  async saveTools(tools: AITool[]): Promise<void> {
    writeJson(STORAGE_KEYS.tools, tools);
  }

  async getCategories(): Promise<CategoryInfo[]> {
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries) {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: String(row.id),
          slug: String(row.slug),
          name: normalizeCategoryName(String(row.name)),
          description: String(row.description),
          iconKey: String(row.icon_key || 'Layers'),
          accentColor: String(row.accent_color || '#4F46E5'),
        }));
      }
    }
    const stored = readJson<CategoryInfo[] | null>(STORAGE_KEYS.categories, null);
    if (!stored || stored.length === 0) {
      writeJson(STORAGE_KEYS.categories, INITIAL_CATEGORIES);
      return INITIAL_CATEGORIES;
    }
    return stored.map((c) => ({
      ...c,
      name: normalizeCategoryName(c.name),
    }));
  }

  async saveCategories(categories: CategoryInfo[]): Promise<void> {
    writeJson(STORAGE_KEYS.categories, categories);
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: String(row.id),
          slug: String(row.slug),
          title: String(row.title),
          excerpt: String(row.excerpt),
          category: row.category as BlogPost['category'],
          author: String(row.author),
          authorRole: String(row.author_role),
          publishedAt: String(row.published_at),
          readTimeMinutes: Number(row.read_time_minutes || 5),
          coverImage: String(row.cover_image || INITIAL_BLOG_POSTS[0]?.coverImage || ''),
          relatedToolSlugs: Array.isArray(row.related_tool_slugs)
            ? (row.related_tool_slugs as string[])
            : [],
          sections: Array.isArray(row.sections) ? (row.sections as BlogPost['sections']) : [],
          seoTitle: row.seo_title ? String(row.seo_title) : undefined,
          seoDescription: row.seo_description ? String(row.seo_description) : undefined,
          canonicalUrl: row.canonical_url ? String(row.canonical_url) : undefined,
          focusKeyword: row.focus_keyword ? String(row.focus_keyword) : undefined,
        }));
      }
    }
    const stored = readJson<BlogPost[] | null>(STORAGE_KEYS.blogPosts, null);
    if (!stored || stored.length === 0) {
      writeJson(STORAGE_KEYS.blogPosts, INITIAL_BLOG_POSTS);
      return INITIAL_BLOG_POSTS;
    }
    return stored;
  }

  async saveBlogPosts(posts: BlogPost[]): Promise<void> {
    writeJson(STORAGE_KEYS.blogPosts, posts);
  }

  async getReviews(): Promise<ToolReview[]> {
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries) {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: String(row.id),
          toolId: String(row.tool_id),
          userId: row.user_id ? String(row.user_id) : undefined,
          author: String(row.author),
          role: String(row.role || 'Community Reviewer'),
          rating: Number(row.rating),
          title: String(row.title),
          comment: String(row.comment),
          createdAt: String(row.created_at),
        }));
      }
    }
    const stored = readJson<ToolReview[] | null>(STORAGE_KEYS.reviews, null);
    if (!stored) {
      writeJson(STORAGE_KEYS.reviews, INITIAL_REVIEWS);
      return INITIAL_REVIEWS;
    }
    return stored;
  }

  async addReview(review: ToolReview): Promise<ToolReview[]> {
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries && review.userId) {
      await supabase.from('reviews').insert({
        id: review.id,
        tool_id: review.toolId,
        user_id: review.userId,
        author: review.author,
        role: review.role,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        created_at: review.createdAt,
      });
    }
    const current = await this.getReviews();
    const exists = current.some((r) => r.id === review.id);
    const updated = exists ? current : [review, ...current];
    writeJson(STORAGE_KEYS.reviews, updated);
    return updated;
  }

  async getFavorites(userId?: string): Promise<string[]> {
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries && userId) {
      const { data, error } = await supabase
        .from('favorites')
        .select('tool_id')
        .eq('user_id', userId);
      if (!error && data) {
        return data.map((row) => String(row.tool_id));
      }
    }
    return readJson<string[]>(STORAGE_KEYS.favorites, []);
  }

  async saveFavorites(ids: string[], userId?: string): Promise<void> {
    writeJson(STORAGE_KEYS.favorites, ids);
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries && userId) {
      await supabase.from('favorites').delete().eq('user_id', userId);
      if (ids.length > 0) {
        await supabase
          .from('favorites')
          .insert(ids.map((toolId) => ({ user_id: userId, tool_id: toolId })));
      }
    }
  }

  async getRecentlyViewed(userId?: string): Promise<string[]> {
    if (isSupabaseClientConfigured && supabase && allowSupabaseCatalogQueries && userId) {
      const { data, error } = await supabase
        .from('recently_viewed')
        .select('tool_id')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(12);
      if (!error && data) {
        return data.map((row) => String(row.tool_id));
      }
    }
    return readJson<string[]>(STORAGE_KEYS.recentlyViewed, []);
  }

  async saveRecentlyViewed(ids: string[], userId?: string): Promise<void> {
    const trimmed = ids.slice(0, 12);
    writeJson(STORAGE_KEYS.recentlyViewed, trimmed);
    if (isSupabaseClientConfigured && supabase && userId && trimmed.length > 0) {
      await supabase.from('recently_viewed').upsert(
        {
          user_id: userId,
          tool_id: trimmed[0],
          viewed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tool_id' }
      );
    }
  }

  async getSubmissions(): Promise<ToolSubmission[]> {
    const stored = readJson<ToolSubmission[] | null>(STORAGE_KEYS.submissions, null);
    if (!stored) {
      writeJson(STORAGE_KEYS.submissions, INITIAL_SUBMISSIONS);
      return INITIAL_SUBMISSIONS;
    }
    return stored;
  }

  async saveSubmissions(submissions: ToolSubmission[]): Promise<void> {
    writeJson(STORAGE_KEYS.submissions, submissions);
  }

  async getSubscribers(): Promise<NewsletterSubscriber[]> {
    return readJson<NewsletterSubscriber[]>(STORAGE_KEYS.subscribers, []);
  }

  async addSubscriber(
    subscriber: NewsletterSubscriber
  ): Promise<NewsletterSubscriber[]> {
    const current = await this.getSubscribers();
    const exists = current.some(
      (s) => s.email.toLowerCase() === subscriber.email.toLowerCase()
    );
    if (exists) return current;
    const updated = [subscriber, ...current];
    writeJson(STORAGE_KEYS.subscribers, updated);
    return updated;
  }

  async fetchProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseClientConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return {
      id: String(data.id),
      email: String(data.email || ''),
      fullName: String(data.full_name || ''),
      avatarUrl: data.avatar_url ? String(data.avatar_url) : undefined,
      company: data.company ? String(data.company) : undefined,
      bio: data.bio ? String(data.bio) : undefined,
      role: data.role === 'admin' ? 'admin' : 'user',
      createdAt: String(data.created_at || ''),
    };
  }

  async resetDemoData(): Promise<void> {
    writeJson(STORAGE_KEYS.tools, INITIAL_TOOLS);
    writeJson(STORAGE_KEYS.categories, INITIAL_CATEGORIES);
    writeJson(STORAGE_KEYS.blogPosts, INITIAL_BLOG_POSTS);
    writeJson(STORAGE_KEYS.reviews, INITIAL_REVIEWS);
    writeJson(STORAGE_KEYS.submissions, INITIAL_SUBMISSIONS);
  }
}

export const directoryRepository = new HybridDirectoryRepository();
