import React, { useState } from 'react';
import { LayoutDashboard, Menu, Moon, Sun, User, X } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Explore AI Tools', path: '/explore' },
  { label: 'Categories', path: '/categories' },
  { label: 'Blog', path: '/blog' },
  { label: 'Advertise', path: '/advertise' },
];

export function Navbar() {
  const {
    currentPath,
    navigate,
    theme,
    toggleTheme,
    openAuthModal,
    currentUser,
    isAdmin,
    signOutUser,
  } = useDirectory();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark */}
        <a
          href="/"
          onClick={(e) => handleNav(e, '/')}
          className="whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 rounded-md"
        >
          <BrandLogo />
        </a>

        {/* Zone 2: Primary navigation links (max 5 single-line items) */}
        <nav
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-6"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className={`whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 border-b-2 ${
                  isActive
                    ? 'border-indigo-600 text-slate-900 dark:border-indigo-400 dark:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-300 dark:hover:text-white dark:hover:border-slate-700'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <a
            href="/dashboard"
            onClick={(e) => handleNav(e, '/dashboard')}
            aria-label="User Dashboard"
            className={`hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              currentPath.startsWith('/dashboard')
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span>{currentUser ? currentUser.fullName.split(' ')[0] : 'Dashboard'}</span>
          </a>

          {isAdmin && (
            <a
              href="/admin"
              onClick={(e) => handleNav(e, '/admin')}
              className={`hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                currentPath.startsWith('/admin')
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>Admin</span>
            </a>
          )}

          {currentUser ? (
            <button
              type="button"
              onClick={signOutUser}
              className="hidden md:inline-flex whitespace-nowrap shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign Out
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="whitespace-nowrap shrink-0 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Sign Up
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-lg lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.path);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleNav(e, item.path)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <a
              href="/dashboard"
              onClick={(e) => handleNav(e, '/dashboard')}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              User Dashboard
            </a>
            {isAdmin && (
              <a
                href="/admin"
                onClick={(e) => handleNav(e, '/admin')}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Admin Dashboard
              </a>
            )}
            <a
              href="/about"
              onClick={(e) => handleNav(e, '/about')}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              About
            </a>
            <a
              href="/contact"
              onClick={(e) => handleNav(e, '/contact')}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Contact
            </a>
          </nav>

          <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  signOutUser();
                  setMobileOpen(false);
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                Sign Out ({currentUser.fullName || currentUser.email})
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openAuthModal('login');
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openAuthModal('signup');
                  }}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
