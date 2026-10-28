import type { SupabaseClient } from '@supabase/supabase-js';

export type Person = { name: string; email: string | null };

// Names come from profiles; emails come from the admin-only directory function
// (sql/003_admin_directory.sql). If that function is missing, emails are omitted.
export async function loadPeople(supabase: SupabaseClient) {
  const [profiles, directory] = await Promise.all([
    supabase.from('profiles').select('id,first_name,last_name').limit(1000),
    supabase.rpc('archive_admin_directory'),
  ]);
  if (profiles.error) throw new Error('Unable to load profiles.');
  const emails = new Map<string, string>(directory.error ? [] : (directory.data ?? []).map((d: { id: string; email: string }) => [d.id, d.email]));
  const people = new Map<string, Person>();
  for (const p of profiles.data ?? []) people.set(p.id, { name: [p.first_name, p.last_name].filter(Boolean).join(' '), email: emails.get(p.id) ?? null });
  return { people, emailsAvailable: !directory.error };
}

export function label(people: Map<string, Person>, id: string) {
  const p = people.get(id);
  return p?.name || p?.email || `${id.slice(0, 8)}…`;
}
