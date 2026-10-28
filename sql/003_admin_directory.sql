-- Lets administrators see account emails alongside profiles.
-- auth.users is not exposed to the publishable key, so this definer function
-- returns only id and email, and only to callers who pass the superadmin check.
CREATE OR REPLACE FUNCTION public.archive_admin_directory()
RETURNS TABLE(id uuid, email text) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
  IF NOT (SELECT public.is_archive_superadmin()) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT u.id, u.email::text FROM auth.users u;
END $$;
REVOKE ALL ON FUNCTION public.archive_admin_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_admin_directory() TO authenticated;
