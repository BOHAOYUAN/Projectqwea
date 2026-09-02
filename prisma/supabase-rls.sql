-- Apply after `npx prisma db push` in the Supabase SQL Editor (or with a
-- privileged migration connection). The application reads public pages and
-- dashboard data through server-side Prisma DTOs, not direct browser queries.
--
-- This deliberately denies PostgREST anon/authenticated access to raw tenant
-- tables. If direct client access is introduced later, add narrowly-scoped
-- policies or a dedicated public view rather than broad table SELECT grants.

begin;

alter table if exists public.app_users enable row level security;
alter table if exists public.merchants enable row level security;
alter table if exists public.memberships enable row level security;
alter table if exists public.locations enable row level security;
alter table if exists public.services enable row level security;
alter table if exists public.platform_links enable row level security;
alter table if exists public.public_page_configs enable row level security;
alter table if exists public.content_preferences enable row level security;
alter table if exists public.generation_metrics enable row level security;
alter table if exists public.managed_reviews enable row level security;
alter table if exists public.review_reply_drafts enable row level security;

revoke all on table public.app_users from anon, authenticated;
revoke all on table public.merchants from anon, authenticated;
revoke all on table public.memberships from anon, authenticated;
revoke all on table public.locations from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.platform_links from anon, authenticated;
revoke all on table public.public_page_configs from anon, authenticated;
revoke all on table public.content_preferences from anon, authenticated;
revoke all on table public.generation_metrics from anon, authenticated;
revoke all on table public.managed_reviews from anon, authenticated;
revoke all on table public.review_reply_drafts from anon, authenticated;

commit;
