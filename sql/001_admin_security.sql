-- RUN IN THE EXISTING CAPTION ARCHIVE SUPABASE PROJECT.
-- Bootstrap your own user ONLY via SQL Editor after verifying auth.users.id.
-- This migration adds RLS-protected superadmin access to existing data.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL,
 target_table text NOT NULL,
 target_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Safeguard: the function executes with the table owner's rights but exposes ONLY a boolean.
-- Owner must be postgres; no user-controlled SQL or role changes.
CREATE OR REPLACE FUNCTION public.is_archive_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$ SELECT EXISTS (
 SELECT 1 FROM public.profiles p
 WHERE p.id = (SELECT auth.uid()) AND p.is_superadmin IS TRUE
 AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id=p.id AND u.raw_app_meta_data->>'provider'='google')
) $$;
REVOKE ALL ON FUNCTION public.is_archive_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_archive_superadmin() TO authenticated;

-- Permissive admin policies add administrator access alongside existing member policies.
-- Existing profile policies must still allow their ordinary owner operations.
CREATE POLICY "archive_admin_read_profiles" ON public.profiles FOR SELECT TO authenticated
USING ((SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_read_captions" ON public.captions FOR SELECT TO authenticated
USING ((SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_insert_captions" ON public.captions FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_update_captions" ON public.captions FOR UPDATE TO authenticated
USING ((SELECT public.is_archive_superadmin())) WITH CHECK ((SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_delete_captions" ON public.captions FOR DELETE TO authenticated
USING ((SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_read_votes" ON public.votes FOR SELECT TO authenticated
USING ((SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_read_audit" ON public.admin_audit_log FOR SELECT TO authenticated
USING ((SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_write_audit" ON public.admin_audit_log FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_archive_superadmin()) AND actor_id=(SELECT auth.uid()));

-- SECURITY: existing policies governing UPDATE of profiles must not permit
-- members to assign themselves is_superadmin. Column privileges below prevent
-- a client with authenticated role from setting it directly via PostgREST.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (first_name, last_name, avatar_path, updated_at)
ON public.profiles TO authenticated;
-- Existing profile onboarding uses UPSERT. Keeping INSERT permission preserves it;
-- sql/002_role_guard_and_atomic_audit.sql adds a trigger guarding the role flag.

-- The authenticated role has no table-wide UPDATE permission after the revoke above.
-- Only editable profile columns can be modified through ordinary authenticated requests.
-- Admin role assignments are performed by database administrators in SQL Editor.
