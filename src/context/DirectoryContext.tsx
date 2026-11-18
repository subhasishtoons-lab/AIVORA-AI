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
  // Real Supabase Authentication & User Profile state
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
  updateUserProfile: (patch: Partial<Pick<UserProfile, 'fullName' | 'company' | 'bio'>>) => Promise<string | null>;
  // Modals & Toasts
  isSubmitModalOpen: boolean;
  setSubmitModalOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (text: string, tone?: 'success' | 'info' | 'error') => void;
  dismissToast: (id: string) => void;
  // User Actions
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
  // Admin Operations (backed by JWT-verified /api/admin/* endpoints)
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
  if (typeof window === 'undefined') return;
  const sessionHash = getOrCreateVisitorSessionHash();
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, sessionHash }),
  }).catch(() => {
    // Analytics ingestion must never disrupt UX
  });
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
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
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

  // Supabase Auth State
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
      try {
        const cfgRes = await fetch('/api/config/status');
        if (cfgRes.ok) {
          const cfg = (await cfgRes.json()) as IntegrationConfigStatus;
          setSupabaseSchemaReady(Boolean(cfg.supabaseSchemaReady));
          setConfigStatus(cfg);
        }
      } catch {
        setSupabaseSchemaReady(false);
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

      setTools(loadedTools);
      setCategories(loadedCategories);
      setBlogPosts(loadedPosts);
      setReviews(loadedReviews);
      setFavorites(loadedFavorites);
      setRecentlyViewedIds(loadedRecent);
      setSubmissions(loadedSubmissions);
      setSubscribers(loadedSubscribers);
    } catch {
      setDirectoryError(
        'Could not refresh live directory records. Showing local catalog defaults.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load live directory data & server config flags silently on top of initial seed
  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        try {
          const cfgRes = await fetch('/api/config/status');
          if (cfgRes.ok && active) {
            const cfg = (await cfgRes.json()) as IntegrationConfigStatus;
            setSupabaseSchemaReady(Boolean(cfg.supabaseSchemaReady));
            setConfigStatus(cfg);
          }
        } catch {
          setSupabaseSchemaReady(false);
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
        setTools(loadedTools);
        setCategories(loadedCategories);
        setBlogPosts(loadedPosts);
        setReviews(loadedReviews);
        setFavorites(loadedFavorites);
        setRecentlyViewedIds(loadedRecent);
        setSubmissions(loadedSubmissions);
        setSubscribers(loadedSubscribers);
      } catch {
        if (active) {
          setDirectoryError(
            'Unable to reach the live database. Showing local directory defaults.'
          );
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

  // Sync Supabase Auth session & user profile
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

      // Sync user-specific favorites & recently viewed tools from Supabase
      const [userFavs, userRecent] = await Promise.all([
        directoryRepository.getFavorites(userId),
        directoryRepository.getRecentlyViewed(userId),
      ]);
      if (!active) return;
      setFavorites(userFavs);
      setRecentlyViewedIds(userRecent);
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

  // Track real page views when path changes
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
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  // Auth Actions (Real Supabase Auth only — no fake password acceptance)
  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!isSupabaseClientConfigured || !supabase) {
        return 'Supabase Auth is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.';
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
        return {
          error:
            'Supabase Auth is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable user registration.',
        };
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
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
    if (!isSupabaseClientConfigured || !supabase) {
      return 'Password reset requires Supabase Auth to be configured.';
    }
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) return error.message;
    return null;
  }, []);

  const updatePassword = useCallback(
    async (newPassword: string): Promise<string | null> => {
      if (!isSupabaseClientConfigured || !supabase) {
        return 'Supabase Auth is not configured.';
      }
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
      const updated = exists
        ? favorites.filter((id) => id !== toolId)
        : [...favorites, toolId];
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
    sendAnalyticsEvent({
      eventType: 'search',
      path: '/explore',
      keyword: clean,
    });
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

      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposal),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            requiresAdminApproval: false,
            error: data.error || 'Submission failed validation.',
          };
        }

        const entry = data.submission as ToolSubmission;
        const updated = [entry, ...submissions];
        setSubmissions(updated);
        await directoryRepository.saveSubmissions(updated);

        if (data.sponsoredRequest) {
          setSponsoredListings((prev) => [
            data.sponsoredRequest as SponsoredListingRequest,
            ...prev,
          ]);
        }

        pushToast(
          data.requiresAdminApproval
            ? 'Listing submitted — pending Administrator approval before publishing.'
            : 'Tool submitted for editorial review.',
          'success'
        );
        return { requiresAdminApproval: Boolean(data.requiresAdminApproval), error: null };
      } catch {
        return { requiresAdminApproval: false, error: 'Network error submitting tool.' };
      }
    },
    [submissions, pushToast]
  );

  const submitContactInquiry = useCallback(
    async (
      input: Omit<ContactInquiry, 'id' | 'status' | 'createdAt'>
    ): Promise<string | null> => {
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) return data.error || 'Failed to send message.';
        setContactInquiries((prev) => [data.inquiry as ContactInquiry, ...prev]);
        pushToast('Inquiry received by the AIVORA AI team.', 'success');
        return null;
      } catch {
        return 'Network error while submitting your message.';
      }
    },
    [pushToast]
  );

  const submitAdvertisingInquiry = useCallback(
    async (
      input: Omit<AdvertisingInquiry, 'id' | 'status' | 'createdAt'>
    ): Promise<string | null> => {
      try {
        const res = await fetch('/api/advertising', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) return data.error || 'Failed to submit advertising enquiry.';
        setAdvertisingInquiries((prev) => [data.inquiry as AdvertisingInquiry, ...prev]);
        pushToast('Advertising enquiry submitted for review.', 'success');
        return null;
      } catch {
        return 'Network error while submitting advertising enquiry.';
      }
    },
    [pushToast]
  );

  const subscribeNewsletter = useCallback(
    async (email: string) => {
      const exists = subscribers.some(
        (s) => s.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (exists) {
        pushToast('This email is already subscribed to the weekly digest.', 'info');
        return false;
      }
      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToast(data.error || 'Subscription failed.', 'error');
          return false;
        }
        const sub = data.subscriber as NewsletterSubscriber;
        const updated = await directoryRepository.addSubscriber(sub);
        setSubscribers(updated);
        sendAnalyticsEvent({ eventType: 'newsletter_signup', path: loc.path });
        pushToast('Subscribed to the AIVORA AI weekly briefing.', 'success');
        return true;
      } catch {
        pushToast('Unable to subscribe right now.', 'error');
        return false;
      }
    },
    [subscribers, loc.path, pushToast]
  );

  // Admin API Helper — strictly authenticated via Bearer token on server
  const adminFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const res = await fetch(url, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (data as { error?: string }).error ||
          `Admin API denied request (${res.status}).`;
        setAdminError(msg);
        pushToast(msg, 'error');
        return { ok: false as const, status: res.status, data };
      }
      setAdminError(null);
      return { ok: true as const, status: res.status, data };
    },
    [accessToken, pushToast]
  );

  const refreshAdminData = useCallback(async (): Promise<string | null> => {
    const result = await adminFetch('/api/admin/overview');
    if (!result.ok) {
      return (result.data as { error?: string }).error || 'Admin access denied.';
    }
    const payload = result.data as {
      tools?: AITool[];
      supabaseToolsCount?: number;
      analytics: AnalyticsSummary;
      affiliateClicks: AffiliateClickRecord[];
      sponsoredListings: SponsoredListingRequest[];
      submissions: ToolSubmission[];
      subscribers: NewsletterSubscriber[];
      contactInquiries: ContactInquiry[];
      advertisingInquiries: AdvertisingInquiry[];
      users: UserProfile[];
    };
    const dbToolCount =
      typeof payload.supabaseToolsCount === 'number'
        ? payload.supabaseToolsCount
        : (payload.tools?.length ?? 0);
    setSupabaseToolsCount(dbToolCount);
    if (Array.isArray(payload.tools) && payload.tools.length > 0) {
      setTools(payload.tools);
      await directoryRepository.saveTools(payload.tools);
    }
    setAnalytics(payload.analytics);
    setAffiliateClicks(payload.affiliateClicks);
    setSponsoredListings(payload.sponsoredListings);
    setSubmissions(payload.submissions);
    setSubscribers(payload.subscribers);
    setContactInquiries(payload.contactInquiries);
    setAdvertisingInquiries(payload.advertisingInquiries);
    setUsersList(payload.users);
    return null;
  }, [adminFetch]);

  const syncStarterToolsToSupabase = useCallback(async (): Promise<boolean> => {
    const res = await adminFetch('/api/admin/tools/sync-starter', {
      method: 'POST',
    });
    if (!res.ok) return false;
    const payload = res.data as { tools?: AITool[]; count?: number };
    if (Array.isArray(payload.tools) && payload.tools.length > 0) {
      setTools(payload.tools);
      setSupabaseToolsCount(payload.tools.length);
      await directoryRepository.saveTools(payload.tools);
    }
    pushToast(
      `Synced ${payload.count ?? payload.tools?.length ?? 0} catalog tools to Supabase.`,
      'success'
    );
    return true;
  }, [adminFetch, pushToast]);

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

      const res = await adminFetch('/api/admin/tools', {
        method: 'POST',
        body: JSON.stringify(created),
      });
      if (!res.ok) return null;

      const saved = (res.data as { tool?: AITool }).tool ?? created;
      const updated = [saved, ...tools.filter((t) => t.id !== saved.id)];
      setTools(updated);
      setSupabaseToolsCount((prev) => (prev === null ? 1 : prev + 1));
      await directoryRepository.saveTools(updated);
      pushToast(`Added "${saved.name}" to directory.`, 'success');
      return saved;
    },
    [tools, adminFetch, pushToast]
  );

  const updateTool = useCallback(
    async (id: string, patch: Partial<AITool>): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/tools/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      if (!res.ok) return false;

      const saved = (res.data as { tool?: AITool }).tool;
      const updated = tools.map((t) => (t.id === id ? (saved ?? { ...t, ...patch }) : t));
      setTools(updated);
      await directoryRepository.saveTools(updated);
      pushToast(`Updated "${saved?.name ?? 'tool'}".`, 'success');
      return true;
    },
    [tools, adminFetch, pushToast]
  );

  const deleteTool = useCallback(
    async (id: string): Promise<boolean> => {
      const target = tools.find((t) => t.id === id);
      const res = await adminFetch(`/api/admin/tools/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return false;

      const updated = tools.filter((t) => t.id !== id);
      setTools(updated);
      setSupabaseToolsCount((prev) => (prev === null ? null : Math.max(0, prev - 1)));
      await directoryRepository.saveTools(updated);
      setCompareIds((prev) => prev.filter((cid) => cid !== id));
      if (target) pushToast(`Deleted "${target.name}".`, 'info');
      return true;
    },
    [tools, adminFetch, pushToast]
  );

  const addCategory = useCallback(
    async (cat: Omit<CategoryInfo, 'id' | 'slug'>): Promise<boolean> => {
      const created: CategoryInfo = {
        ...cat,
        id: `cat-${Date.now()}`,
        slug: slugify(cat.name),
      };
      const res = await adminFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(created),
      });
      if (!res.ok) return false;

      const updated = [...categories, created];
      setCategories(updated);
      await directoryRepository.saveCategories(updated);
      pushToast(`Added category "${created.name}".`, 'success');
      return true;
    },
    [categories, adminFetch, pushToast]
  );

  const updateCategory = useCallback(
    async (id: string, patch: Partial<CategoryInfo>): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      if (!res.ok) return false;

      const updated = categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
      setCategories(updated);
      await directoryRepository.saveCategories(updated);
      pushToast('Category updated.', 'success');
      return true;
    },
    [categories, adminFetch, pushToast]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return false;

      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      await directoryRepository.saveCategories(updated);
      pushToast('Category removed.', 'info');
      return true;
    },
    [categories, adminFetch, pushToast]
  );

  const addBlogPost = useCallback(
    async (post: Omit<BlogPost, 'id' | 'slug' | 'publishedAt'>): Promise<boolean> => {
      const created: BlogPost = {
        ...post,
        id: `blog-${Date.now()}`,
        slug: slugify(post.title) || `post-${Date.now()}`,
        publishedAt: new Date().toISOString().slice(0, 10),
      };
      const res = await adminFetch('/api/admin/blog', {
        method: 'POST',
        body: JSON.stringify(created),
      });
      if (!res.ok) return false;

      const updated = [created, ...blogPosts];
      setBlogPosts(updated);
      await directoryRepository.saveBlogPosts(updated);
      pushToast(`Published "${created.title}".`, 'success');
      return true;
    },
    [blogPosts, adminFetch, pushToast]
  );

  const updateBlogPost = useCallback(
    async (id: string, patch: Partial<BlogPost>): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/blog/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      if (!res.ok) return false;

      const updated = blogPosts.map((p) => (p.id === id ? { ...p, ...patch } : p));
      setBlogPosts(updated);
      await directoryRepository.saveBlogPosts(updated);
      pushToast('Article updated.', 'success');
      return true;
    },
    [blogPosts, adminFetch, pushToast]
  );

  const deleteBlogPost = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/blog/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return false;

      const updated = blogPosts.filter((p) => p.id !== id);
      setBlogPosts(updated);
      await directoryRepository.saveBlogPosts(updated);
      pushToast('Article deleted.', 'info');
      return true;
    },
    [blogPosts, adminFetch, pushToast]
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
          submission.requestedTier && submission.requestedTier !== 'Free'
            ? 'approved'
            : 'none',
        logoColor: '#4F46E5',
        logoKey: slugify(submission.name),
        features: [],
        pros: [],
        cons: [],
        bestUseCases: [],
        isFeatured:
          submission.requestedTier === 'Featured' ||
          submission.requestedTier === 'Sponsored',
        isTrending: false,
        tags: [slugify(normalizedCategory)],
      });

      if (!created) return false;

      await adminFetch(`/api/admin/submissions/${encodeURIComponent(id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved' }),
      });

      const updatedSubs = submissions.map((s) =>
        s.id === id ? { ...s, status: 'approved' as const } : s
      );
      setSubmissions(updatedSubs);
      await directoryRepository.saveSubmissions(updatedSubs);
      return true;
    },
    [submissions, addTool, adminFetch]
  );

  const rejectSubmission = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/submissions/${encodeURIComponent(id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'rejected' }),
      });
      if (!res.ok) return false;

      const updatedSubs = submissions.map((s) =>
        s.id === id ? { ...s, status: 'rejected' as const } : s
      );
      setSubmissions(updatedSubs);
      await directoryRepository.saveSubmissions(updatedSubs);
      pushToast('Submission marked as rejected.', 'info');
      return true;
    },
    [submissions, adminFetch, pushToast]
  );

  const decideSponsoredListing = useCallback(
    async (
      id: string,
      decision: 'approved' | 'rejected' | 'pending',
      notes?: string
    ): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/sponsored/${encodeURIComponent(id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes }),
      });
      if (!res.ok) return false;
      await refreshAdminData();
      const loadedTools = await directoryRepository.getTools();
      setTools(loadedTools);
      pushToast(
        decision === 'approved'
          ? 'Sponsored listing approved and published.'
          : decision === 'pending'
            ? 'Sponsored campaign paused for review.'
            : 'Sponsored listing rejected.',
        'success'
      );
      return true;
    },
    [adminFetch, refreshAdminData, pushToast]
  );

  const updateUserRole = useCallback(
    async (userId: string, role: 'user' | 'admin'): Promise<boolean> => {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) return false;
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      pushToast(`Updated user role to ${role}.`, 'success');
      return true;
    },
    [adminFetch, pushToast]
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

  return (
    <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>
  );
}

export function useDirectory(): DirectoryContextValue {
  const ctx = useContext(DirectoryContext);
  if (!ctx) {
    throw new Error('useDirectory must be used within a DirectoryProvider');
  }
  return ctx;
}
