-- Run this in your Supabase project: SQL Editor > New query > paste > Run

-- One row per student, linked to their Supabase Auth account
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  created_at timestamp with time zone default now()
);

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
  created_at timestamp with time zone default now()
);

-- Row Level Security: students can only ever see their own data
alter table profiles enable row level security;
alter table attempts enable row level security;

create policy "Users manage their own profile"
  on profiles for all
  using (auth.uid() = id);

create policy "Users manage their own attempts"
  on attempts for all
  using (auth.uid() = student_id);

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
