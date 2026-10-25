BEGIN;
-- Trigger guards allow normal profile UPSERTs without exposing role assignment.
CREATE OR REPLACE FUNCTION private.protect_archive_role()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' AND NEW.is_superadmin IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'Administrator roles must be assigned through the database' USING ERRCODE='42501';
    ELSIF TG_OP = 'UPDATE' AND NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin THEN
      RAISE EXCEPTION 'Administrator roles must be assigned through the database' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.protect_archive_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_archive_role ON public.profiles;
CREATE TRIGGER protect_archive_role BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_archive_role();
GRANT UPDATE ON public.profiles TO authenticated;
GRANT SELECT,UPDATE,DELETE ON public.captions TO authenticated;
REVOKE INSERT ON public.captions FROM authenticated;
GRANT INSERT(caption_text,image_description,prompt,model,tone,generation_id,image_path,image_prompt) ON public.captions TO authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated, anon;
REVOKE ALL ON public.admin_audit_log FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.admin_audit_log FROM authenticated;

-- The audit write shares the media mutation's transaction. An audit failure
-- rolls back the mutation, rather than leaving an unrecorded change.
CREATE OR REPLACE FUNCTION private.audit_archive_media()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target text;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND (SELECT public.is_archive_superadmin()) THEN
    IF TG_OP='DELETE' THEN target := OLD.id::text; ELSE target := NEW.id::text; END IF;
    INSERT INTO public.admin_audit_log(actor_id,action,target_table,target_id)
    VALUES ((SELECT auth.uid()), 'caption.' || CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END, 'captions', target);
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_archive_media() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS audit_archive_media ON public.captions;
CREATE TRIGGER audit_archive_media AFTER INSERT OR UPDATE OR DELETE ON public.captions
FOR EACH ROW EXECUTE FUNCTION private.audit_archive_media();
COMMIT;
