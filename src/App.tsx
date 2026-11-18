import { AuthPreviewModal } from './components/AuthPreviewModal';
import { CompareTrayAndModal } from './components/CompareTrayAndModal';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { SubmitToolModal } from './components/SubmitToolModal';
import { ToastContainer } from './components/ToastContainer';
import { DirectoryProvider, useDirectory } from './context/DirectoryContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { BlogArticlePage } from './pages/BlogArticlePage';
import { BlogPage } from './pages/BlogPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { PromoteAdvertisePage } from './pages/PromoteAdvertisePage';
import {
  AboutPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
} from './pages/StaticPages';
import { ToolDetailPage } from './pages/ToolDetailPage';
import { UserDashboardPage } from './pages/UserDashboardPage';

function AppRouter() {
  const { currentPath, navigate } = useDirectory();

  if (currentPath === '/') {
    return <HomePage />;
  }
  if (currentPath === '/explore') {
    return <ExplorePage />;
  }
  if (currentPath === '/categories') {
    return <CategoriesPage />;
  }
  if (currentPath.startsWith('/tool/')) {
    const slug = decodeURIComponent(currentPath.slice('/tool/'.length));
    return <ToolDetailPage slug={slug} />;
  }
  if (currentPath === '/blog') {
    return <BlogPage />;
  }
  if (currentPath.startsWith('/blog/')) {
    const slug = decodeURIComponent(currentPath.slice('/blog/'.length));
    return <BlogArticlePage slug={slug} />;
  }
  if (currentPath === '/dashboard') {
    return <UserDashboardPage />;
  }
  if (currentPath === '/advertise' || currentPath === '/promote') {
    return <PromoteAdvertisePage />;
  }
  if (currentPath === '/admin' || currentPath === '/admin/tools') {
    return (
      <AdminDashboardPage
        initialTab={currentPath === '/admin/tools' ? 'tools' : undefined}
      />
    );
  }
  if (currentPath === '/about') {
    return <AboutPage />;
  }
  if (currentPath === '/contact') {
    return <ContactPage />;
  }
  if (currentPath === '/privacy') {
    return <PrivacyPage />;
  }
  if (currentPath === '/terms') {
    return <TermsPage />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        The route <code className="font-mono">{currentPath}</code> does not exist in AIVORA AI.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Go to Homepage
        </button>
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          Explore AI Tools
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const { compareIds } = useDirectory();
  return (
    <div
      className={`flex min-h-screen flex-col bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 ${
        compareIds.length > 0 ? 'pb-20 sm:pb-16' : ''
      }`}
    >
      <Navbar />
      <main className="flex-1">
        <AppRouter />
      </main>
      <Footer />
      <CompareTrayAndModal />
      <AuthPreviewModal />
      <SubmitToolModal />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <DirectoryProvider>
      <AppShell />
    </DirectoryProvider>
  );
}
