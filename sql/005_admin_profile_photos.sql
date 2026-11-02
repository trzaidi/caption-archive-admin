-- Week 7: administrators can upload, replace and remove any member's profile photo.
-- Run once in the Supabase SQL editor after 004. Member avatar policies are unchanged.
BEGIN;

-- Storage: archive superadmins may manage every object in the avatars bucket.
CREATE POLICY "archive_admin_read_avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_upload_avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_update_avatars" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (SELECT public.is_archive_superadmin()))
WITH CHECK (bucket_id = 'avatars' AND (SELECT public.is_archive_superadmin()));
CREATE POLICY "archive_admin_delete_avatars" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (SELECT public.is_archive_superadmin()));

-- Profiles: superadmins may update any profile row. The existing role-guard
-- trigger still blocks changes to is_superadmin from the API.
CREATE POLICY "archive_admin_update_profiles" ON public.profiles FOR UPDATE TO authenticated
USING ((SELECT public.is_archive_superadmin())) WITH CHECK ((SELECT public.is_archive_superadmin()));

-- Audit an administrator changing someone else's photo, in the same transaction.
CREATE OR REPLACE FUNCTION private.audit_profile_photo()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) <> NEW.id AND (SELECT public.is_archive_superadmin()) THEN
    INSERT INTO public.admin_audit_log(actor_id, action, target_table, target_id)
    VALUES ((SELECT auth.uid()),
            'profile_photo.' || CASE WHEN NEW.avatar_path IS NULL THEN 'delete' WHEN OLD.avatar_path IS NULL THEN 'create' ELSE 'update' END,
            'profiles', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_profile_photo() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS audit_profile_photo ON public.profiles;
CREATE TRIGGER audit_profile_photo AFTER UPDATE OF avatar_path, updated_at ON public.profiles
FOR EACH ROW WHEN (OLD.avatar_path IS DISTINCT FROM NEW.avatar_path OR NEW.avatar_path IS NOT NULL AND OLD.updated_at IS DISTINCT FROM NEW.updated_at)
EXECUTE FUNCTION private.audit_profile_photo();

COMMIT;
