export const PHOTO_BUCKET = 'avatars';
// The bucket accepts 5 MB, but Vercel rejects request bodies over 4.5 MB.
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const photoPath = (userId: string) => `${userId}/avatar`;

export function photoUrl(path: string | null | undefined, version?: string | null) {
  if (!path) return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}
