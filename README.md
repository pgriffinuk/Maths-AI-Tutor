# Foundation Maths — Setup Guide

This is a real, deployable web app: students log in, get AI-generated Foundation-tier
questions, submit working, get it marked like real marked homework, and every attempt
is saved so you can build progress reports later. You'll manage your own hosting,
accounts, and billing — this guide walks through all of it, even if you've never
deployed anything before.

You'll need three free accounts: **GitHub**, **Supabase**, and **Vercel**. Total
setup time: roughly 30–45 minutes.

## 1. Get an Anthropic API key

1. Go to https://console.anthropic.com and sign up / log in.
2. Go to **Settings > API Keys** and create a new key.
3. Copy it somewhere safe — you'll paste it into Vercel later, and you won't be able
   to see it again after you close the page.
4. Note: this is billed separately from any Claude.ai subscription, based on usage.
   Add a small amount of credit under **Settings > Billing** to start.

## 2. Set up the database (Supabase)

1. Go to https://supabase.com, sign up, and create a new project (pick any name and
   a strong database password — save that password somewhere).
2. Once it's created, go to the **SQL Editor** tab, click **New query**, paste in
   the entire contents of `supabase/schema.sql` from this project, and click **Run**.
   This creates the tables that store student accounts and their attempt history.
3. Go to **Settings > API**. You'll need three values from this page in a moment:
   the **Project URL**, the **anon public** key, and the **service_role** secret
   key (further down the same page, under a "Reveal" click - keep this one
   private, it bypasses all the database's access rules).
4. Go to **Authentication > Providers** and confirm Email is enabled (it is by
   default). Optionally, under **Authentication > Settings**, you can turn off
   "Confirm email" while testing, so signups work instantly without an email step.
5. Go to **Authentication > URL Configuration**. Set **Site URL** to your live
   Vercel address (e.g. `https://your-project.vercel.app`), and add that same
   address under **Redirect URLs** too. This is what makes both the signup
   confirmation link and the "forgot password" reset link land back on your
   actual site instead of failing.

## 3. Put the code on GitHub

1. Create a free GitHub account if you don't have one: https://github.com
2. Create a new empty repository (e.g. `maths-tutor-app`).
3. Upload this entire project folder to it. The easiest way as a beginner: install
   [GitHub Desktop](https://desktop.github.com), open it, choose "Add local
   repository", pick this folder, and click "Publish repository".

## 4. Deploy on Vercel

1. Go to https://vercel.com and sign up using your GitHub account (this makes the
   next step automatic).
2. Click **Add New > Project**, and select the `maths-tutor-app` repository you
   just created.
3. Before clicking Deploy, open **Environment Variables** and add four:
   - `ANTHROPIC_API_KEY` → the key from step 1
   - `NEXT_PUBLIC_SUPABASE_URL` → the Project URL from step 2
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon public key from step 2
   - `SUPABASE_SERVICE_ROLE_KEY` → the service_role secret key from step 2
     (used server-side only, e.g. to cache topic primers - never exposed to
     the browser)
4. Click **Deploy**. After a minute or two, Vercel gives you a live web address
   (something like `maths-tutor-app.vercel.app`) — that's your site.

## 5. Try it

Visit your new Vercel address, sign up as a test student, pick a topic, generate a
question, write some working, and get it marked. Every attempt is now saved in
Supabase under the `attempts` table, which you can browse directly in Supabase's
**Table Editor** any time.

## Everyday use

- To make changes later: edit files, push to GitHub (GitHub Desktop again), and
  Vercel redeploys automatically within a minute — no extra steps.
- To see what students have done: Supabase **Table Editor > attempts**.
- To check API spend: Anthropic Console **Settings > Billing**.

## What's deliberately left for later (Stage 2+)

- A teacher-facing view that summarises *all* students' progress in one place,
  not just per-student
- Nicer aggregate reports (e.g. weekly PDF/email summary rather than reading the
  raw table)
- A proper custom domain instead of the vercel.app address (Vercel supports this
  free — Settings > Domains — once you own one)
- Payments/subscriptions, needed before selling this to students outside your
  own class

Happy to build any of these next — just say which one.
