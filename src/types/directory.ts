export type PricingModel = 'Free' | 'Freemium' | 'Paid';

export type PublicationStatus = 'published' | 'draft';

export type ListingTier = 'Free' | 'Featured' | 'Sponsored';

export type SponsorApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type SortOption =
  | 'featured'
  | 'rating'
  | 'reviews'
  | 'newest'
  | 'name';

export type BlogCategory =
  | 'AI Tool Reviews'
  | 'Best AI Tools Lists'
  | 'AI Tutorials'
  | 'Latest AI News'
  | 'AI Tool Comparisons'
  | 'Beginner Guides';

export const ALL_BLOG_CATEGORIES: BlogCategory[] = [
  'AI Tool Reviews',
  'Best AI Tools Lists',
  'AI Tutorials',
  'Latest AI News',
  'AI Tool Comparisons',
  'Beginner Guides',
];

export interface PricingTier {
  plan: string;
  price: string;
  details: string;
}

export interface AITool {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  description: string;
  category: string;
  pricing: PricingModel;
  pricingSummary: string;
  pricingTiers: PricingTier[];
  pricingSnapshotDate: string;
  websiteUrl: string;
  // Affiliate fields — never invented; only populated when explicitly configured by Admin
  affiliateUrl?: string;
  affiliateProgram?: string;
  affiliateTrackingId?: string;
  // Premium & Sponsored placement fields
  listingTier?: ListingTier;
  sponsorTagline?: string;
  campaignStart?: string;
  campaignEnd?: string;
  campaignDurationDays?: number;
  sponsorStatus?: SponsorApprovalStatus;
  logoColor: string;
  logoTextColor?: string;
  logoKey: string;
  logoUrl?: string;
  features: string[];
  pros: string[];
  cons: string[];
  bestUseCases: string[];
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isTrending: boolean;
  status?: PublicationStatus;
  addedAt: string;
  tags: string[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconKey: string;
  accentColor: string;
}

export interface ToolReview {
  id: string;
  toolId: string;
  userId?: string;
  author: string;
  role: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

export interface ToolSubmission {
  id: string;
  name: string;
  websiteUrl: string;
  category: string;
  pricing: PricingModel;
  shortDescription: string;
  submitterEmail: string;
  requestedTier?: ListingTier;
  campaignDurationDays?: number;
  companyName?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  author: string;
  authorRole: string;
  publishedAt: string;
  readTimeMinutes: number;
  coverImage: string;
  coverKey?: 'comparison' | 'coding' | 'visuals' | 'about';
  relatedToolSlugs: string[];
  sections: BlogSection[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  focusKeyword?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  company?: string;
  bio?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AffiliateClickRecord {
  id: string;
  toolId: string;
  toolSlug: string;
  toolName: string;
  affiliateProgram?: string;
  affiliateTrackingId?: string;
  targetUrl: string;
  isAffiliate: boolean;
  sourcePage: string;
  referrer?: string;
  clickedAt: string;
}

export interface SponsoredListingRequest {
  id: string;
  toolName: string;
  toolSlug?: string;
  websiteUrl: string;
  category: string;
  pricing: PricingModel;
  shortDescription: string;
  listingTier: ListingTier;
  campaignDurationDays: number;
  campaignStart?: string;
  campaignEnd?: string;
  companyName: string;
  contactEmail: string;
  billingStatus: 'admin_managed' | 'manual_review_pending' | 'invoiced';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: 'new' | 'reviewed' | 'archived';
  createdAt: string;
}

export interface AdvertisingInquiry {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  websiteUrl: string;
  requestedTier: 'Featured' | 'Sponsored' | 'Custom Bundle';
  campaignDurationDays: number;
  monthlyBudget: string;
  goals: string;
  status: 'new' | 'contacted' | 'archived';
  createdAt: string;
}

export type AnalyticsEventType =
  | 'page_view'
  | 'tool_view'
  | 'search'
  | 'affiliate_click'
  | 'user_signup'
  | 'newsletter_signup';

export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  path?: string;
  toolId?: string;
  toolSlug?: string;
  category?: string;
  keyword?: string;
  sessionHash: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalVisitors: number;
  totalPageViews: number;
  totalToolViews: number;
  totalAffiliateClicks: number;
  totalSearches: number;
  newUserRegistrations: number;
  newsletterSubscriptions: number;
  mostViewedTools: Array<{ toolSlug: string; toolName: string; category: string; views: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  popularCategories: Array<{ category: string; views: number }>;
  affiliateClicksByTool: Array<{
    toolSlug: string;
    toolName: string;
    clicks: number;
    affiliateProgram?: string;
  }>;
  recentClicks: AffiliateClickRecord[];
}

export interface IntegrationConfigStatus {
  supabaseClientConfigured: boolean;
  supabaseSchemaReady?: boolean;
  supabaseStatusMessage?: string;
  siteUrl: string;
}

export type PricingFilter = 'All' | PricingModel | 'Free & Freemium';

export interface FilterCriteria {
  query: string;
  category: string;
  pricing: PricingFilter;
  sortBy: SortOption;
  favoritesOnly?: boolean;
  favoriteIds?: string[];
}

export interface DirectoryRepository {
  getTools(): Promise<AITool[]>;
  saveTools(tools: AITool[]): Promise<void>;
  getCategories(): Promise<CategoryInfo[]>;
  saveCategories(categories: CategoryInfo[]): Promise<void>;
  getBlogPosts(): Promise<BlogPost[]>;
  saveBlogPosts(posts: BlogPost[]): Promise<void>;
  getReviews(): Promise<ToolReview[]>;
  addReview(review: ToolReview): Promise<ToolReview[]>;
  getFavorites(userId?: string): Promise<string[]>;
  saveFavorites(ids: string[], userId?: string): Promise<void>;
  getRecentlyViewed(userId?: string): Promise<string[]>;
  saveRecentlyViewed(ids: string[], userId?: string): Promise<void>;
  getSubmissions(): Promise<ToolSubmission[]>;
  saveSubmissions(submissions: ToolSubmission[]): Promise<void>;
  getSubscribers(): Promise<NewsletterSubscriber[]>;
  addSubscriber(subscriber: NewsletterSubscriber): Promise<NewsletterSubscriber[]>;
  resetDemoData(): Promise<void>;
}
