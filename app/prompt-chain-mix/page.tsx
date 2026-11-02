import { requireAdmin } from '@/lib/admin';
import { Shell } from '@/components/shell';
import { isMissingTable } from '@/lib/resources';
import { MixEditor } from '@/components/record-forms';

export const dynamic = 'force-dynamic';

export default async function PromptChainMix({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, user } = await requireAdmin();
  const { status } = await searchParams;
  const [mix, responses] = await Promise.all([
    supabase.from('prompt_chain_mix').select('prompt_chain_id,weight,updated_at,prompt_chains(name,tone,is_active)').order('prompt_chain_id'),
    supabase.from('llm_responses').select('prompt_chain_id').eq('status', 'success').order('created_at', { ascending: false }).limit(500),
  ]);
  const missing = isMissingTable(mix.error);
  if ((mix.error && !missing) || (responses.error && !isMissingTable(responses.error))) throw new Error('Unable to load the prompt chain mix.');
  const rows = (mix.data ?? []).map(m => {
    const chain = (Array.isArray(m.prompt_chains) ? m.prompt_chains[0] : m.prompt_chains) as { name: string; tone: string | null; is_active: boolean } | null;
    return { id: m.prompt_chain_id as number, weight: m.weight as number, updated_at: m.updated_at as string, name: chain?.name ?? `Chain #${m.prompt_chain_id}`, tone: chain?.tone ?? '—', active: chain?.is_active ?? false };
  });
  const total = rows.reduce((s, r) => s + r.weight, 0);
  const observed = responses.data ?? [];
  const share = (id: number) => observed.length ? Math.round(100 * observed.filter(r => r.prompt_chain_id === id).length / observed.length) : 0;

  return <Shell active="/prompt-chain-mix" email={user.email ?? ''}>
    <div className="pageheading"><div><p className="kicker">PIPELINE / READ & UPDATE</p><h1>Chain mix<span className="accent">.</span></h1><p>Target share of generations for each prompt chain, compared with what members actually generate.</p></div></div>
    {missing && <p className="notice" role="alert">The mix table does not exist yet. Apply sql/004_week7_observability.sql in the Supabase SQL editor.</p>}
    {status === 'saved' && <p className="notice" role="status">Mix saved successfully.</p>}
    {!missing && <div className="twocol record-layout">
      <section className="panel"><h2>Adjust weights</h2><p className="muted">Mix entries are created with each chain, so they can be reweighted but not added or removed.</p><MixEditor chains={rows.map(r => ({ id: r.id, name: r.name, weight: r.weight }))} /></section>
      <section className="panel"><div className="paneltitle"><h2>Target vs observed</h2><span className="muted">Latest {observed.length} successful responses</span></div>
        {rows.map(r => <div className="tonerow" key={r.id}>
          <div><span>{r.name} · {r.tone}{r.active ? '' : ' · inactive'}</span><b>{total ? Math.round(100 * r.weight / total) : 0}% target · {share(r.id)}% observed</b></div>
          <div className="track" title="Target share"><span style={{ width: `${total ? 100 * r.weight / total : 0}%` }} /></div>
          <div className="track observed" title="Observed share"><span style={{ width: `${share(r.id)}%` }} /></div>
        </div>)}
        <div className="tablewrap"><table><thead><tr><th>CHAIN</th><th>WEIGHT</th><th>LAST UPDATED</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.weight}</td><td>{new Date(r.updated_at).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' })}</td></tr>)}</tbody></table></div>
      </section></div>}
  </Shell>;
}
