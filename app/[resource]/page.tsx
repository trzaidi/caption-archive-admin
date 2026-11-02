import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { Shell } from '@/components/shell';
import { loadPeople, label } from '@/lib/people';
import { findResource, isMissingTable, type Row } from '@/lib/resources';
import { RecordEditor, DeleteRecord, type Option } from '@/components/record-forms';

export const dynamic = 'force-dynamic';
const PAGE = 25;

export default async function ResourcePage({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<{ edit?: string; q?: string; status?: string; page?: string }> }) {
  const resource = findResource((await params).resource);
  if (!resource) notFound();
  const { supabase, user } = await requireAdmin();
  const { edit, q = '', status, page: pageString } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageString) || 1));
  const search = q.replace(/[^\p{L}\p{N} @._-]/gu, '').slice(0, 100);
  const editable = resource.canCreate || resource.canUpdate;

  let query = supabase.from(resource.table).select(resource.select, { count: 'exact' })
    .order(resource.order.column, { ascending: resource.order.ascending });
  if (resource.table !== 'generation_requests') query = query.order('id', { ascending: true });
  if (search) query = query.or(resource.search.map(c => `${c}.ilike.%${search}%`).join(','));

  const editId = edit && /^[1-9]\d{0,15}$/.test(edit) && resource.canUpdate ? Number(edit) : null;
  const refFields = resource.fields.filter(f => f.kind === 'ref' && f.ref);
  const [list, editing, people, ...refs] = await Promise.all([
    query.range((page - 1) * PAGE, page * PAGE - 1),
    editId ? supabase.from(resource.table).select('*').eq('id', editId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    resource.usesPeople ? loadPeople(supabase) : Promise.resolve(null),
    ...refFields.map(f => supabase.from(f.ref!.table).select(`id,${f.ref!.label}`).order('id').limit(500)),
  ]);

  const missing = isMissingTable(list.error);
  if (list.error && !missing) throw new Error(`Unable to load ${resource.title.toLowerCase()}.`);
  const rows = (list.data ?? []) as unknown as Row[];
  const current = (editing.data ?? undefined) as Row | undefined;
  const options: Record<string, Option[]> = {};
  refFields.forEach((f, i) => { options[f.name] = ((refs[i].data ?? []) as unknown as Row[]).map(r => ({ value: String(r.id), label: String(r[f.ref!.label]) })); });
  const person = (id: unknown) => people && typeof id === 'string' ? label(people.people, id) : String(id ?? '—');
  const count = list.count ?? 0;
  const pageLink = (n: number) => `/${resource.key}?${new URLSearchParams({ q, page: String(n) })}`;
  const rowName = (r: Row) => String(r[resource.fields[0]?.name ?? 'id'] ?? `#${r.id}`);

  const table = <section className="panel">
    <div className="paneltitle"><h2>{resource.title}</h2><span className="muted">{count} records</span></div>
    <form className="search"><input name="q" aria-label={`Search ${resource.title}`} defaultValue={q} placeholder={`Search ${resource.search.join(', ').replaceAll('_', ' ')}`} /><button>Search</button></form>
    <div className="tablewrap"><table><thead><tr>{resource.columns.map(c => <th key={c.label}>{c.label}</th>)}{(resource.canUpdate || resource.canDelete) && <th>ACTIONS</th>}</tr></thead>
      <tbody>{rows.map(r => <tr key={String(r.id)} className={current && current.id === r.id ? 'editing' : ''}>
        {resource.columns.map(c => <td key={c.label} className={[c.mono ? 'mono' : '', c.wide ? 'wide' : ''].join(' ').trim() || undefined}>{c.value(r, person)}</td>)}
        {(resource.canUpdate || resource.canDelete) && <td><div className="actions">{resource.canUpdate && <Link href={`/${resource.key}?edit=${r.id}`}>Edit</Link>}{resource.canDelete && <DeleteRecord resource={resource.key} singular={resource.singular} id={Number(r.id)} name={rowName(r)} />}</div></td>}
      </tr>)}</tbody></table></div>
    {!rows.length && <p className="muted">{search ? 'No matching records.' : 'No records yet.'}</p>}
    <nav className="pagination" aria-label={`${resource.title} pages`}>{page > 1 && <Link href={pageLink(page - 1)}>← Previous</Link>}<span>Page {page}</span>{page * PAGE < count && <Link href={pageLink(page + 1)}>Next →</Link>}</nav>
  </section>;

  return <Shell active={`/${resource.key}`} email={user.email ?? ''}>
    <div className="pageheading"><div><p className="kicker">{resource.kicker}</p><h1>{resource.title}<span className="accent">.</span></h1><p>{resource.description}</p></div></div>
    {missing && <p className="notice" role="alert">This table does not exist yet. Apply sql/004_week7_observability.sql in the Supabase SQL editor.</p>}
    {['saved', 'deleted'].includes(status ?? '') && <p className="notice" role="status">{resource.singular[0].toUpperCase() + resource.singular.slice(1)} {status} successfully.</p>}
    {edit && editId && !current && !missing && <p className="notice" role="alert">This {resource.singular} no longer exists.</p>}
    {editable && !missing ? <div className="twocol record-layout"><section className="panel"><h2>{current ? `Edit ${resource.singular}` : `Add ${resource.singular}`}</h2>
      <RecordEditor key={String(current?.id ?? 'new')} resource={resource.key} singular={resource.singular} fields={resource.fields} options={options} current={current} /></section>{table}</div> : table}
  </Shell>;
}
