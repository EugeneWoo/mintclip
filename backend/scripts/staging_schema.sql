-- Mintclip staging database schema (mirrors production as of 2026-11-12).
-- Generated from the production project via the Supabase Management API.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  summaries_used_this_month integer NOT NULL DEFAULT 0,
  chat_messages_used_this_month integer NOT NULL DEFAULT 0,
  quota_reset_date timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 mon'),
  stripe_customer_id text,
  privacy_policy_accepted_at timestamptz,
  terms_accepted_at timestamptz,
  marketing_consent boolean NOT NULL DEFAULT false,
  marketing_consent_at timestamptz,
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  country_code char(2),
  signup_ip_country char(2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_quota_reset ON public.users (quota_reset_date);
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled ON public.users (deletion_scheduled_for) WHERE deletion_scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ── saved_items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id text NOT NULL,
  item_type text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  source text,
  format text,
  CONSTRAINT saved_items_item_type_check CHECK (item_type = ANY (ARRAY['chat','summary','transcript','summary_short','summary_topic','summary_qa','batch','batch_transcript','batch_summary'])),
  CONSTRAINT saved_items_source_check CHECK (source = ANY (ARRAY['extension','upload','batch'])),
  CONSTRAINT saved_items_user_id_video_id_item_type_format_key UNIQUE (user_id, video_id, item_type, format)
);
CREATE INDEX IF NOT EXISTS idx_saved_items_expires_at ON public.saved_items (expires_at);
CREATE INDEX IF NOT EXISTS idx_saved_items_source ON public.saved_items (source);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_video ON public.saved_items (user_id, video_id);

-- ── highlights ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  selected_text text NOT NULL,
  source_type text NOT NULL,
  segment_index integer,
  char_start integer NOT NULL,
  char_end integer NOT NULL,
  summary_format text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT highlights_source_type_check CHECK (source_type = ANY (ARRAY['transcript','summary']))
);
CREATE INDEX IF NOT EXISTS idx_highlights_user_video ON public.highlights (user_id, video_id);

-- ── row level security ──────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access" ON public.users;
CREATE POLICY "Service role has full access" ON public.users FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users see own items" ON public.saved_items;
CREATE POLICY "Users see own items" ON public.saved_items FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own highlights" ON public.highlights;
CREATE POLICY "Users manage own highlights" ON public.highlights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── functions ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url, privacy_policy_accepted_at, terms_accepted_at)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.raw_user_meta_data->>'privacy_accepted' = 'true' THEN NOW() ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN NOW() ELSE NULL END
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_quota(user_id uuid, column_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF column_name = 'summaries_used_this_month' THEN
    UPDATE public.users SET summaries_used_this_month = summaries_used_this_month + 1 WHERE id = user_id;
  ELSIF column_name = 'chat_messages_used_this_month' THEN
    UPDATE public.users SET chat_messages_used_this_month = chat_messages_used_this_month + 1 WHERE id = user_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.reset_monthly_quotas() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE affected_rows INTEGER;
BEGIN
  UPDATE public.users SET summaries_used_this_month = 0, chat_messages_used_this_month = 0,
    quota_reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  WHERE quota_reset_date <= NOW();
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END; $$;

CREATE OR REPLACE FUNCTION public.request_account_deletion(user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users SET deletion_requested_at = NOW(), deletion_scheduled_for = NOW() + INTERVAL '30 days'
  WHERE id = user_id AND deletion_requested_at IS NULL;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users SET deletion_requested_at = NULL, deletion_scheduled_for = NULL
  WHERE id = user_id AND deletion_requested_at IS NOT NULL;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.process_scheduled_deletions() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE affected_rows INTEGER;
BEGIN
  DELETE FROM auth.users WHERE id IN (
    SELECT id FROM public.users WHERE deletion_scheduled_for IS NOT NULL AND deletion_scheduled_for <= NOW());
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END; $$;

-- ── auth trigger: create a public.users row for every auth signup ───────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── realtime: dashboard live-sync listens to saved_items ────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
