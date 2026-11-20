import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, MapPin, Shield } from 'lucide-react';
import aboutStudioCover from '../assets/images/about_aivora_studio_1794751869510.jpg';
import { useDirectory } from '../context/DirectoryContext';
import { isToolPublished, validateContactInquiry } from '../utils/directory';

export function AboutPage() {
  const { tools, categories, navigate, setSeoMeta } = useDirectory();

  useEffect(() => {
    setSeoMeta(
      'About AIVORA AI — Curated Artificial Intelligence Directory',
      'Learn how AIVORA AI evaluates, organizes, and maintains trusted software listings for teams navigating modern artificial intelligence.',
      { canonicalPath: '/about' }
    );
  }, [setSeoMeta]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          About AIVORA AI
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Helping teams choose the right AI software with clarity.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
          New AI products launch daily, making it difficult to separate durable tools from fleeting demos. AIVORA AI curates verified software across {categories.length} core categories so builders, writers, designers, and operators can compare options objectively.
        </p>
      </div>

      <div className="mt-10 aspect-16/9 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
        <img
          src={aboutStudioCover}
          alt="AIVORA AI research and product workspace"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            01. Structured Evaluation
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Every listing highlights concrete capabilities, honest limitations, ideal use cases, and direct links to the official vendor website.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            02. Transparent Monetization
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Sponsored placements and configured partner affiliate links are explicitly labeled so readers always distinguish editorial evaluations from paid campaigns.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            03. Production Architecture
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Currently indexing {tools.filter(isToolPublished).length} verified tools with PostgreSQL &amp; Supabase Row Level Security schemas, server-verified Admin RBAC, and real click attribution.
          </p>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Explore the Directory
        </button>
        <button
          type="button"
          onClick={() => navigate('/advertise')}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Promote Your Tool
        </button>
        <button
          type="button"
          onClick={() => navigate('/contact')}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Contact Our Team
        </button>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { setSeoMeta, submitContactInquiry, navigate } = useDirectory();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Partnership / Listing Update');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSeoMeta(
      'Contact Us | AIVORA AI',
      'Get in touch with the AIVORA AI editorial team for tool updates, partnerships, or press inquiries.',
      { canonicalPath: '/contact' }
    );
  }, [setSeoMeta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateContactInquiry({ name, email, message });
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setError(null);
    setSubmitting(true);
    const serverErr = await submitContactInquiry({
      name: name.trim(),
      email: email.trim(),
      topic,
      message: message.trim(),
    });
    setSubmitting(false);
    if (serverErr) {
      setError(serverErr);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Contact AIVORA AI
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Have a pricing correction, affiliate partnership question, or editorial inquiry? Reach our team directly. For Sponsored or Featured campaigns, visit our{' '}
            <button
              type="button"
              onClick={() => navigate('/advertise')}
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Promote &amp; Advertise
            </button>{' '}
            page.
          </p>

          <div className="mt-8 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Editorial Desk</p>
                <p>editorial@aivoraai.publicvm.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Location</p>
                <p>Guwahati, Assam, India-Distributed Editorial Team</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h2 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                Inquiry Recorded
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Thank you, {name}. Your message regarding &ldquo;{topic}&rdquo; has been submitted to our editorial team.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                }}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900"
            >
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Taylor"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jordan@company.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-topic" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option>Partnership / Listing Update</option>
                  <option>Pricing Snapshot Correction</option>
                  <option>Editorial / Press Inquiry</option>
                  <option>General Feedback</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our team help?"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  const { setSeoMeta } = useDirectory();

  useEffect(() => {
    setSeoMeta(
      'Privacy Policy | AIVORA AI',
      'Read how AIVORA AI handles Supabase user accounts, affiliate link redirects, analytics events, and external vendor websites.',
      { canonicalPath: '/privacy' }
    );
  }, [setSeoMeta]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        <Shield className="h-4 w-4" aria-hidden="true" />
        <span>Legal &amp; Data Practices</span>
      </div>
      <h1 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white">
        Privacy Policy
      </h1>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Effective Date: November 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            1. User Accounts &amp; Stored Preferences
          </h2>
          <p className="mt-2">
            When Supabase Authentication is enabled, your email address, profile details, saved favorite tools, and recently viewed history are stored securely in PostgreSQL protected by Row Level Security policies scoped to your user ID. Local theme and anonymous bookmarks are cached in browser storage.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            2. Outbound Clicks &amp; Aggregate Analytics
          </h2>
          <p className="mt-2">
            Clicking &ldquo;Visit Website&rdquo; logs an aggregate outbound click event (tool slug, timestamp, source page, and hashed session identifier) via <code className="font-mono">/go/:slug</code> before redirecting you to the third-party vendor website. We do not sell personal browsing histories to data brokers.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            3. Inquiries, Submissions &amp; Newsletter
          </h2>
          <p className="mt-2">
            Information submitted via contact, advertising enquiry, tool submission, and newsletter forms is restricted to authenticated platform administrators for responding to requests and curating listings.
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsPage() {
  const { setSeoMeta } = useDirectory();

  useEffect(() => {
    setSeoMeta(
      'Terms & Conditions | AIVORA AI',
      'Terms of use for browsing AIVORA AI, affiliate link disclosures, sponsored listings, and sample pricing verification.',
      { canonicalPath: '/terms' }
    );
  }, [setSeoMeta]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
        Terms &amp; Conditions
      </h1>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Effective Date: November 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            1. Directory Information &amp; Sample Pricing
          </h2>
          <p className="mt-2">
            AIVORA AI provides product summaries, feature overviews, and sample pricing snapshots for informational comparison. AI software pricing and usage quotas change frequently; always verify current pricing directly on the official vendor website prior to purchasing.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            2. Affiliate Disclosure &amp; Sponsored Listings
          </h2>
          <p className="mt-2">
            Some outbound vendor links configured by administrators may participate in partner affiliate programs, meaning AIVORA AI may earn a referral fee when visitors sign up through those links at no additional cost to the user. Featured and Sponsored placements are clearly labeled and subject to editorial review.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            3. Trademarks &amp; Community Contributions
          </h2>
          <p className="mt-2">
            All product names, logos, and trademarks belong to their respective owners. Users submitting tools or reviews agree to provide accurate, non-spam information free from misleading claims.
          </p>
        </section>
      </div>
    </div>
  );
}
