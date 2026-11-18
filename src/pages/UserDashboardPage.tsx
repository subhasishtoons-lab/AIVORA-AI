import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  Clock,
  KeyRound,
  LogIn,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { ToolCard } from '../components/ToolCard';
import { useDirectory } from '../context/DirectoryContext';
import { isToolPublished } from '../utils/directory';

export function UserDashboardPage() {
  const {
    currentUser,
    isSupabaseReady,
    isAdmin,
    tools,
    favorites,
    recentlyViewedIds,
    reviews,
    openAuthModal,
    signOutUser,
    updateUserProfile,
    requestPasswordReset,
    navigate,
    setSeoMeta,
    pushToast,
  } = useDirectory();

  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [company, setCompany] = useState(currentUser?.company ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(currentUser?.fullName ?? '');
    setCompany(currentUser?.company ?? '');
    setBio(currentUser?.bio ?? '');
  }, [currentUser]);

  useEffect(() => {
    setSeoMeta(
      'User Dashboard — Saved Tools & Activity | AIVORA AI',
      'Manage your AIVORA AI profile, saved favorite AI tools, and recently viewed software.',
      { canonicalPath: '/dashboard' }
    );
  }, [setSeoMeta]);

  const favoriteTools = useMemo(
    () => tools.filter((t) => isToolPublished(t) && favorites.includes(t.id)),
    [tools, favorites]
  );

  const recentlyViewedTools = useMemo(() => {
    const map = new Map(tools.filter(isToolPublished).map((t) => [t.id, t]));
    return recentlyViewedIds
      .map((id) => map.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [tools, recentlyViewedIds]);

  const userReviews = useMemo(() => {
    if (!currentUser) return [];
    return reviews.filter((r) => r.userId === currentUser.id);
  }, [reviews, currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }
    setProfileError(null);
    setProfileSaving(true);
    const err = await updateUserProfile({
      fullName: fullName.trim(),
      company: company.trim(),
      bio: bio.trim(),
    });
    setProfileSaving(false);
    if (err) setProfileError(err);
  };

  const handleTriggerPasswordReset = async () => {
    if (!currentUser?.email) return;
    const err = await requestPasswordReset(currentUser.email);
    if (err) {
      pushToast(err, 'error');
    } else {
      pushToast(`Password reset link sent to ${currentUser.email}.`, 'success');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Account &amp; Workspace
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            Manage your profile, synced favorite AI tools, and recently viewed software.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Open Admin Panel</span>
            </button>
          )}
          {currentUser ? (
            <button
              type="button"
              onClick={signOutUser}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Profile Section */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {!currentUser ? (
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                {isSupabaseReady ? (
                  <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                )}
                <span>
                  {isSupabaseReady
                    ? 'Sign in to sync your saved tools across devices'
                    : 'Supabase Authentication Not Configured'}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {isSupabaseReady
                  ? 'Create a free AIVORA AI account to sync favorites, recently viewed history, and verified reviews.'
                  : 'Real user accounts require VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Meanwhile, your browser stores local bookmarks and recently viewed tools below.'}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Create Account
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Profile Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Signed in as {currentUser.email} · Role:{' '}
                  <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                    {currentUser.role}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerPasswordReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Send Password Reset Email</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {profileError && (
                <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                  {profileError}
                </div>
              )}
              <div>
                <label htmlFor="prof-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="prof-company" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Company / Team (optional)
                </label>
                <input
                  id="prof-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Studio"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="prof-bio" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Short Bio (optional)
                </label>
                <input
                  id="prof-bio"
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Product designer evaluating AI workflows"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Summary metrics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saved Favorite AI Tools
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
            {favoriteTools.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Recently Viewed Tools
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
            {recentlyViewedTools.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Reviews Written
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
            {userReviews.length}
          </p>
        </div>
      </div>

      {/* Saved Favorite AI Tools */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Saved Favorite AI Tools
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Browse directory
          </button>
        </div>

        {favoriteTools.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You haven&apos;t bookmarked any AI tools yet. Click the bookmark icon on any tool card to save it here.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favoriteTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Viewed Tools */}
      <section className="mt-12">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Recently Viewed Tools
          </h2>
        </div>

        {recentlyViewedTools.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tools you inspect on their detail pages will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentlyViewedTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
