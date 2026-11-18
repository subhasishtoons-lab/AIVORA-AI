import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { validateEmail } from '../utils/directory';

export function AuthPreviewModal() {
  const {
    authModalMode,
    openAuthModal,
    closeAuthModal,
    isSupabaseReady,
    signInWithPassword,
    signUpWithPassword,
    requestPasswordReset,
    updatePassword,
    navigate,
  } = useDirectory();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authModalMode) return;
    setError(null);
    setInfoMessage(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authModalMode, closeAuthModal]);

  if (!authModalMode) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (authModalMode === 'update-password') {
      if (password.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      const err = await updatePassword(password);
      setSubmitting(false);
      if (err) setError(err);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (authModalMode === 'reset') {
      setSubmitting(true);
      const err = await requestPasswordReset(email);
      setSubmitting(false);
      if (err) {
        setError(err);
      } else {
        setInfoMessage(
          'Password reset instructions have been sent if an account matches that email.'
        );
      }
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (authModalMode === 'signup') {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name.');
        return;
      }
      setSubmitting(true);
      const result = await signUpWithPassword(email, password, fullName);
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
      } else if (result.needsEmailConfirm) {
        setInfoMessage(
          'Account created! Check your email inbox to confirm your address before signing in.'
        );
      }
      return;
    }

    setSubmitting(true);
    const err = await signInWithPassword(email, password);
    setSubmitting(false);
    if (err) setError(err);
  };

  const titles: Record<Exclude<typeof authModalMode, null>, string> = {
    login: 'Sign in to AIVORA AI',
    signup: 'Create your account',
    reset: 'Reset your password',
    'update-password': 'Set a new password',
  };

  const subtitles: Record<Exclude<typeof authModalMode, null>, string> = {
    login: 'Access your saved tools, recently viewed history, and account dashboard.',
    signup: 'Sync favorite AI tools, publish verified reviews, and manage tool submissions.',
    reset: 'Enter your registered email address to receive a Supabase password recovery link.',
    'update-password': 'Enter your new password below to finish recovering your account.',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="auth-modal-title"
              className="font-display text-xl font-bold text-slate-900 dark:text-white"
            >
              {titles[authModalMode]}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {subtitles[authModalMode]}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close account modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mode switch tabs */}
        {authModalMode !== 'update-password' && (
          <div className="mt-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                authModalMode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                authModalMode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('reset')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                authModalMode === 'reset'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Reset
            </button>
          </div>
        )}

        {!isSupabaseReady && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Supabase Authentication Not Configured</span>
            </div>
            <p className="mt-1">
              Real account registration, login, and password resets require{' '}
              <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in your environment. You can still browse the directory and save local bookmarks without signing in.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{infoMessage}</span>
            </div>
          )}

          {authModalMode === 'signup' && (
            <div>
              <label
                htmlFor="auth-full-name"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Full Name
              </label>
              <input
                id="auth-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Taylor"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}

          {authModalMode !== 'update-password' && (
            <div>
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}

          {(authModalMode === 'login' ||
            authModalMode === 'signup' ||
            authModalMode === 'update-password') && (
            <div>
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {authModalMode === 'update-password' ? 'New Password' : 'Password'}
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}

          {authModalMode === 'update-password' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Confirm New Password
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {authModalMode === 'reset' && <KeyRound className="h-4 w-4" aria-hidden="true" />}
            <span>
              {submitting
                ? 'Please wait...'
                : authModalMode === 'signup'
                  ? 'Create Account'
                  : authModalMode === 'reset'
                    ? 'Send Reset Link'
                    : authModalMode === 'update-password'
                      ? 'Update Password'
                      : 'Sign In'}
            </span>
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Powered by Supabase Auth</span>
          </span>
          <button
            type="button"
            onClick={() => {
              closeAuthModal();
              navigate('/dashboard');
            }}
            className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            User Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
