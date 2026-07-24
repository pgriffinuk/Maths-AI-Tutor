-- Run this in your Supabase project: SQL Editor > New query > paste > Run

-- One row per student, linked to their Supabase Auth account
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  is_teacher boolean default false,
  created_at timestamp with time zone default now()
);

-- If you already ran this file before the teacher dashboard was added, run this
-- one line separately in the SQL Editor to add the new column to your existing table:
-- alter table profiles add column if not exists is_teacher boolean default false;
-- Then make someone a teacher via Table Editor > profiles > set is_teacher to true
-- on their row.

-- One row per question attempt, used to build the feedback reports
create table if not exists attempts (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id) on delete cascade not null,
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

-- Row Level Security: students can only ever see their own data
alter table feedback enable row level security;
alter table profiles enable row level security;
alter table attempts enable row level security;
alter table api_usage enable row level security;

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
