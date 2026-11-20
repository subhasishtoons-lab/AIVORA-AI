import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { INITIAL_BLOG_POSTS } from '../data/blogPosts';
import { INITIAL_CATEGORIES } from '../data/categories';
import { INITIAL_REVIEWS, INITIAL_TOOLS } from '../data/tools';
import { isSupabaseClientConfigured, supabase } from '../lib/supabase';
import {
  directoryRepository,
  getOrCreateVisitorSessionHash,
  setSupabaseSchemaReady,
} from '../services/repository';
import {
  AdvertisingInquiry,
  AffiliateClickRecord,
  AITool,
  AnalyticsEventType,
  AnalyticsSummary,
  BlogPost,
  CategoryInfo,
  ContactInquiry,
  IntegrationConfigStatus,
  NewsletterSubscriber,
  SponsoredListingRequest,
  ToolReview,
  ToolSubmission,
  UserProfile,
} from '../types/directory';
import {
  buildCanonicalUrl,
  findDuplicateTool,
  normalizeCategoryName,
  slugify,
} from '../utils/directory';

export type ThemeMode = 'light' | 'dark';
export type AuthModalMode = 'login' | 'signup' | 'reset' | 'update-password' | null;

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'error';
}

export interface SeoMetaOptions {
  canonicalPath?: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | null;
}

const EMPTY_ANALYTICS: AnalyticsSummary = {
  totalVisitors: 0,
  totalPageViews: 0,
  totalToolViews: 0,
  totalAffiliateClicks: 0,
  totalSearches: 0,
  newUserRegistrations: 0,
  newsletterSubscriptions: 0,
  mostViewedTools: [],
  topKeywords: [],
  popularCategories: [],
  affiliateClicksByTool: [],
  recentClicks: [],
};

interface DirectoryContextValue {
  tools: AITool[];
  categories: CategoryInfo[];
  blogPosts: BlogPost[];
  reviews: ToolReview[];
  favorites: string[];
  recentlyViewedIds: string[];
  submissions: ToolSubmission[];
  sponsoredListings: SponsoredListingRequest[];
  subscribers: NewsletterSubscriber[];
  contactInquiries: ContactInquiry[];
  advertisingInquiries: AdvertisingInquiry[];
  affiliateClicks: AffiliateClickRecord[];
  analytics: AnalyticsSummary;
  usersList: UserProfile[];
  isLoading: boolean;
  directoryError: string | null;
  retryDirectoryLoad: () => Promise<void>;
  configStatus: IntegrationConfigStatus;
  theme: ThemeMode;
  toggleTheme: () => void;
  currentPath: string;
  searchParams: URLSearchParams;
  navigate: (to: string) => void;
  setSeoMeta: (title: string, description: string, options?: SeoMetaOptions) => void;
  compareIds: string[];
  toggleCompare: (toolId: string) => void;
  clearCompare: () => void;
  isCompareModalOpen: boolean;
  setCompareModalOpen: (open: boolean) => void;
  authModalMode: AuthModalMode;
  openAuthModal: (mode: Exclude<AuthModalMode, null>) => void;
  closeAuthModal: () => void;
  isSupabaseReady: boolean;
  authLoading: boolean;
  currentUser: UserProfile | null;
  accessToken: string | null;
  isAdmin: boolean;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null; needsEmailConfirm?: boolean }>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (
    patch: Partial<Pick<UserProfile, 'fullName' | 'company' | 'bio'>>
  ) => Promise<string | null>;
  isSubmitModalOpen: boolean;
  setSubmitModalOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (text: string, tone?: 'success' | 'info' | 'error') => void;
  dismissToast: (id: string) => void;
  toggleFavorite: (toolId: string) => Promise<void>;
  recordToolView: (tool: AITool) => void;
  trackSearchQuery: (keyword: string) => void;
  submitReview: (review: Omit<ToolReview, 'id' | 'createdAt'>) => Promise<void>;
  submitToolProposal: (
    proposal: Omit<ToolSubmission, 'id' | 'status' | 'submittedAt'>
  ) => Promise<{ requiresAdminApproval: boolean; error: string | null }>;
  submitContactInquiry: (
    input: Omit<ContactInquiry, 'id' | 'status' | 'createdAt'>
  ) => Promise<string | null>;
  submitAdvertisingInquiry: (
    input: Omit<AdvertisingInquiry, 'id' | 'status' | 'createdAt'>
  ) => Promise<string | null>;
  subscribeNewsletter: (email: string) => Promise<boolean>;
  supabaseToolsCount: number | null;
  syncStarterToolsToSupabase: () => Promise<boolean>;
  refreshAdminData: () => Promise<string | null>;
  adminError: string | null;
  addTool: (
    tool: Omit<AITool, 'id' | 'slug' | 'addedAt' | 'rating' | 'reviewCount'>
  ) => Promise<AITool | null>;
  updateTool: (id: string, patch: Partial<AITool>) => Promise<boolean>;
  deleteTool: (id: string) => Promise<boolean>;
  addCategory: (cat: Omit<CategoryInfo, 'id' | 'slug'>) => Promise<boolean>;
  updateCategory: (id: string, patch: Partial<CategoryInfo>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  addBlogPost: (post: Omit<BlogPost, 'id' | 'slug' | 'publishedAt'>) => Promise<boolean>;
  updateBlogPost: (id: string, patch: Partial<BlogPost>) => Promise<boolean>;
  deleteBlogPost: (id: string) => Promise<boolean>;
  approveSubmission: (id: string) => Promise<boolean>;
  rejectSubmission: (id: string) => Promise<boolean>;
  decideSponsoredListing: (
    id: string,
    decision: 'approved' | 'rejected' | 'pending',
    notes?: string
  ) => Promise<boolean>;
  updateUserRole: (userId: string, role: 'user' | 'admin') => Promise<boolean>;
  resetDemoData: () => Promise<void>;
}

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

function parseLocation(): { path: string; params: URLSearchParams } {
  if (typeof window === 'undefined') {
    return { path: '/', params: new URLSearchParams() };
  }
  const rawPath = window.location.pathname || '/';
  const normalized =
    rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
  return {
    path: normalized,
    params: new URLSearchParams(window.location.search),
  };
}

function sendAnalyticsEvent(payload: {
  eventType: AnalyticsEventType;
  path?: string;
  toolId?: string;
  toolSlug?: string;
  category?: string;
  keyword?: string;
}) {
  if (typeof window === 'undefined' || !isSupabaseClientConfigured || !supabase) return;
  const sessionHash = getOrCreateVisitorSessionHash();
  supabase
    .from('analytics_events')
    .insert({
      event_type: payload.eventType,
      session_hash: sessionHash,
      path: payload.path || window.location.pathname,
      tool_id: payload.toolId || null,
      tool_slug: payload.toolSlug || null,
      category: payload.category || null,
      keyword: payload.keyword || null,
    })
    .then(() => {})
    .catch(() => {});
}

function serializeToolForSupabase(tool: AITool): Record<string, unknown> {
  return {
    id: tool.id,
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline || '',
    short_description: tool.shortDescription || '',
    description: tool.description || '',
    category: tool.category,
    pricing: tool.pricing,
    pricing_summary: tool.pricingSummary || '',
    pricing_tiers: tool.pricingTiers || [],
    pricing_snapshot_date: tool.pricingSnapshotDate || '',
    website_url: tool.websiteUrl,
    affiliate_url: tool.affiliateUrl || null,
    affiliate_program: tool.affiliateProgram || null,
    affiliate_tracking_id: tool.affiliateTrackingId || null,
    listing_tier: tool.listingTier || 'Free',
    sponsor_tagline: tool.sponsorTagline || null,
    campaign_start: tool.campaignStart || null,
    campaign_end: tool.campaignEnd || null,
    campaign_duration_days: tool.campaignDurationDays ?? null,
    sponsor_status: tool.sponsorStatus || 'none',
    logo_color: tool.logoColor || '#4F46E5',
    logo_text_color: tool.logoTextColor || null,
    logo_key: tool.logoKey || '',
    logo_url: tool.logoUrl || null,
    features: tool.features || [],
    pros: tool.pros || [],
    cons: tool.cons || [],
    best_use_cases: tool.bestUseCases || [],
    rating: tool.rating ?? 0,
    review_count: tool.reviewCount ?? 0,
    is_featured: Boolean(tool.isFeatured),
    is_trending: Boolean(tool.isTrending),
    status: tool.status === 'draft' ? 'draft' : 'published',
    added_at: tool.addedAt || new Date().toISOString().slice(0, 10),
    tags: tool.tags || [],
  };
}

async function checkSupabaseSchemaReady(): Promise<boolean> {
  if (!isSupabaseClientConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('categories').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const [tools, setTools] = useState<AITool[]>(INITIAL_TOOLS);
  const [categories, setCategories] = useState<CategoryInfo[]>(INITIAL_CATEGORIES);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [reviews, setReviews] = useState<ToolReview[]>(INITIAL_REVIEWS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<ToolSubmission[]>([]);
  const [sponsoredListings, setSponsoredListings] = useState<SponsoredListingRequest[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [advertisingInquiries, setAdvertisingInquiries] = useState<AdvertisingInquiry[]>([]);
  const [affiliateClicks, setAffiliateClicks] = useState<AffiliateClickRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(EMPTY_ANALYTICS);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [supabaseToolsCount, setSupabaseToolsCount] = useState<number | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<IntegrationConfigStatus>({
    supabaseClientConfigured: isSupabaseClientConfigured,
    supabaseSchemaReady: false,
    siteUrl:
      (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://www.aivoraai.publicvm.com'),
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const [loc, setLoc] = useState(parseLocation);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setCompareModalOpen] = useState(false);

  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(isSupabaseClientConfigured));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [isSubmitModalOpen, setSubmitModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastTrackedPathRef = useRef<string | null>(null);
  const lastTrackedSearchRef = useRef<string>('');

  const isAdmin = currentUser?.role === 'admin';

  const pushToast = useCallback(
    (text: string, tone: 'success' | 'info' | 'error' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, text, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const retryDirectoryLoad = useCallback(async () => {
    setDirectoryError(null);
    setIsLoading(true);
    try {
      const schemaOk = await checkSupabaseSchemaReady();
      setSupabaseSchemaReady(schemaOk);
      setConfigStatus((prev) => ({
        ...prev,
        supabaseClientConfigured: isSupabaseClientConfigured,
        supabaseSchemaReady: schemaOk,
      }));

      const [
        loadedTools,
        loadedCategories,
        loadedPosts,
        loadedReviews,
        loadedFavorites,
        loadedRecent,
        loadedSubmissions,
        loadedSubscribers,
      ] = await Promise.all([
        directoryRepository.getTools(),
        directoryRepository.getCategories(),
        directoryRepository.getBlogPosts(),
        directoryRepository.getReviews(),
        directoryRepository.getFavorites(),
        directoryRepository.getRecentlyViewed(),
        directoryRepository.getSubmissions(),
        directoryRepository.getSubscribers(),
      ]);

      setTools(loadedTools || INITIAL_TOOLS);
      setCategories(loadedCategories || INITIAL_CATEGORIES);
      setBlogPosts(loadedPosts || INITIAL_BLOG_POSTS);
      setReviews(loadedReviews || INITIAL_REVIEWS);
      setFavorites(loadedFavorites || []);
      setRecentlyViewedIds(loadedRecent || []);
      setSubmissions(loadedSubmissions || []);
      setSubscribers(loadedSubscribers || []);
    } catch {
      setDirectoryError('Could not refresh live directory records. Showing local catalog defaults.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const schemaOk = await checkSupabaseSchemaReady();
        if (active) {
          setSupabaseSchemaReady(schemaOk);
          setConfigStatus((prev) => ({
            ...prev,
            supabaseClientConfigured: isSupabaseClientConfigured,
            supabaseSchemaReady: schemaOk,
          }));
        }

        const [
          loadedTools,
          loadedCategories,
          loadedPosts,
          loadedReviews,
          loadedFavorites,
          loadedRecent,
          loadedSubmissions,
          loadedSubscribers,
        ] = await Promise.all([
          directoryRepository.getTools(),
          directoryRepository.getCategories(),
          directoryRepository.getBlogPosts(),
          directoryRepository.getReviews(),
          directoryRepository.getFavorites(),
          directoryRepository.getRecentlyViewed(),
          directoryRepository.getSubmissions(),
          directoryRepository.getSubscribers(),
        ]);

        if (!active) return;
        setTools(loadedTools || INITIAL_TOOLS);
        setCategories(loadedCategories || INITIAL_CATEGORIES);
        setBlogPosts(loadedPosts || INITIAL_BLOG_POSTS);
        setReviews(loadedReviews || INITIAL_REVIEWS);
        setFavorites(loadedFavorites || []);
        setRecentlyViewedIds(loadedRecent || []);
        setSubmissions(loadedSubmissions || []);
        setSubscribers(loadedSubscribers || []);
      } catch {
        if (active) {
          setDirectoryError('Unable to reach the live database. Showing local directory defaults.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseClientConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    const syncSession = async (userId: string | null, email: string | undefined, token: string | null) => {
      if (!active) return;
      setAccessToken(token);
      if (!userId) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }
      const profile = await directoryRepository.fetchProfile(userId);
      if (!active) return;
      setCurrentUser(
        profile ?? {
          id: userId,
          email: email || '',
          fullName: email?.split('@')[0] || 'Member',
          role: 'user',
          createdAt: new Date().toISOString(),
        }
      );

      const [userFavs, userRecent] = await Promise.all([
        directoryRepository.getFavorites(userId),
        directoryRepository.getRecentlyViewed(userId),
      ]);
      if (!active) return;
      setFavorites(userFavs || []);
      setRecentlyViewedIds(userRecent || []);
      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      syncSession(session?.user?.id ?? null, session?.user?.email, session?.access_token ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalMode('update-password');
      }
      syncSession(session?.user?.id ?? null, session?.user?.email, session?.access_token ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setLoc(parseLocation());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (lastTrackedPathRef.current === loc.path) return;
    lastTrackedPathRef.current = loc.path;
    sendAnalyticsEvent({ eventType: 'page_view', path: loc.path });
  }, [loc.path]);

  const navigate = useCallback((to: string) => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', to);
    setLoc(parseLocation());
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const setSeoMeta = useCallback(
    (title: string, description: string, options?: SeoMetaOptions) => {
      if (typeof document === 'undefined') return;
      document.title = title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', description);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', title);
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', description);

      const ogType = document.querySelector('meta[property="og:type"]');
      if (ogType) ogType.setAttribute('content', options?.ogType || 'website');

      const baseUrl = configStatus.siteUrl || window.location.origin;
      const canonicalHref = buildCanonicalUrl(
        baseUrl,
        options?.canonicalPath || window.location.pathname
      );
      let canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonicalHref);

      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (!ogUrl) {
        ogUrl = document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrl);
      }
      ogUrl.setAttribute('content', canonicalHref);

      const existingScript = document.getElementById('aivora-jsonld');
      if (options?.jsonLd) {
        const script =
          existingScript ||
          (() => {
            const el = document.createElement('script');
            el.id = 'aivora-jsonld';
            el.setAttribute('type', 'application/ld+json');
            document.head.appendChild(el);
            return el;
          })();
        script.textContent = JSON.stringify(options.jsonLd);
      } else if (existingScript) {
        existingScript.remove();
      }
    },
    [configStatus.siteUrl]
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark');
        try {
          window.localStorage.setItem('aivora_theme', next);
        } catch {}
      }
      return next;
    });
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!isSupabaseClientConfigured || !supabase) {
        return 'Supabase Auth is not configured.';
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return error.message;
      pushToast('Signed in successfully.', 'success');
      setAuthModalMode(null);
      return null;
    },
    [pushToast]
  );

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<{ error: string | null; needsEmailConfirm?: boolean }> => {
      if (!isSupabaseClientConfigured || !supabase) {
        return { error: 'Supabase Auth is not configured.' };
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) return { error: error.message };

      sendAnalyticsEvent({ eventType: 'user_signup', path: '/signup' });
      const needsEmailConfirm = !data.session;
      if (!needsEmailConfirm) {
        setAuthModalMode(null);
        pushToast('Account created and signed in.', 'success');
      }
      return { error: null, needsEmailConfirm };
    },
    [pushToast]
  );

  const requestPasswordReset = useCallback(async (email: string): Promise<string | null> => {
    if (!isSupabaseClientConfigured || !supabase) return 'Password reset requires Supabase Auth.';
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    return error ? error.message : null;
  }, []);

  const updatePassword = useCallback(
    async (newPassword: string): Promise<string | null> => {
      if (!isSupabaseClientConfigured || !supabase) return 'Supabase Auth is not configured.';
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return error.message;
      pushToast('Password updated successfully.', 'success');
      setAuthModalMode(null);
      return null;
    },
    [pushToast]
  );

  const signOutUser = useCallback(async () => {
    if (isSupabaseClientConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setAccessToken(null);
    setAdminError(null);
    pushToast('Signed out.', 'info');
  }, [pushToast]);

  const updateUserProfile = useCallback(
    async (
      patch: Partial<Pick<UserProfile, 'fullName' | 'company' | 'bio'>>
    ): Promise<string | null> => {
      if (!isSupabaseClientConfigured || !supabase || !currentUser) {
        return 'Sign in with a Supabase account to save profile changes.';
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: patch.fullName ?? currentUser.fullName,
          company: patch.company ?? currentUser.company ?? '',
          bio: patch.bio ?? currentUser.bio ?? '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
      if (error) return error.message;

      setCurrentUser((prev) => (prev ? { ...prev, ...patch } : prev));
      pushToast('Profile updated.', 'success');
      return null;
    },
    [currentUser, pushToast]
  );

  const toggleCompare = useCallback(
    (toolId: string) => {
      setCompareIds((prev) => {
        if (prev.includes(toolId)) return prev.filter((id) => id !== toolId);
        if (prev.length >= 3) {
          pushToast('You can compare up to 3 AI tools side by side.', 'info');
          return prev;
        }
        return [...prev, toolId];
      });
    },
    [pushToast]
  );

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    setCompareModalOpen(false);
  }, []);

  const toggleFavorite = useCallback(
    async (toolId: string) => {
      const exists = favorites.includes(toolId);
      const updated = exists ? favorites.filter((id) => id !== toolId) : [...favorites, toolId];
      setFavorites(updated);
      await directoryRepository.saveFavorites(updated, currentUser?.id);
      pushToast(
        exists
          ? 'Removed from saved favorites.'
          : currentUser
            ? 'Saved to your account favorites.'
            : 'Saved locally (sign in to sync across devices).',
        'info'
      );
    },
    [favorites, currentUser, pushToast]
  );

  const recordToolView = useCallback(
    (tool: AITool) => {
      setRecentlyViewedIds((prev) => {
        const next = [tool.id, ...prev.filter((id) => id !== tool.id)].slice(0, 12);
        directoryRepository.saveRecentlyViewed(next, currentUser?.id);
        return next;
      });
      sendAnalyticsEvent({
        eventType: 'tool_view',
        path: `/tool/${tool.slug}`,
        toolId: tool.id,
        toolSlug: tool.slug,
        category: tool.category,
      });
    },
    [currentUser?.id]
  );

  const trackSearchQuery = useCallback((keyword: string) => {
    const clean = keyword.trim().toLowerCase();
    if (clean.length < 2 || lastTrackedSearchRef.current === clean) return;
    lastTrackedSearchRef.current = clean;
    sendAnalyticsEvent({ eventType: 'search', path: '/explore', keyword: clean });
  }, []);

  const submitReview = useCallback(
    async (reviewInput: Omit<ToolReview, 'id' | 'createdAt'>) => {
      const newReview: ToolReview = {
        ...reviewInput,
        userId: currentUser?.id,
        id: `rev-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const updated = await directoryRepository.addReview(newReview);
      setReviews(updated);
      pushToast('Review published.', 'success');
    },
    [currentUser?.id, pushToast]
  );

  const submitToolProposal = useCallback(
    async (
      proposal: Omit<ToolSubmission, 'id' | 'status' | 'submittedAt'>
    ): Promise<{ requiresAdminApproval: boolean; error: string | null }> => {
      const duplicate = findDuplicateTool(
        { name: proposal.name, websiteUrl: proposal.websiteUrl },
        tools
      );
      if (duplicate) {
        return {
          requiresAdminApproval: false,
          error: `"${duplicate.name}" is already listed in the directory.`,
        };
      }

      const id = `sub-${Date.now()}`;
      const submittedAt = new Date().toISOString().slice(0, 10);
      const requiresAdminApproval = Boolean(
        proposal.requestedTier && proposal.requestedTier !== 'Free'
      );

      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase.from('tool_submissions').insert({
          id,
          name: proposal.name,
          website_url: proposal.websiteUrl,
          category: proposal.category,
          pricing: proposal.pricing,
          short_description: proposal.shortDescription,
          submitter_email: proposal.submitterEmail,
          requested_tier: proposal.requestedTier || 'Free',
          campaign_duration_days: proposal.campaignDurationDays ?? null,
          status: 'pending',
          submitted_at: submittedAt,
        });
        if (error) return { requiresAdminApproval: false, error: error.message };
      }

      const entry: ToolSubmission = {
        ...proposal,
        id,
        status: 'pending',
        submittedAt,
      };
      const updated = [entry, ...submissions];
      setSubmissions(updated);
      await directoryRepository.saveSubmissions(updated);
      pushToast(
        requiresAdminApproval
          ? 'Listing submitted — pending Administrator approval before publishing.'
          : 'Tool submitted for editorial review.',
        'success'
      );
      return { requiresAdminApproval, error: null };
    },
    [tools, submissions, pushToast]
  );

  const submitContactInquiry = useCallback(
    async (
      input: Omit<ContactInquiry, 'id' | 'status' | 'createdAt'>
    ): Promise<string | null> => {
      if (isSupabaseClientConfigured && supabase) {
        const id = `inq-${Date.now()}`;
        const { error } = await supabase.from('contact_inquiries').insert({
          id,
          name: input.name,
          email: input.email,
          subject: input.subject,
          message: input.message,
          status: 'new',
        });
        if (error) return error.message;
      }
      pushToast('Inquiry received by the AIVORA AI team.', 'success');
      return null;
    },
    [pushToast]
  );

  const submitAdvertisingInquiry = useCallback(
    async (
      input: Omit<AdvertisingInquiry, 'id' | 'status' | 'createdAt'>
    ): Promise<string | null> => {
      if (isSupabaseClientConfigured && supabase) {
        const id = `adv-${Date.now()}`;
        const { error } = await supabase.from('advertising_inquiries').insert({
          id,
          company_name: input.companyName,
          contact_name: input.contactName,
          email: input.email,
          website_url: input.websiteUrl,
          package_interest: input.packageInterest,
          budget_range: input.budgetRange,
          goals: input.goals,
          status: 'new',
        });
        if (error) return error.message;
      }
      pushToast('Advertising enquiry submitted for review.', 'success');
      return null;
    },
    [pushToast]
  );

  const subscribeNewsletter = useCallback(
    async (email: string) => {
      const cleanEmail = email.trim().toLowerCase();
      if (subscribers.some((s) => s.email.toLowerCase() === cleanEmail)) {
        pushToast('This email is already subscribed to the weekly digest.', 'info');
        return false;
      }
      const sub: NewsletterSubscriber = {
        id: `nl-${Date.now()}`,
        email: cleanEmail,
        subscribedAt: new Date().toISOString().slice(0, 10),
      };
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase.from('newsletter_subscribers').insert({
          id: sub.id,
          email: sub.email,
          subscribed_at: sub.subscribedAt,
        });
        if (error && !error.message.toLowerCase().includes('duplicate')) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = await directoryRepository.addSubscriber(sub);
      setSubscribers(updated);
      sendAnalyticsEvent({ eventType: 'newsletter_signup', path: loc.path });
      pushToast('Subscribed to the AIVORA AI weekly briefing.', 'success');
      return true;
    },
    [subscribers, loc.path, pushToast]
  );

  const refreshAdminData = useCallback(async (): Promise<string | null> => {
    if (!isSupabaseClientConfigured || !supabase) {
      return 'Supabase is not configured.';
    }
    try {
      const [
        toolsRes,
        subsRes,
        sponsoredRes,
        nlRes,
        contactRes,
        advRes,
        clicksRes,
        profilesRes,
        eventsRes,
      ] = await Promise.all([
        supabase.from('ai_tools').select('id', { count: 'exact', head: true }),
        supabase.from('tool_submissions').select('*').order('submitted_at', { ascending: false }),
        supabase.from('sponsored_listings').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }),
        supabase.from('contact_inquiries').select('*').order('created_at', { ascending: false }),
        supabase.from('advertising_inquiries').select('*').order('created_at', { ascending: false }),
        supabase.from('affiliate_clicks').select('*').order('clicked_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('analytics_events').select('*').limit(500),
      ]);

      setSupabaseToolsCount(toolsRes.count ?? 0);

      if (subsRes.data) {
        setSubmissions(
          subsRes.data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            name: String(r.name),
            websiteUrl: String(r.website_url),
            category: String(r.category),
            pricing: (r.pricing as AITool['pricing']) || 'Freemium',
            shortDescription: String(r.short_description || ''),
            submitterEmail: String(r.submitter_email || ''),
            requestedTier: (r.requested_tier as AITool['listingTier']) || 'Free',
            campaignDurationDays:
              typeof r.campaign_duration_days === 'number' ? r.campaign_duration_days : undefined,
            status: (r.status as ToolSubmission['status']) || 'pending',
            submittedAt: String(r.submitted_at || ''),
          }))
        );
      }

      if (sponsoredRes.data) {
        setSponsoredListings(
          sponsoredRes.data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            toolId: r.tool_id ? String(r.tool_id) : undefined,
            toolName: String(r.tool_name),
            websiteUrl: String(r.website_url),
            contactEmail: String(r.contact_email),
            tier: (r.tier as SponsoredListingRequest['tier']) || 'Featured',
            durationDays: Number(r.duration_days || 30),
            sponsorTagline: String(r.sponsor_tagline || ''),
            status: (r.status as SponsoredListingRequest['status']) || 'pending',
            adminNotes: r.admin_notes ? String(r.admin_notes) : undefined,
            createdAt: String(r.created_at || ''),
          }))
        );
      }

      if (nlRes.data) {
        setSubscribers(
          nlRes.data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            email: String(r.email),
            subscribedAt: String(r.subscribed_at || ''),
          }))
        );
      }

      if (contactRes.data) {
        setContactInquiries(
          contactRes.data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            name: String(r.name),
            email: String(r.email),
            subject: String(r.subject),
            message: String(r.message),
            status: (r.status as ContactInquiry['status']) || 'new',
            createdAt: String(r.created_at || ''),
          }))
        );
      }

      if (advRes.data) {
        setAdvertisingInquiries(
          advRes.data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            companyName: String(r.company_name),
            contactName: String(r.contact_name),
            email: String(r.email),
            websiteUrl: String(r.website_url),
            packageInterest: String(r.package_interest),
            budgetRange: String(r.budget_range),
            goals: String(r.goals),
            status: (r.status as AdvertisingInquiry['status']) || 'new',
            createdAt: String(r.created_at || ''),
          }))
        );
      }

      const mappedClicks: AffiliateClickRecord[] = (clicksRes.data || []).map(
        (r: Record<string, unknown>) => ({
          id: String(r.id),
          toolId: String(r.tool_id),
          toolSlug: String(r.tool_slug),
          toolName: String(r.tool_name),
          destinationUrl: String(r.destination_url),
          sourcePage: String(r.source_page || '/'),
          clickedAt: String(r.clicked_at || ''),
        })
      );
      setAffiliateClicks(mappedClicks);

      if (profilesRes.data) {
        setUsersList(
          profilesRes.data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            email: String(r.email || ''),
            fullName: String(r.full_name || ''),
            avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
            company: r.company ? String(r.company) : undefined,
            bio: r.bio ? String(r.bio) : undefined,
            role: r.role === 'admin' ? 'admin' : 'user',
            createdAt: String(r.created_at || ''),
          }))
        );
      }

      const events = (eventsRes.data || []) as Array<Record<string, unknown>>;
      const sessions = new Set(events.map((e) => String(e.session_hash || '')));
      setAnalytics({
        ...EMPTY_ANALYTICS,
        totalVisitors: sessions.size,
        totalPageViews: events.filter((e) => e.event_type === 'page_view').length,
        totalToolViews: events.filter((e) => e.event_type === 'tool_view').length,
        totalAffiliateClicks: mappedClicks.length,
        totalSearches: events.filter((e) => e.event_type === 'search').length,
        newUserRegistrations: profilesRes.data?.length ?? 0,
        newsletterSubscriptions: nlRes.data?.length ?? 0,
        recentClicks: mappedClicks.slice(0, 10),
      });

      setAdminError(null);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin data.';
      setAdminError(msg);
      return msg;
    }
  }, []);

  const syncStarterToolsToSupabase = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseClientConfigured || !supabase) return false;
    try {
      const catRows = INITIAL_CATEGORIES.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon_key: c.iconKey,
        accent_color: c.accentColor,
      }));
      const { error: catErr } = await supabase.from('categories').upsert(catRows);
      if (catErr) {
        pushToast(`Categories sync error: ${catErr.message}`, 'error');
        return false;
      }

      const toolRows = INITIAL_TOOLS.map(serializeToolForSupabase);
      const { error: toolErr } = await supabase.from('ai_tools').upsert(toolRows);
      if (toolErr) {
        pushToast(`Tools sync error: ${toolErr.message}`, 'error');
        return false;
      }

      const postRows = INITIAL_BLOG_POSTS.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category,
        author: p.author,
        author_role: p.authorRole,
        published_at: p.publishedAt,
        read_time_minutes: p.readTimeMinutes,
        cover_image: p.coverImage,
        related_tool_slugs: p.relatedToolSlugs || [],
        sections: p.sections || [],
        seo_title: p.seoTitle || null,
        seo_description: p.seoDescription || null,
        canonical_url: p.canonicalUrl || null,
        focus_keyword: p.focusKeyword || null,
      }));
      await supabase.from('blog_posts').upsert(postRows);

      setSupabaseToolsCount(INITIAL_TOOLS.length);
      await retryDirectoryLoad();
      pushToast(`Synced ${INITIAL_TOOLS.length} catalog tools to Supabase.`, 'success');
      return true;
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Sync failed.', 'error');
      return false;
    }
  }, [pushToast, retryDirectoryLoad]);

  const addTool = useCallback(
    async (
      toolInput: Omit<AITool, 'id' | 'slug' | 'addedAt' | 'rating' | 'reviewCount'>
    ): Promise<AITool | null> => {
      const duplicate = findDuplicateTool(
        { name: toolInput.name, websiteUrl: toolInput.websiteUrl },
        tools
      );
      if (duplicate) {
        pushToast(
          `Cannot add duplicate tool: "${duplicate.name}" already uses this name or official website.`,
          'error'
        );
        return null;
      }

      const baseSlug = slugify(toolInput.name) || `tool-${Date.now()}`;
      const uniqueSlug = tools.some((t) => t.slug === baseSlug)
        ? `${baseSlug}-${Date.now().toString().slice(-4)}`
        : baseSlug;

      const created: AITool = {
        ...toolInput,
        category: normalizeCategoryName(toolInput.category),
        logoUrl: toolInput.logoUrl?.trim() || undefined,
        status: toolInput.status === 'draft' ? 'draft' : 'published',
        id: `tool-${Date.now()}`,
        slug: uniqueSlug,
        addedAt: new Date().toISOString().slice(0, 10),
        rating: 0,
        reviewCount: 0,
      };

      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase
          .from('ai_tools')
          .insert(serializeToolForSupabase(created));
        if (error) {
          pushToast(error.message, 'error');
          return null;
        }
      }

      const updated = [created, ...tools];
      setTools(updated);
      setSupabaseToolsCount((prev) => (prev === null ? 1 : prev + 1));
      await directoryRepository.saveTools(updated);
      pushToast(`Added "${created.name}" to directory.`, 'success');
      return created;
    },
    [tools, pushToast]
  );

  const updateTool = useCallback(
    async (id: string, patch: Partial<AITool>): Promise<boolean> => {
      const existing = tools.find((t) => t.id === id);
      if (!existing) return false;
      const merged = { ...existing, ...patch };
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase
          .from('ai_tools')
          .update(serializeToolForSupabase(merged))
          .eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = tools.map((t) => (t.id === id ? merged : t));
      setTools(updated);
      await directoryRepository.saveTools(updated);
      pushToast(`Updated "${merged.name}".`, 'success');
      return true;
    },
    [tools, pushToast]
  );

  const deleteTool = useCallback(
    async (id: string): Promise<boolean> => {
      const target = tools.find((t) => t.id === id);
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase.from('ai_tools').delete().eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = tools.filter((t) => t.id !== id);
      setTools(updated);
      setSupabaseToolsCount((prev) => (prev === null ? null : Math.max(0, prev - 1)));
      await directoryRepository.saveTools(updated);
      setCompareIds((prev) => prev.filter((cid) => cid !== id));
      if (target) pushToast(`Deleted "${target.name}".`, 'info');
      return true;
    },
    [tools, pushToast]
  );

  const addCategory = useCallback(
    async (cat: Omit<CategoryInfo, 'id' | 'slug'>): Promise<boolean> => {
      const created: CategoryInfo = {
        ...cat,
        id: `cat-${Date.now()}`,
        slug: slugify(cat.name),
      };
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase.from('categories').insert({
          id: created.id,
          slug: created.slug,
          name: created.name,
          description: created.description,
          icon_key: created.iconKey,
          accent_color: created.accentColor,
        });
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = [...categories, created];
      setCategories(updated);
      await directoryRepository.saveCategories(updated);
      pushToast(`Added category "${created.name}".`, 'success');
      return true;
    },
    [categories, pushToast]
  );

  const updateCategory = useCallback(
    async (id: string, patch: Partial<CategoryInfo>): Promise<boolean> => {
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase
          .from('categories')
          .update({
            ...(patch.name ? { name: patch.name, slug: slugify(patch.name) } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.iconKey ? { icon_key: patch.iconKey } : {}),
            ...(patch.accentColor ? { accent_color: patch.accentColor } : {}),
          })
          .eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
      setCategories(updated);
      await directoryRepository.saveCategories(updated);
      pushToast('Category updated.', 'success');
      return true;
    },
    [categories, pushToast]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      await directoryRepository.saveCategories(updated);
      pushToast('Category removed.', 'info');
      return true;
    },
    [categories, pushToast]
  );

  const addBlogPost = useCallback(
    async (post: Omit<BlogPost, 'id' | 'slug' | 'publishedAt'>): Promise<boolean> => {
      const created: BlogPost = {
        ...post,
        id: `blog-${Date.now()}`,
        slug: slugify(post.title) || `post-${Date.now()}`,
        publishedAt: new Date().toISOString().slice(0, 10),
      };
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase.from('blog_posts').insert({
          id: created.id,
          slug: created.slug,
          title: created.title,
          excerpt: created.excerpt,
          category: created.category,
          author: created.author,
          author_role: created.authorRole,
          published_at: created.publishedAt,
          read_time_minutes: created.readTimeMinutes,
          cover_image: created.coverImage,
          related_tool_slugs: created.relatedToolSlugs || [],
          sections: created.sections || [],
          seo_title: created.seoTitle || null,
          seo_description: created.seoDescription || null,
          canonical_url: created.canonicalUrl || null,
          focus_keyword: created.focusKeyword || null,
        });
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = [created, ...blogPosts];
      setBlogPosts(updated);
      await directoryRepository.saveBlogPosts(updated);
      pushToast(`Published "${created.title}".`, 'success');
      return true;
    },
    [blogPosts, pushToast]
  );

  const updateBlogPost = useCallback(
    async (id: string, patch: Partial<BlogPost>): Promise<boolean> => {
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase
          .from('blog_posts')
          .update({
            ...(patch.title ? { title: patch.title } : {}),
            ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt } : {}),
            ...(patch.category ? { category: patch.category } : {}),
            ...(patch.sections ? { sections: patch.sections } : {}),
          })
          .eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = blogPosts.map((p) => (p.id === id ? { ...p, ...patch } : p));
      setBlogPosts(updated);
      await directoryRepository.saveBlogPosts(updated);
      pushToast('Article updated.', 'success');
      return true;
    },
    [blogPosts, pushToast]
  );

  const deleteBlogPost = useCallback(
    async (id: string): Promise<boolean> => {
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase.from('blog_posts').delete().eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updated = blogPosts.filter((p) => p.id !== id);
      setBlogPosts(updated);
      await directoryRepository.saveBlogPosts(updated);
      pushToast('Article deleted.', 'info');
      return true;
    },
    [blogPosts, pushToast]
  );

  const approveSubmission = useCallback(
    async (id: string): Promise<boolean> => {
      const submission = submissions.find((s) => s.id === id);
      if (!submission) return false;

      const normalizedCategory = normalizeCategoryName(submission.category);
      const created = await addTool({
        name: submission.name,
        tagline: submission.shortDescription,
        shortDescription: submission.shortDescription,
        description: submission.shortDescription,
        category: normalizedCategory,
        pricing: submission.pricing,
        pricingSummary: '',
        pricingTiers: [],
        pricingSnapshotDate: '',
        websiteUrl: submission.websiteUrl,
        listingTier: submission.requestedTier || 'Free',
        sponsorStatus:
          submission.requestedTier && submission.requestedTier !== 'Free' ? 'approved' : 'none',
        logoColor: '#4F46E5',
        logoKey: slugify(submission.name),
        features: [],
        pros: [],
        cons: [],
        bestUseCases: [],
        isFeatured:
          submission.requestedTier === 'Featured' || submission.requestedTier === 'Sponsored',
        isTrending: false,
        tags: [slugify(normalizedCategory)],
      });

      if (!created) return false;

      if (isSupabaseClientConfigured && supabase) {
        await supabase.from('tool_submissions').update({ status: 'approved' }).eq('id', id);
      }

      const updatedSubs = submissions.map((s) =>
        s.id === id ? { ...s, status: 'approved' as const } : s
      );
      setSubmissions(updatedSubs);
      await directoryRepository.saveSubmissions(updatedSubs);
      return true;
    },
    [submissions, addTool]
  );

  const rejectSubmission = useCallback(
    async (id: string): Promise<boolean> => {
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase
          .from('tool_submissions')
          .update({ status: 'rejected' })
          .eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      const updatedSubs = submissions.map((s) =>
        s.id === id ? { ...s, status: 'rejected' as const } : s
      );
      setSubmissions(updatedSubs);
      await directoryRepository.saveSubmissions(updatedSubs);
      pushToast('Submission marked as rejected.', 'info');
      return true;
    },
    [submissions, pushToast]
  );

  const decideSponsoredListing = useCallback(
    async (
      id: string,
      decision: 'approved' | 'rejected' | 'pending',
      notes?: string
    ): Promise<boolean> => {
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase
          .from('sponsored_listings')
          .update({ status: decision, ...(notes !== undefined ? { admin_notes: notes } : {}) })
          .eq('id', id);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      await refreshAdminData();
      pushToast(`Sponsored listing marked as ${decision}.`, 'success');
      return true;
    },
    [refreshAdminData, pushToast]
  );

  const updateUserRole = useCallback(
    async (userId: string, role: 'user' | 'admin'): Promise<boolean> => {
      if (isSupabaseClientConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', userId);
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
      }
      setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      pushToast(`Updated user role to ${role}.`, 'success');
      return true;
    },
    [pushToast]
  );

  const resetDemoData = useCallback(async () => {
    await directoryRepository.resetDemoData();
    const [t, c, b, r, s] = await Promise.all([
      directoryRepository.getTools(),
      directoryRepository.getCategories(),
      directoryRepository.getBlogPosts(),
      directoryRepository.getReviews(),
      directoryRepository.getSubmissions(),
    ]);
    setTools(t);
    setCategories(c);
    setBlogPosts(b);
    setReviews(r);
    setSubmissions(s);
    pushToast('Local directory defaults restored.', 'info');
  }, [pushToast]);

  const value = useMemo<DirectoryContextValue>(
    () => ({
      tools,
      categories,
      blogPosts,
      reviews,
      favorites,
      recentlyViewedIds,
      submissions,
      sponsoredListings,
      subscribers,
      contactInquiries,
      advertisingInquiries,
      affiliateClicks,
      analytics,
      usersList,
      isLoading,
      directoryError,
      retryDirectoryLoad,
      configStatus,
      theme,
      toggleTheme,
      currentPath: loc.path,
      searchParams: loc.params,
      navigate,
      setSeoMeta,
      compareIds,
      toggleCompare,
      clearCompare,
      isCompareModalOpen,
      setCompareModalOpen,
      authModalMode,
      openAuthModal: (mode) => setAuthModalMode(mode),
      closeAuthModal: () => setAuthModalMode(null),
      isSupabaseReady: isSupabaseClientConfigured,
      authLoading,
      currentUser,
      accessToken,
      isAdmin,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      updatePassword,
      signOutUser,
      updateUserProfile,
      isSubmitModalOpen,
      setSubmitModalOpen,
      toasts,
      pushToast,
      dismissToast,
      toggleFavorite,
      recordToolView,
      trackSearchQuery,
      submitReview,
      submitToolProposal,
      submitContactInquiry,
      submitAdvertisingInquiry,
      subscribeNewsletter,
      supabaseToolsCount,
      syncStarterToolsToSupabase,
      refreshAdminData,
      adminError,
      addTool,
      updateTool,
      deleteTool,
      addCategory,
      updateCategory,
      deleteCategory,
      addBlogPost,
      updateBlogPost,
      deleteBlogPost,
      approveSubmission,
      rejectSubmission,
      decideSponsoredListing,
      updateUserRole,
      resetDemoData,
    }),
    [
      tools,
      categories,
      blogPosts,
      reviews,
      favorites,
      recentlyViewedIds,
      submissions,
      sponsoredListings,
      subscribers,
      contactInquiries,
      advertisingInquiries,
      affiliateClicks,
      analytics,
      usersList,
      isLoading,
      directoryError,
      retryDirectoryLoad,
      configStatus,
      theme,
      toggleTheme,
      loc,
      navigate,
      setSeoMeta,
      compareIds,
      toggleCompare,
      clearCompare,
      isCompareModalOpen,
      authModalMode,
      authLoading,
      currentUser,
      accessToken,
      isAdmin,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      updatePassword,
      signOutUser,
      updateUserProfile,
      isSubmitModalOpen,
      toasts,
      pushToast,
      dismissToast,
      toggleFavorite,
      recordToolView,
      trackSearchQuery,
      submitReview,
      submitToolProposal,
      submitContactInquiry,
      submitAdvertisingInquiry,
      subscribeNewsletter,
      supabaseToolsCount,
      syncStarterToolsToSupabase,
      refreshAdminData,
      adminError,
      addTool,
      updateTool,
      deleteTool,
      addCategory,
      updateCategory,
      deleteCategory,
      addBlogPost,
      updateBlogPost,
      deleteBlogPost,
      approveSubmission,
      rejectSubmission,
      decideSponsoredListing,
      updateUserRole,
      resetDemoData,
    ]
  );

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useDirectory(): DirectoryContextValue {
  const ctx = useContext(DirectoryContext);
  if (!ctx) {
    throw new Error('useDirectory must be used within a DirectoryProvider');
  }
  return ctx;
}
