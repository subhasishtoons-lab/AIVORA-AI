import React from 'react';
import { Github, Globe, Linkedin, Mail, Twitter } from 'lucide-react';
import { useDirectory } from '../context/DirectoryContext';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  const { navigate, setSubmitModalOpen, isAdmin } = useDirectory();

  const handleLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <footer className="border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <a
              href="/"
              onClick={(e) => handleLink(e, '/')}
              className="inline-block"
            >
              <BrandLogo />
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Discover the Future of Artificial Intelligence. Independent directory,
              side-by-side comparisons, and practical guides for modern teams.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AIVORA AI on X"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Twitter className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AIVORA AI on LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Linkedin className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AIVORA AI on GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/contact"
                onClick={(e) => handleLink(e, '/contact')}
                aria-label="Contact AIVORA AI"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Directory
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="/explore"
                  onClick={(e) => handleLink(e, '/explore')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Explore All AI Tools
                </a>
              </li>
              <li>
                <a
                  href="/categories"
                  onClick={(e) => handleLink(e, '/categories')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Browse Categories
                </a>
              </li>
              <li>
                <a
                  href="/explore?pricing=Free%20%26%20Freemium"
                  onClick={(e) =>
                    handleLink(e, '/explore?pricing=Free%20%26%20Freemium')
                  }
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Free &amp; Freemium Tools
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(true)}
                  className="text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Submit an AI Tool
                </button>
              </li>
              <li>
                <a
                  href="/advertise"
                  onClick={(e) => handleLink(e, '/advertise')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Promote / Sponsored Listings
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Account &amp; Resources
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="/blog"
                  onClick={(e) => handleLink(e, '/blog')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Editorial Blog
                </a>
              </li>
              <li>
                <a
                  href="/dashboard"
                  onClick={(e) => handleLink(e, '/dashboard')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  User Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  onClick={(e) => handleLink(e, '/about')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  About AIVORA AI
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => handleLink(e, '/contact')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Contact Editorial Team
                </a>
              </li>
              {isAdmin && (
                <li>
                  <a
                    href="/admin"
                    onClick={(e) => handleLink(e, '/admin')}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    Admin Dashboard
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Legal, SEO &amp; Disclosure
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => handleLink(e, '/privacy')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => handleLink(e, '/terms')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  XML Sitemap
                </a>
              </li>
            </ul>
            <div className="mt-5 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Affiliate disclosure: Some outbound vendor links may include tracking configured by partner programs at zero cost to you. Verify pricing on official sites.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-8 text-xs text-slate-500 sm:flex-row sm:items-center dark:border-slate-800 dark:text-slate-400">
          <p>© {new Date().getFullYear()} AIVORA AI · Created by Tunsu. All rights reserved.</p>
          <p>Discover the Future of Artificial Intelligence.</p>
        </div>
      </div>
    </footer>
  );
}
