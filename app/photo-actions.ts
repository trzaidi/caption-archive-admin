'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_TYPES, TYPE_MESSAGE, sizeMessage, photoPath } from '@/lib/photos';
import type { ActionState } from '@/app/actions';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function done(userId: string, status: string): never {
  revalidatePath('/profile-photos'); revalidatePath('/users'); revalidatePath('/');
  redirect(`/profile-photos?status=${status}#member-${userId}`);
}

// Same bucket, path and file rules the rating app uses for member uploads.
export async function uploadProfilePhoto(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const userId = String(form.get('user_id') ?? '');
  const file = form.get('photo');
  if (!UUID.test(userId)) return { error: 'Invalid member.' };
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose an image to upload.' };
  if (!PHOTO_TYPES.includes(file.type)) return { error: TYPE_MESSAGE };
  if (file.size > PHOTO_MAX_BYTES) return { error: sizeMessage(file.size) };
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,avatar_path').eq('id', userId).maybeSingle();
  if (profileError || !profile) return { error: 'This member no longer exists.' };
  const path = photoPath(userId);
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (uploadError) return { error: 'The image could not be uploaded. Check that sql/005_admin_profile_photos.sql has been applied.' };
  // updated_at changes the public URL, so both apps show the new image right away.
  const { error } = await supabase.from('profiles').update({ avatar_path: path, updated_at: new Date().toISOString() }).eq('id', userId).select('id').single();
  if (error) return { error: 'The image was uploaded but the profile could not be updated. Please try again.' };
  done(userId, profile.avatar_path ? 'replaced' : 'uploaded');
}

export async function deleteProfilePhoto(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const userId = String(form.get('user_id') ?? '');
  if (!UUID.test(userId)) return { error: 'Invalid member.' };
  const { data: profile, error: profileError } = await supabase.from('profiles').select('avatar_path').eq('id', userId).maybeSingle();
  if (profileError || !profile) return { error: 'This member no longer exists.' };
  if (!profile.avatar_path) return { error: 'This member has no profile photo.' };
  const { error: removeError } = await supabase.storage.from(PHOTO_BUCKET).remove([profile.avatar_path]);
  if (removeError) return { error: 'The image could not be removed. Please try again.' };
  const { error } = await supabase.from('profiles').update({ avatar_path: null, updated_at: new Date().toISOString() }).eq('id', userId).select('id').single();
  if (error) return { error: 'The image was removed but the profile could not be updated. Please try again.' };
  done(userId, 'removed');
}
