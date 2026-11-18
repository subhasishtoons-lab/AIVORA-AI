-- AIVORA AI — Complete Supabase PostgreSQL Schema & Row Level Security Policies
-- Run this migration in your Supabase SQL Editor before enabling production auth & database sync.

create extension if not exists pgcrypto;

-- 1. User Profiles (synced with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  avatar_url text,
  company text default '',
  bio text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'User'), '@', 1)),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Idempotent backfill for existing auth.users who registered before schema.sql ran.
-- Strictly assigns standard 'user' role; never assigns 'admin' automatically.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    u.raw_user_meta_data->>'full_name',
    split_part(coalesce(u.email, 'User'), '@', 1)
  ),
  'user'
from auth.users u
on conflict (id) do nothing;

-- Prevent non-admins from escalating their own role
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators may modify user roles.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- Helper for RLS admin checks
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_role_escalation();

-- 2. Categories
create table if not exists public.categories (
  id text primary key,
  slug text unique not null,
  name text unique not null,
  description text not null,
  icon_key text not null default 'Layers',
  accent_color text not null default '#4F46E5',
  created_at timestamptz not null default now()
);

-- 3. AI Tools (includes affiliate management & premium listing controls)
create table if not exists public.ai_tools (
  id text primary key,
  slug text unique not null,
  name text not null,
  tagline text not null,
  short_description text not null,
  description text not null,
  category text not null,
  pricing text not null check (pricing in ('Free', 'Freemium', 'Paid')),
  pricing_summary text not null default '',
  pricing_tiers jsonb not null default '[]'::jsonb,
  pricing_snapshot_date text not null default '',
  website_url text not null,
  affiliate_url text,
  affiliate_program text,
  affiliate_tracking_id text,
  listing_tier text not null default 'Free' check (listing_tier in ('Free', 'Featured', 'Sponsored')),
  sponsor_tagline text,
  campaign_start date,
  campaign_end date,
  campaign_duration_days integer,
  sponsor_status text not null default 'none' check (sponsor_status in ('none', 'pending', 'approved', 'rejected')),
  logo_color text not null default '#4F46E5',
  logo_text_color text,
  logo_key text not null default '',
  logo_url text,
  features jsonb not null default '[]'::jsonb,
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  best_use_cases jsonb not null default '[]'::jsonb,
  rating numeric(3, 2) not null default 4.5,
  review_count integer not null default 0,
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  status text not null default 'published' check (status in ('published', 'draft')),
  added_at text not null,
  tags jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Idempotent migration for existing ai_tools installations
alter table public.ai_tools
  add column if not exists status text not null default 'published';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_tools_status_check'
  ) then
    alter table public.ai_tools
      add constraint ai_tools_status_check check (status in ('published', 'draft'));
  end if;
end $$;

-- 4. Saved Favorites (per authenticated user)
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_id text not null references public.ai_tools (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

-- 5. Recently Viewed Tools (per authenticated user)
create table if not exists public.recently_viewed (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_id text not null references public.ai_tools (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

-- 6. Affiliate Outbound Clicks
create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null,
  tool_slug text not null,
  tool_name text not null,
  affiliate_program text,
  affiliate_tracking_id text,
  target_url text not null,
  is_affiliate boolean not null default false,
  source_page text not null default 'directory',
  referrer text,
  user_id uuid references auth.users (id) on delete set null,
  session_hash text,
  clicked_at timestamptz not null default now()
);
create index if not exists idx_affiliate_clicks_tool on public.affiliate_clicks (tool_slug, clicked_at desc);

-- 7. Sponsored & Premium Listing Requests (requires Admin approval before publishing)
create table if not exists public.sponsored_listings (
  id text primary key,
  tool_name text not null,
  tool_slug text,
  website_url text not null,
  category text not null,
  pricing text not null check (pricing in ('Free', 'Freemium', 'Paid')),
  short_description text not null,
  listing_tier text not null check (listing_tier in ('Free', 'Featured', 'Sponsored')),
  campaign_duration_days integer not null default 30,
  campaign_start date,
  campaign_end date,
  company_name text not null default '',
  contact_email text not null,
  billing_status text not null default 'admin_managed',
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 8. Blog Posts (with editable SEO fields)
create table if not exists public.blog_posts (
  id text primary key,
  slug text unique not null,
  title text not null,
  excerpt text not null,
  category text not null check (category in (
    'AI Tool Reviews',
    'Best AI Tools Lists',
    'AI Tutorials',
    'Latest AI News',
    'AI Tool Comparisons',
    'Beginner Guides'
  )),
  author text not null,
  author_role text not null,
  published_at text not null,
  read_time_minutes integer not null default 5,
  cover_image text not null default '',
  related_tool_slugs jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  canonical_url text,
  focus_keyword text,
  updated_at timestamptz not null default now()
);

-- 9. Tool Reviews
create table if not exists public.reviews (
  id text primary key,
  tool_id text not null references public.ai_tools (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author text not null,
  role text not null default 'Community Reviewer',
  rating integer not null check (rating between 1 and 5),
  title text not null,
  comment text not null,
  created_at text not null
);

-- 10. Newsletter Subscribers
create table if not exists public.newsletter_subscribers (
  id text primary key,
  email text unique not null,
  subscribed_at text not null
);

-- 11. Community Tool Submissions
create table if not exists public.tool_submissions (
  id text primary key,
  name text not null,
  website_url text not null,
  category text not null,
  pricing text not null check (pricing in ('Free', 'Freemium', 'Paid')),
  short_description text not null,
  submitter_email text not null,
  requested_tier text not null default 'Free' check (requested_tier in ('Free', 'Featured', 'Sponsored')),
  campaign_duration_days integer,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at text not null
);

-- 12. Contact Inquiries
create table if not exists public.contact_inquiries (
  id text primary key,
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  created_at timestamptz not null default now()
);

-- 13. Business Advertising Inquiries
create table if not exists public.advertising_inquiries (
  id text primary key,
  company_name text not null,
  contact_name text not null,
  email text not null,
  website_url text not null,
  requested_tier text not null check (requested_tier in ('Featured', 'Sponsored', 'Custom Bundle')),
  campaign_duration_days integer not null default 30,
  monthly_budget text not null default '',
  goals text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'archived')),
  created_at timestamptz not null default now()
);

-- 14. Analytics Events (real recorded telemetry only)
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'page_view',
    'tool_view',
    'search',
    'affiliate_click',
    'user_signup',
    'newsletter_signup'
  )),
  path text,
  tool_id text,
  tool_slug text,
  category text,
  keyword text,
  session_hash text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_analytics_events_type_created on public.analytics_events (event_type, created_at desc);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.ai_tools enable row level security;
alter table public.favorites enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.sponsored_listings enable row level security;
alter table public.blog_posts enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.tool_submissions enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.advertising_inquiries enable row level security;
alter table public.analytics_events enable row level security;

-- Profiles: users read/update only their own profile; admins manage all profiles
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Public Read Catalog Tables (AI tools, Categories, Blog Posts, Reviews)
create policy "Public read categories" on public.categories for select using (true);
create policy "Admin write categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read tools" on public.ai_tools;
create policy "Public read tools" on public.ai_tools
  for select using (status = 'published' or public.is_admin());
drop policy if exists "Admin write tools" on public.ai_tools;
create policy "Admin write tools" on public.ai_tools
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public read blog posts" on public.blog_posts for select using (true);
create policy "Admin write blog posts" on public.blog_posts for all using (public.is_admin()) with check (public.is_admin());

create policy "Public read reviews" on public.reviews for select using (true);
create policy "Authenticated create review" on public.reviews
  for insert with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));
create policy "Admin manage reviews" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- Favorites & Recently Viewed: strictly private per user
create policy "Users manage own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own recently viewed" on public.recently_viewed
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private monetization, subscribers, submissions, inquiries, and analytics
create policy "Insert affiliate clicks" on public.affiliate_clicks
  for insert with check (char_length(tool_slug) > 0 and char_length(target_url) > 0);
create policy "Admin read affiliate clicks" on public.affiliate_clicks
  for select using (public.is_admin());

create policy "Insert analytics events" on public.analytics_events
  for insert with check (char_length(session_hash) > 0);
create policy "Admin read analytics events" on public.analytics_events
  for select using (public.is_admin());

create policy "Public submit sponsored listing request" on public.sponsored_listings
  for insert with check (approval_status = 'pending' and char_length(contact_email) > 3);
create policy "Users read own sponsored requests or admin" on public.sponsored_listings
  for select using (auth.uid() = submitted_by or public.is_admin());
create policy "Admin manage sponsored listings" on public.sponsored_listings
  for update using (public.is_admin()) with check (public.is_admin());
create policy "Admin delete sponsored listings" on public.sponsored_listings
  for delete using (public.is_admin());

create policy "Public submit tool" on public.tool_submissions
  for insert with check (status = 'pending' and char_length(submitter_email) > 3);
create policy "Admin manage submissions" on public.tool_submissions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public subscribe newsletter" on public.newsletter_subscribers
  for insert with check (position('@' in email) > 1);
create policy "Admin manage newsletter" on public.newsletter_subscribers
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public submit contact inquiry" on public.contact_inquiries
  for insert with check (char_length(message) >= 10 and position('@' in email) > 1);
create policy "Admin manage contact inquiries" on public.contact_inquiries
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public submit advertising inquiry" on public.advertising_inquiries
  for insert with check (char_length(goals) >= 10 and position('@' in email) > 1);
create policy "Admin manage advertising inquiries" on public.advertising_inquiries
  for all using (public.is_admin()) with check (public.is_admin());
