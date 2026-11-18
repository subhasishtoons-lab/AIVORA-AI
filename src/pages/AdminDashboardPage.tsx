import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Lock,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import blogComparisonCover from '../assets/images/blog_ai_models_comparison_1794751868886.jpg';
import { AdminToolModal, type AdminToolSavePayload } from '../components/admin/AdminToolModal';
import { AdminToolsManager } from '../components/admin/AdminToolsManager';
import { useDirectory } from '../context/DirectoryContext';
import {
  AITool,
  ALL_BLOG_CATEGORIES,
  BlogCategory,
  BlogPost,
} from '../types/directory';
import { validateBlogPostInput } from '../utils/directory';

export type AdminTab =
  | 'overview'
  | 'tools'
  | 'sponsored'
  | 'categories'
  | 'blog'
  | 'submissions'
  | 'users'
  | 'inquiries';

export function AdminDashboardPage({ initialTab }: { initialTab?: AdminTab }) {
  const {
    tools,
    categories,
    blogPosts,
    submissions,
    sponsoredListings,
    subscribers,
    contactInquiries,
    advertisingInquiries,
    affiliateClicks,
    analytics,
    usersList,
    configStatus,
    currentUser,
    isAdmin,
    authLoading,
    adminError,
    supabaseToolsCount,
    syncStarterToolsToSupabase,
    openAuthModal,
    refreshAdminData,
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
    navigate,
    setSeoMeta,
  } = useDirectory();

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab ?? 'overview');
  const [refreshing, setRefreshing] = useState(false);

  // Tool Add / Edit modal state
  const [editingTool, setEditingTool] = useState<AITool | null>(null);
  const [isToolFormOpen, setToolFormOpen] = useState(false);
  const [isSavingTool, setIsSavingTool] = useState(false);

  // Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatDesc, setEditingCatDesc] = useState('');

  // Blog Create / Edit + SEO fields state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postExcerpt, setPostExcerpt] = useState('');
  const [postCategory, setPostCategory] = useState<BlogCategory>('AI Tool Reviews');
  const [postBody, setPostBody] = useState('');
  const [postSeoTitle, setPostSeoTitle] = useState('');
  const [postSeoDesc, setPostSeoDesc] = useState('');
  const [postCanonicalUrl, setPostCanonicalUrl] = useState('');
  const [postFocusKeyword, setPostFocusKeyword] = useState('');
  const [blogFormError, setBlogFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setSeoMeta(
      activeTab === 'tools'
        ? 'AI Tools Management | AIVORA AI Admin'
        : 'Admin Control Panel | AIVORA AI',
      'Protected administrator console for AI tools, affiliate links, sponsored listings, analytics, blog SEO, users, and subscribers.',
      { canonicalPath: activeTab === 'tools' ? '/admin/tools' : '/admin' }
    );
  }, [activeTab, setSeoMeta]);

  useEffect(() => {
    if (isAdmin && configStatus.supabaseClientConfigured) {
      refreshAdminData();
    }
  }, [isAdmin, configStatus.supabaseClientConfigured, refreshAdminData]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshAdminData();
    setRefreshing(false);
  };

  // STRICT BACKEND SECURITY GATE:
  // Enforces real Supabase Auth JWT + PostgreSQL Row Level Security (publishable key only).
  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verifying administrator session...
        </p>
      </div>
    );
  }

  if (!configStatus.supabaseClientConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <Lock className="h-6 w-6" aria-hidden="true" />
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Admin Security Gate: Supabase Configuration Required
            </h1>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            AIVORA AI enforces real backend JWT authentication and PostgreSQL Row Level Security (<code className="font-mono">profiles.role === &apos;admin&apos;</code>) on every <code className="font-mono">/api/admin/*</code> endpoint using the Supabase publishable key. Administrative editors, subscriber lists, analytics, and affiliate controls are locked until Supabase is configured.
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-950">
            <p className="font-semibold text-slate-900 dark:text-white">
              Required Configuration Checklist:
            </p>
            <ul className="mt-2.5 space-y-2 text-slate-700 dark:text-slate-300">
              <li>
                1. Supabase Client Env: <code className="font-mono">VITE_SUPABASE_URL</code> &amp;{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> (publishable key){' '}
                ({configStatus.supabaseClientConfigured ? 'Configured' : 'Missing'})
              </li>
              <li>
                2. Run PostgreSQL migration <code className="font-mono">/supabase/schema.sql</code> in Supabase SQL Editor (creates tables, <code className="font-mono">public.is_admin()</code>, and RLS policies).
              </li>
              <li>
                3. Register an account via Sign Up, then run in Supabase SQL Editor:{' '}
                <code className="font-mono">
                  update public.profiles set role = &apos;admin&apos; where email = &apos;you@domain.com&apos;;
                </code>
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Return to Homepage
            </button>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Explore Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <Lock className="mx-auto h-10 w-10 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Administrator Sign-In Required
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Only authenticated accounts with the <code className="font-mono">admin</code> role in Supabase can access the Admin Control Panel.
          </p>
          {configStatus.supabaseSchemaReady === false && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">Supabase Schema Setup Pending</p>
              <p className="mt-1">
                {configStatus.supabaseStatusMessage ||
                  'Run /supabase/schema.sql in your Supabase SQL Editor to create directory tables and RLS policies.'}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Sign In as Administrator
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 dark:border-rose-900/60 dark:bg-slate-900">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
            403 — Administrator Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Signed in as <strong>{currentUser.email}</strong> (role:{' '}
            <code className="font-mono">{currentUser.role}</code>). Administrator privileges are enforced by the backend and Row Level Security.
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <p>
              <span className="font-semibold text-slate-900 dark:text-white">Signed-in Email:</span>{' '}
              <code className="font-mono">{currentUser.email || 'Unknown'}</code>
            </p>
            <p className="mt-1">
              <span className="font-semibold text-slate-900 dark:text-white">Supabase Auth ID:</span>{' '}
              <code className="font-mono break-all">{currentUser.id}</code>
            </p>
          </div>
          {configStatus.supabaseSchemaReady === false && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">Supabase Schema Setup Pending</p>
              <p className="mt-1">
                {configStatus.supabaseStatusMessage ||
                  'Run /supabase/schema.sql in your Supabase SQL Editor to create directory tables, public.profiles, and RLS policies.'}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-indigo-600"
          >
            Go to User Dashboard
          </button>
        </div>
      </div>
    );
  }

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const pendingSponsors = sponsoredListings.filter((s) => s.approvalStatus === 'pending');

  const openNewToolForm = () => {
    setEditingTool(null);
    setToolFormOpen(true);
  };

  const openEditToolForm = (tool: AITool) => {
    setEditingTool(tool);
    setToolFormOpen(true);
  };

  const handleSaveTool = async (payload: AdminToolSavePayload): Promise<string | null> => {
    setIsSavingTool(true);
    try {
      if (editingTool) {
        const ok = await updateTool(editingTool.id, payload);
        if (!ok) {
          return 'Could not save tool changes. Verify Supabase permissions or schema migration and try again.';
        }
      } else {
        const created = await addTool({
          ...payload,
          pricingTiers: [],
          pricingSnapshotDate: '',
          pros: [],
          cons: [],
          bestUseCases: [],
        });
        if (!created) {
          return 'Could not create tool. Verify Supabase schema/RLS or duplicate checks and try again.';
        }
      }
      setToolFormOpen(false);
      return null;
    } finally {
      setIsSavingTool(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatFormError('Please enter a category name.');
      return;
    }
    if (!newCatDesc.trim()) {
      setCatFormError('Please enter a short category description.');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
      setCatFormError('A category with this name already exists.');
      return;
    }
    setCatFormError(null);
    await addCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim(),
      iconKey: 'Layers',
      accentColor: '#4F46E5',
    });
    setNewCatName('');
    setNewCatDesc('');
  };

  const startEditPost = (post: BlogPost) => {
    setEditingPostId(post.id);
    setPostTitle(post.title);
    setPostExcerpt(post.excerpt);
    setPostCategory(post.category);
    setPostBody(
      post.sections
        .map((s) => `${s.heading}\n${s.paragraphs.join('\n\n')}`)
        .join('\n\n')
    );
    setPostSeoTitle(post.seoTitle ?? '');
    setPostSeoDesc(post.seoDescription ?? '');
    setPostCanonicalUrl(post.canonicalUrl ?? '');
    setPostFocusKeyword(post.focusKeyword ?? '');
    setBlogFormError(null);
  };

  const resetBlogForm = () => {
    setEditingPostId(null);
    setPostTitle('');
    setPostExcerpt('');
    setPostBody('');
    setPostSeoTitle('');
    setPostSeoDesc('');
    setPostCanonicalUrl('');
    setPostFocusKeyword('');
    setBlogFormError(null);
  };

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateBlogPostInput({
      title: postTitle,
      excerpt: postExcerpt,
      body: postBody,
      category: postCategory,
      canonicalUrl: postCanonicalUrl,
    });
    if (err) {
      setBlogFormError(err);
      return;
    }

    const paragraphs = postBody
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);

    if (editingPostId) {
      await updateBlogPost(editingPostId, {
        title: postTitle.trim(),
        excerpt: postExcerpt.trim(),
        category: postCategory,
        seoTitle: postSeoTitle.trim() || undefined,
        seoDescription: postSeoDesc.trim() || undefined,
        canonicalUrl: postCanonicalUrl.trim() || undefined,
        focusKeyword: postFocusKeyword.trim() || undefined,
        sections: [{ heading: 'Editorial Content', paragraphs }],
      });
    } else {
      await addBlogPost({
        title: postTitle.trim(),
        excerpt: postExcerpt.trim(),
        category: postCategory,
        author: currentUser.fullName || 'AIVORA Editorial Desk',
        authorRole: 'Directory Admin',
        readTimeMinutes: Math.max(2, Math.ceil(postBody.split(/\s+/).length / 180)),
        coverImage: blogComparisonCover,
        relatedToolSlugs: tools.slice(0, 2).map((t) => t.slug),
        seoTitle: postSeoTitle.trim() || undefined,
        seoDescription: postSeoDesc.trim() || undefined,
        canonicalUrl: postCanonicalUrl.trim() || undefined,
        focusKeyword: postFocusKeyword.trim() || undefined,
        sections: [{ heading: 'Editorial Summary', paragraphs }],
      });
    }
    resetBlogForm();
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Analytics & Overview', icon: <BarChart3 className="h-4 w-4" aria-hidden="true" /> },
    { id: 'tools', label: 'AI Tools Management', icon: <Wrench className="h-4 w-4" aria-hidden="true" />, badge: tools.length },
    { id: 'sponsored', label: 'Sponsored Listings', icon: <Megaphone className="h-4 w-4" aria-hidden="true" />, badge: pendingSponsors.length },
    { id: 'categories', label: 'Categories', icon: <FolderKanban className="h-4 w-4" aria-hidden="true" />, badge: categories.length },
    { id: 'blog', label: 'Blog & SEO CMS', icon: <FileText className="h-4 w-4" aria-hidden="true" />, badge: blogPosts.length },
    { id: 'submissions', label: 'Submissions', icon: <Inbox className="h-4 w-4" aria-hidden="true" />, badge: pendingSubmissions.length },
    { id: 'users', label: 'Users & Roles', icon: <Users className="h-4 w-4" aria-hidden="true" />, badge: usersList.length },
    { id: 'inquiries', label: 'Subscribers & Leads', icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />, badge: subscribers.length + advertisingInquiries.length + contactInquiries.length },
  ];

  const handleSelectTab = (tabId: AdminTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const targetPath = tabId === 'tools' ? '/admin/tools' : '/admin';
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            AIVORA AI / Admin Control Panel / {navItems.find((n) => n.id === activeTab)?.label}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Monetization, Analytics &amp; Catalog Admin
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh Live Data</span>
          </button>
          <button
            type="button"
            onClick={openNewToolForm}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create New AI Tool</span>
          </button>
        </div>
      </div>

      {configStatus.supabaseSchemaReady === false && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <strong className="font-semibold">Supabase Schema Not Initialized:</strong>{' '}
          {configStatus.supabaseStatusMessage ||
            'Execute /supabase/schema.sql in your Supabase SQL Editor so tool mutations, RLS policies, and analytics persist to PostgreSQL.'}
        </div>
      )}

      {adminError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {adminError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <nav
            aria-label="Admin sections"
            className="flex flex-row gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-2 lg:flex-col dark:border-slate-800 dark:bg-slate-900"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && (
                    <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <div className="lg:col-span-9">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Real Recorded Analytics KPI Strip */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Visitors</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                    {analytics.totalVisitors}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Page Views</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                    {analytics.totalPageViews}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Affiliate Clicks</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
                    {analytics.totalAffiliateClicks}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Search Queries</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                    {analytics.totalSearches}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Registrations</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                    {analytics.newUserRegistrations}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Newsletter</p>
                  <p className="mt-1.5 font-display text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {analytics.newsletterSubscriptions}
                  </p>
                </div>
              </div>

              {/* 3 Data Breakdown Tables */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Most Viewed AI Tools
                  </h2>
                  {analytics.mostViewedTools.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      No tool page views recorded yet.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                      {analytics.mostViewedTools.map((row) => (
                        <li key={row.toolSlug} className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {row.toolName} <span className="text-xs text-slate-500">· {row.category}</span>
                          </span>
                          <span className="font-mono text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {row.views}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Most Searched Keywords &amp; Popular Categories
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Top Keywords
                      </p>
                      {analytics.topKeywords.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">No searches recorded yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-xs">
                          {analytics.topKeywords.map((kw) => (
                            <li key={kw.keyword} className="flex justify-between text-slate-700 dark:text-slate-300">
                              <span>{kw.keyword}</span>
                              <span className="font-mono tabular-nums">{kw.count}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Popular Categories
                      </p>
                      {analytics.popularCategories.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">No category views recorded yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-xs">
                          {analytics.popularCategories.map((cat) => (
                            <li key={cat.category} className="flex justify-between text-slate-700 dark:text-slate-300">
                              <span>{cat.category}</span>
                              <span className="font-mono tabular-nums">{cat.views}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Affiliate Click Log */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Outbound &amp; Affiliate Click Tracking ({affiliateClicks.length})
                </h2>
                {affiliateClicks.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    No outbound clicks logged yet. Clicks via <code className="font-mono">/go/:slug</code> appear here in real time.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                          <th className="py-2 pr-3 font-medium">Tool</th>
                          <th className="py-2 px-3 font-medium">Program</th>
                          <th className="py-2 px-3 font-medium">Type</th>
                          <th className="py-2 px-3 font-medium">Source</th>
                          <th className="py-2 pl-3 text-right font-medium">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {affiliateClicks.slice(0, 15).map((clk) => (
                          <tr key={clk.id}>
                            <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-white">
                              {clk.toolName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {clk.affiliateProgram || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {clk.isAffiliate ? 'Affiliate' : 'Direct'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{clk.sourcePage}</td>
                            <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-slate-500">
                              {clk.clickedAt.slice(0, 19).replace('T', ' ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <AdminToolsManager
              tools={tools}
              categories={categories}
              supabaseSchemaReady={configStatus.supabaseSchemaReady}
              supabaseToolsCount={supabaseToolsCount}
              onSyncStarterTools={syncStarterToolsToSupabase}
              onCreateNew={openNewToolForm}
              onEdit={openEditToolForm}
              onQuickUpdate={updateTool}
              onDelete={deleteTool}
            />
          )}

          {activeTab === 'sponsored' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Sponsored &amp; Featured Listing Queue ({sponsoredListings.length})
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage Featured and Sponsored listing campaigns directly—approve, pause, or reject placements without online payment integration.
              </p>
              {sponsoredListings.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No sponsored or featured listing requests yet.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {sponsoredListings.map((req) => (
                    <div key={req.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
                            {req.toolName}{' '}
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              · {req.listingTier} ({req.campaignDurationDays}d)
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {req.shortDescription}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {req.companyName} · {req.contactEmail} · Status: {req.approvalStatus} (Admin-Managed)
                            {req.campaignStart && req.campaignEnd
                              ? ` · ${req.campaignStart} to ${req.campaignEnd}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {req.approvalStatus !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => decideSponsoredListing(req.id, 'approved')}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Approve &amp; Publish</span>
                            </button>
                          )}
                          {req.approvalStatus === 'approved' && (
                            <button
                              type="button"
                              onClick={() => decideSponsoredListing(req.id, 'pending')}
                              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                            >
                              Pause Campaign
                            </button>
                          )}
                          {req.approvalStatus !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => decideSponsoredListing(req.id, 'rejected')}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <form
                onSubmit={handleAddCategory}
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Add Category
                </h2>
                {catFormError && (
                  <p className="mt-2 text-xs font-medium text-rose-600">{catFormError}</p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category name"
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Short category description..."
                    className="sm:col-span-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Create Category
                  </button>
                </div>
              </form>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Existing Categories ({categories.length})
                </h2>
                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{cat.name}</p>
                        {editingCatId === cat.id ? (
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={editingCatDesc}
                              onChange={(e) => setEditingCatDesc(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateCategory(cat.id, { description: editingCatDesc.trim() });
                                setEditingCatId(null);
                              }}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatDesc(cat.description);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(cat.id)}
                          className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:border-rose-900/60 dark:text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveBlogPost}
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {editingPostId ? 'Edit Article & SEO Metadata' : 'Publish New Blog Article'}
                  </h2>
                  {editingPostId && (
                    <button
                      type="button"
                      onClick={resetBlogForm}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                {blogFormError && (
                  <p className="mt-2 text-xs font-medium text-rose-600">{blogFormError}</p>
                )}
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Article headline"
                      className="sm:col-span-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value as BlogCategory)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      {ALL_BLOG_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={postExcerpt}
                    onChange={(e) => setPostExcerpt(e.target.value)}
                    placeholder="Brief 1-sentence excerpt..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <textarea
                    rows={4}
                    value={postBody}
                    onChange={(e) => setPostBody(e.target.value)}
                    placeholder="Article body paragraphs (separate paragraphs with blank lines)..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />

                  {/* SEO Fields */}
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950/60">
                    <input
                      type="text"
                      value={postSeoTitle}
                      onChange={(e) => setPostSeoTitle(e.target.value)}
                      placeholder="SEO Meta Title (optional)"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={postFocusKeyword}
                      onChange={(e) => setPostFocusKeyword(e.target.value)}
                      placeholder="Focus Keyword (optional)"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={postSeoDesc}
                      onChange={(e) => setPostSeoDesc(e.target.value)}
                      placeholder="SEO Meta Description (optional)"
                      className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="url"
                      value={postCanonicalUrl}
                      onChange={(e) => setPostCanonicalUrl(e.target.value)}
                      placeholder="Canonical URL override (optional, https://...)"
                      className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      {editingPostId ? 'Save Article Changes' : 'Publish Article'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Published Articles ({blogPosts.length})
                </h2>
                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {blogPosts.map((post) => (
                    <div key={post.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{post.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {post.category} · {post.publishedAt} · SEO: {post.seoTitle ? 'Custom' : 'Default'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditPost(post)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          Edit &amp; SEO
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBlogPost(post.id)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 dark:border-rose-900/60 dark:text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Community Tool Submissions ({submissions.length})
              </h2>
              <div className="mt-5 space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
                          {sub.name} ·{' '}
                          <span className="text-xs font-normal text-slate-500">
                            {sub.category} · {sub.requestedTier || 'Free'} Tier
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {sub.shortDescription}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {sub.websiteUrl} · {sub.submitterEmail} · {sub.submittedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => approveSubmission(sub.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Approve &amp; Publish
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectSubmission(sub.id)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold capitalize text-slate-500">
                            {sub.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Registered Users &amp; Roles ({usersList.length})
              </h2>
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {u.fullName || u.email}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <select
                      value={u.role}
                      disabled={u.id === currentUser.id}
                      onChange={(e) =>
                        updateUserRole(u.id, e.target.value as 'user' | 'admin')
                      }
                      aria-label={`Role for ${u.email}`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'inquiries' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Newsletter Subscribers ({subscribers.length})
                </h2>
                <ul className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {subscribers.map((s) => (
                    <li key={s.id} className="flex justify-between py-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{s.email}</span>
                      <span className="text-slate-500">{s.subscribedAt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Business Advertising Enquiries ({advertisingInquiries.length})
                </h2>
                <div className="mt-4 space-y-3">
                  {advertisingInquiries.map((ad) => (
                    <div key={ad.id} className="rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {ad.companyName} · {ad.requestedTier} ({ad.campaignDurationDays}d) · {ad.monthlyBudget}
                      </p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{ad.goals}</p>
                      <p className="mt-1 text-slate-500">
                        {ad.contactName} ({ad.email}) · {ad.websiteUrl}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Contact Messages ({contactInquiries.length})
                </h2>
                <div className="mt-4 space-y-3">
                  {contactInquiries.map((c) => (
                    <div key={c.id} className="rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {c.topic} — {c.name} ({c.email})
                      </p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{c.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminToolModal
        isOpen={isToolFormOpen}
        editingTool={editingTool}
        categories={categories}
        existingTools={tools}
        isSaving={isSavingTool}
        onClose={() => setToolFormOpen(false)}
        onSave={handleSaveTool}
      />
    </div>
  );
}
