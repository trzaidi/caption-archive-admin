BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"f56d39dc-1248-4677-9918-b9f99e396c86","role":"authenticated","app_metadata":{"provider":"google"}}',true);
DO $$
DECLARE n integer;
BEGIN
 IF public.is_archive_superadmin() THEN RAISE EXCEPTION 'Member has admin access'; END IF;
 SELECT count(*) INTO n FROM public.profiles; IF n<>1 THEN RAISE EXCEPTION 'Member can read other profiles'; END IF;
 IF EXISTS(SELECT 1 FROM public.votes WHERE user_id <> auth.uid()) THEN RAISE EXCEPTION 'Vote privacy failed'; END IF;
 BEGIN
  UPDATE public.profiles SET is_superadmin=true WHERE id=auth.uid();
  RAISE EXCEPTION 'Role update was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.profiles(id,is_superadmin) VALUES(auth.uid(),true) ON CONFLICT(id) DO NOTHING;
  RAISE EXCEPTION 'Role insert was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.profiles(id,first_name,last_name,updated_at)
 SELECT id,first_name,last_name,updated_at FROM public.profiles WHERE id=auth.uid()
 ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,updated_at=excluded.updated_at;
 UPDATE public.captions SET caption_text=caption_text WHERE id=(SELECT min(id) FROM public.captions);
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Member can update media'; END IF;
 DELETE FROM public.captions WHERE id=(SELECT min(id) FROM public.captions);
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Member can delete media'; END IF;
 BEGIN
  INSERT INTO public.captions(caption_text,image_description) VALUES('Permission test','Temporary rollback-only media');
  RAISE EXCEPTION 'Member can create admin media';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.admin_audit_log) THEN RAISE EXCEPTION 'Member can read audit'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"759b83e5-ded5-4ff2-bc96-c0595f2a38ac","role":"authenticated","app_metadata":{"provider":"google"}}',true);
DO $$
DECLARE test_id bigint; n integer;
BEGIN
 IF NOT public.is_archive_superadmin() THEN RAISE EXCEPTION 'Owner admin missing'; END IF;
 SELECT count(*) INTO n FROM public.profiles; IF n<3 THEN RAISE EXCEPTION 'Admin profile directory failed'; END IF;
 INSERT INTO public.profiles(id,first_name,last_name,updated_at)
 SELECT id,first_name,last_name,updated_at FROM public.profiles WHERE id=auth.uid()
 ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,updated_at=excluded.updated_at;
 IF NOT public.is_archive_superadmin() THEN RAISE EXCEPTION 'Profile upsert removed owner role'; END IF;
 INSERT INTO public.captions(caption_text,image_description,tone,model)
 VALUES('Rollback-only admin test','Temporary media for the permission check','Deadpan','verification') RETURNING id INTO test_id;
 IF NOT EXISTS(SELECT 1 FROM public.caption_stats WHERE caption_id=test_id) THEN RAISE EXCEPTION 'Stats initialization failed'; END IF;
 UPDATE public.captions SET caption_text='Updated rollback-only test' WHERE id=test_id;
 INSERT INTO public.votes(caption_id,value) VALUES(test_id,1);
 IF NOT EXISTS(SELECT 1 FROM public.caption_stats WHERE caption_id=test_id AND upvotes=1 AND score=1) THEN RAISE EXCEPTION 'Vote aggregation failed'; END IF;
 DELETE FROM public.captions WHERE id=test_id;
 IF EXISTS(SELECT 1 FROM public.votes WHERE caption_id=test_id) OR EXISTS(SELECT 1 FROM public.caption_stats WHERE caption_id=test_id) THEN RAISE EXCEPTION 'Cascade cleanup failed'; END IF;
 SELECT count(*) INTO n FROM public.admin_audit_log WHERE target_id=test_id::text;
 IF n<>3 THEN RAISE EXCEPTION 'Expected three atomic audit events; found %',n; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  IF EXISTS(SELECT 1 FROM public.profiles) THEN RAISE EXCEPTION 'Anonymous profile exposure'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.captions(caption_text,image_description) VALUES('anonymous','must fail');
  RAISE EXCEPTION 'Anonymous media write allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: member isolation, role insert/update rejection, member and owner profile upsert, admin media CRUD, vote aggregation, cascading delete, atomic audit and anonymous restrictions' AS verification;
