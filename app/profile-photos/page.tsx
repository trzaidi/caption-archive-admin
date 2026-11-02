import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { Shell } from '@/components/shell';
import { loadPeople } from '@/lib/people';
import { photoUrl } from '@/lib/photos';
import { PhotoCard } from '@/components/photo-forms';

export const dynamic = 'force-dynamic';

export default async function ProfilePhotos({ searchParams }: { searchParams: Promise<{ q?: string; show?: string; status?: string }> }) {
  const { supabase, user } = await requireAdmin();
  const { q = '', show = 'all', status } = await searchParams;
  const [{ data, error }, { people }] = await Promise.all([
    supabase.from('profiles').select('id,first_name,last_name,avatar_path,updated_at').order('updated_at', { ascending: false }).limit(500),
    loadPeople(supabase),
  ]);
  if (error) throw new Error('Unable to load profiles.');
  const all = (data ?? []).map(p => ({ ...p, name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unnamed member', email: people.get(p.id)?.email ?? null }));
  const withPhoto = all.filter(p => p.avatar_path).length;
  const needle = q.trim().toLowerCase();
  const rows = all.filter(p => (show === 'with' ? p.avatar_path : show === 'without' ? !p.avatar_path : true) && (!needle || `${p.name} ${p.email ?? ''} ${p.id}`.toLowerCase().includes(needle)));
  const filter = (value: string, text: string) => <Link className={show === value ? 'chip selected' : 'chip'} href={`/profile-photos?${new URLSearchParams({ q, show: value })}`}>{text}</Link>;
  const messages: Record<string, string> = { uploaded: 'Photo uploaded.', replaced: 'Photo replaced.', removed: 'Photo removed.' };

  return <Shell active="/profile-photos" email={user.email ?? ''}>
    <div className="pageheading"><div><p className="kicker">IDENTITY / IMAGES</p><h1>Profile photos<span className="accent">.</span></h1><p>Upload, replace and remove member profile photos. Changes appear in the rating app immediately.</p></div></div>
    {status && messages[status] && <p className="notice" role="status">{messages[status]}</p>}
    <section className="panel">
      <div className="paneltitle"><h2>Members</h2><span className="muted">{withPhoto} of {all.length} have a photo</span></div>
      <form className="search"><input name="q" defaultValue={q} aria-label="Search members" placeholder="Search name, email or user ID" /><input type="hidden" name="show" value={show} /><button>Search</button></form>
      <div className="chips">{filter('all', 'All')}{filter('with', 'With photo')}{filter('without', 'Without photo')}</div>
      <div className="photogrid">{rows.map(p => <PhotoCard key={`${p.id}-${p.updated_at}`} userId={p.id} name={p.name} email={p.email} url={photoUrl(p.avatar_path, p.updated_at)} />)}</div>
      {!rows.length && <p className="muted">No matching members.</p>}
      <p className="muted">JPG, PNG, WEBP or GIF, up to 4 MB. Photos are public, like member uploads in the rating app. Every change is recorded in the audit trail.</p>
    </section>
  </Shell>;
}
