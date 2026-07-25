-- Run this in your Supabase project: SQL Editor > New query > paste > Run

-- One row per student, linked to their Supabase Auth account
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  is_teacher boolean default false,
  auto_read boolean default false,
  stripe_customer_id text,
  subscription_status text,
  subscription_tier text,
  preferred_mode text default 'free',
  created_at timestamp with time zone default now()
);

-- If you already ran this file before the teacher dashboard was added, run this
-- one line separately in the SQL Editor to add the new column to your existing table:
-- alter table profiles add column if not exists is_teacher boolean default false;
-- Then make someone a teacher via Table Editor > profiles > set is_teacher to true
-- on their row.

-- If you already ran this file before the text-to-speech "Read aloud
-- automatically" preference was added, run this one line separately in the
-- SQL Editor to add the new column to your existing table:
-- alter table profiles add column if not exists auto_read boolean default false;

-- If you already ran this file before billing/Stripe support was added, run
-- these lines separately in the SQL Editor to add the new columns to your
-- existing table. Nothing sets real values in these yet - they're just wired
-- up in the /billing page ahead of connecting Stripe:
-- alter table profiles add column if not exists stripe_customer_id text;
-- alter table profiles add column if not exists subscription_status text;
-- alter table profiles add column if not exists subscription_tier text;

-- If you already ran this file before the dashboard's Free practice / Guided
-- Path toggle was added, run this one line separately in the SQL Editor to
-- add the new column to your existing table:
-- alter table profiles add column if not exists preferred_mode text default 'free';

-- One row per question attempt, used to build the feedback reports
create table if not exists attempts (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  course text,
  board text,
  difficulty text,
  topic text not null,
  question text not null,
  student_working text not null,
  overall_score text,
  student_feedback text,
  parent_feedback text,
  marked_lines jsonb,
  points integer default 0,
  created_at timestamp with time zone default now()
);

-- If you already ran this file before the rewards feature was added, run this
-- one line separately in the SQL Editor to add the new column to your existing table:
-- alter table attempts add column if not exists points integer default 0;

-- If you already ran this file before multi-course support (GCSE Foundation,
-- GCSE Higher, A Level, Further Maths) was added, run this line separately to
-- add the new column - it's the course "key" from lib/claude.js's COURSES
-- array (e.g. 'gcse-foundation'), not the display label:
-- alter table attempts add column if not exists course text;

-- If you already ran this file before exam board and difficulty selection
-- was added, run this block separately to add the new columns. Existing rows
-- will have NULL board/difficulty; backfilling them to 'edexcel' and
-- 'exam-standard' (the defaults used before this feature existed) keeps old
-- history consistent with what students actually saw at the time:
-- alter table attempts add column if not exists board text;
-- alter table attempts add column if not exists difficulty text;
-- update attempts set board = 'edexcel' where board is null;
-- update attempts set difficulty = 'exam-standard' where difficulty is null;

-- If your database already exists (you've run this file before), don't re-run
-- the whole file - existing policies will error as "already exists". Instead,
-- just run this block on its own to add the new feedback table:
--
-- create table if not exists feedback (
--   id uuid default gen_random_uuid() primary key,
--   student_id uuid references profiles(id) on delete cascade not null,
--   message text not null,
--   created_at timestamp with time zone default now()
-- );
-- alter table feedback enable row level security;
-- create policy "Users manage their own feedback" on feedback for all using (auth.uid() = student_id);

-- General product feedback from students (not marking-related)
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamp with time zone default now()
);

-- One row per successful AI-marking API call (generate-question, mark-working,
-- hint, chat), used to enforce the daily rate limit in lib/rateLimit.js
create table if not exists api_usage (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  endpoint text not null,
  created_at timestamp with time zone default now()
);

create index if not exists api_usage_student_created_idx
  on api_usage(student_id, created_at);

-- If you already ran this file before rate limiting was added, run this
-- block on its own in the SQL Editor to add the new table:
--
-- create table if not exists api_usage (
--   id uuid default gen_random_uuid() primary key,
--   student_id uuid references profiles(id) on delete cascade not null,
--   endpoint text not null,
--   created_at timestamp with time zone default now()
-- );
-- create index if not exists api_usage_student_created_idx
--   on api_usage(student_id, created_at);
-- alter table api_usage enable row level security;
-- create policy "Users manage their own api_usage" on api_usage for all
--   using (auth.uid() = student_id);

-- One row per topic once a student finishes the /diagnostic flow. status is
-- 'solid' (2/2 standard questions correct), 'shaky' (1/2), or 'gap' (0/2).
-- The ceiling (stretch) question, if attempted, is informational only and
-- doesn't affect status.
create table if not exists diagnostic_results (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  board text not null,
  course text not null,
  topic text not null,
  standard_correct_count integer not null,
  standard_total_count integer not null,
  ceiling_attempted boolean default false,
  ceiling_correct boolean,
  status text not null,
  created_at timestamp with time zone default now()
);

create index if not exists diagnostic_results_student_board_course_idx
  on diagnostic_results(student_id, board, course);

-- If you already ran this file before the diagnostic test was added, run this
-- block on its own in the SQL Editor to add the new table:
--
-- create table if not exists diagnostic_results (
--   id uuid default gen_random_uuid() primary key,
--   student_id uuid references profiles(id) on delete cascade not null,
--   board text not null,
--   course text not null,
--   topic text not null,
--   standard_correct_count integer not null,
--   standard_total_count integer not null,
--   ceiling_attempted boolean default false,
--   ceiling_correct boolean,
--   status text not null,
--   created_at timestamp with time zone default now()
-- );
-- create index if not exists diagnostic_results_student_board_course_idx
--   on diagnostic_results(student_id, board, course);
-- alter table diagnostic_results enable row level security;
-- create policy "Users manage their own diagnostic_results" on diagnostic_results for all
--   using (auth.uid() = student_id);

-- One row per enquiry submitted from the public marketing page's "Get in
-- touch" form. Visitors aren't logged in when they submit this, so unlike
-- every other table above there's no student_id to tie rows to - RLS below
-- allows anonymous inserts but no reads (you browse these via Supabase's
-- Table Editor, which uses the service role and bypasses RLS).
create table if not exists enquiries (
  id uuid default gen_random_uuid() primary key,
  parent_name text not null,
  contact_email text not null,
  student_level text,
  message text,
  town text,
  created_at timestamp with time zone default now()
);

-- If you already ran this file before the marketing page's enquiry form was
-- added, run this block separately in the SQL Editor to add the new table:
--
-- create table if not exists enquiries (
--   id uuid default gen_random_uuid() primary key,
--   parent_name text not null,
--   contact_email text not null,
--   student_level text,
--   message text,
--   town text,
--   created_at timestamp with time zone default now()
-- );
-- alter table enquiries enable row level security;
-- create policy "Anyone can submit an enquiry" on enquiries for insert
--   with check (true);

-- If you already ran this file before the per-town landing pages were added,
-- run this line separately in the SQL Editor to add the new column to your
-- existing table:
-- alter table enquiries add column if not exists town text;

-- One row per "notify me" submission from either the global brand page's
-- "Don't see your town?" form (requested_town is free text) or a per-town
-- page's "not in this town yet" form (requested_town is the URL slug from
-- lib/towns.js). Same anonymous-insert-only shape as enquiries above.
create table if not exists town_interest (
  id uuid default gen_random_uuid() primary key,
  requested_town text not null,
  contact_email text not null,
  created_at timestamp with time zone default now()
);

-- If you already ran this file before per-town landing pages were added, run
-- this block separately in the SQL Editor to add the new table:
--
-- create table if not exists town_interest (
--   id uuid default gen_random_uuid() primary key,
--   requested_town text not null,
--   contact_email text not null,
--   created_at timestamp with time zone default now()
-- );
-- alter table town_interest enable row level security;
-- create policy "Anyone can submit town interest" on town_interest for insert
--   with check (true);

-- One row per "flag this marking" report - lets a student flag a specific
-- attempt's AI marking as looking wrong, giving Paul a systematic way to
-- review quality issues directly in the Table Editor (no review UI yet).
-- attempt_id is nullable since the insert still succeeds even if saving the
-- attempt itself failed; marking_result is a snapshot of the marking
-- response at flag time so it stays accurate even if the attempt row is
-- later changed or deleted.
create table if not exists marking_flags (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
  attempt_id uuid references attempts(id) on delete cascade,
  question text not null,
  student_working text not null,
  marking_result jsonb not null,
  student_comment text,
  created_at timestamp with time zone default now()
);

-- If you already ran this file before the "flag this marking" feature was
-- added, run this block separately in the SQL Editor to add the new table:
--
-- create table if not exists marking_flags (
--   id uuid default gen_random_uuid() primary key,
--   student_id uuid references profiles(id) on delete cascade not null,
--   attempt_id uuid references attempts(id) on delete cascade,
--   question text not null,
--   student_working text not null,
--   marking_result jsonb not null,
--   student_comment text,
--   created_at timestamp with time zone default now()
-- );
-- alter table marking_flags enable row level security;
-- create policy "Users manage their own flags" on marking_flags for all
--   using (auth.uid() = student_id);

-- One row per board+course+topic combination - a short AI-written primer
-- generated once and reused for every student who studies that topic, since
-- the content is generic (not personalised) and there's no point paying to
-- regenerate it per student. No student_id: nobody owns these rows, and
-- /api/generate-primer is the only thing that ever reads or writes this
-- table, using the service role key (see lib/supabaseAdmin.js) to bypass
-- RLS - so RLS is enabled with no policies at all, locking it out of the
-- public anon/authenticated API entirely.
create table if not exists topic_primers (
  id uuid default gen_random_uuid() primary key,
  board text not null,
  course text not null,
  topic text not null,
  content text not null,
  created_at timestamp with time zone default now()
);

create unique index if not exists topic_primers_board_course_topic_idx
  on topic_primers(board, course, topic);

-- If you already ran this file before the topic primer feature was added,
-- run this block separately in the SQL Editor to add the new table:
--
-- create table if not exists topic_primers (
--   id uuid default gen_random_uuid() primary key,
--   board text not null,
--   course text not null,
--   topic text not null,
--   content text not null,
--   created_at timestamp with time zone default now()
-- );
-- create unique index if not exists topic_primers_board_course_topic_idx
--   on topic_primers(board, course, topic);
-- alter table topic_primers enable row level security;

-- Row Level Security: students can only ever see their own data
alter table feedback enable row level security;
alter table profiles enable row level security;
alter table attempts enable row level security;
alter table api_usage enable row level security;
alter table diagnostic_results enable row level security;
alter table enquiries enable row level security;
alter table town_interest enable row level security;
alter table marking_flags enable row level security;
alter table topic_primers enable row level security;

create policy "Users manage their own feedback"
  on feedback for all
  using (auth.uid() = student_id);

create policy "Users manage their own profile"
  on profiles for all
  using (auth.uid() = id);

create policy "Users manage their own attempts"
  on attempts for all
  using (auth.uid() = student_id);

create policy "Users manage their own api_usage"
  on api_usage for all
  using (auth.uid() = student_id);

create policy "Users manage their own diagnostic_results"
  on diagnostic_results for all
  using (auth.uid() = student_id);

create policy "Users manage their own flags"
  on marking_flags for all
  using (auth.uid() = student_id);

-- No auth.uid() check here on purpose: enquiries come from logged-out
-- visitors on the marketing page, so anyone (including anonymous) can
-- insert, but there's no matching select policy, so nobody can read them
-- back through the public API.
create policy "Anyone can submit an enquiry"
  on enquiries for insert
  with check (true);

-- Same reasoning as enquiries above: anonymous visitors on the brand page or
-- a not-yet-live town page can insert, but nobody can read these back.
create policy "Anyone can submit town interest"
  on town_interest for insert
  with check (true);

-- Teachers (profile.is_teacher = true) can additionally read every student's
-- profile, attempts, and feedback, to power the /teacher dashboard.
--
-- This check has to live in a security definer function rather than an inline
-- "exists (select 1 from profiles ...)" in the policy itself - a policy on
-- profiles that queries profiles again re-triggers the same policy and Postgres
-- errors with "infinite recursion detected in policy for relation profiles".
-- security definer runs with the function owner's privileges, bypassing RLS
-- inside the function body, which breaks the loop.
create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(is_teacher, false) from profiles where id = auth.uid();
$$;

create policy "Teachers can view all profiles"
  on profiles for select
  using (public.is_teacher());

create policy "Teachers can view all attempts"
  on attempts for select
  using (public.is_teacher());

create policy "Teachers can view all feedback"
  on feedback for select
  using (public.is_teacher());

-- If you already ran this file before the teacher dashboard was added, run just
-- this block on its own in the SQL Editor to add teacher read access. If you
-- already ran an earlier version of this migration that used the recursive
-- "exists (select 1 from profiles ...)" form, drop those policies first:
--
-- drop policy if exists "Teachers can view all profiles" on profiles;
-- drop policy if exists "Teachers can view all attempts" on attempts;
-- drop policy if exists "Teachers can view all feedback" on feedback;
--
-- create or replace function public.is_teacher()
-- returns boolean
-- language sql
-- security definer
-- set search_path = public
-- stable
-- as $$
--   select coalesce(is_teacher, false) from profiles where id = auth.uid();
-- $$;
--
-- create policy "Teachers can view all profiles" on profiles for select
--   using (public.is_teacher());
-- create policy "Teachers can view all attempts" on attempts for select
--   using (public.is_teacher());
-- create policy "Teachers can view all feedback" on feedback for select
--   using (public.is_teacher());

-- Automatically create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
