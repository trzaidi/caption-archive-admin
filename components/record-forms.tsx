'use client';
import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import { saveRecord, deleteRecord, saveMix } from '@/app/resource-actions';
import { MEDIA_IMAGES, MEDIA_ORIGIN } from '@/lib/media-images';
import type { Field, Row } from '@/lib/resources';

export type Option = { value: string; label: string };

function PictureField({ field, initial }: { field: Field; initial: string }) {
  const [path, setPath] = useState(initial);
  return <>
    <label>{field.label}<select name={field.name} value={path} required={field.required} onChange={e => setPath(e.target.value)}>
      <option value="">{field.required ? 'Choose a picture' : 'No picture'}</option>
      {MEDIA_IMAGES.map(i => <option key={i.path} value={i.path}>{i.title}</option>)}
    </select></label>
    {path && <img className="editor-picture" src={`${MEDIA_ORIGIN}${path}`} alt="Selected picture" />}
  </>;
}

export function RecordEditor({ resource, singular, fields, options, current }: { resource: string; singular: string; fields: Field[]; options: Record<string, Option[]>; current?: Row }) {
  const [state, action, pending] = useActionState(saveRecord, { error: '' });
  const initial = (name: string) => current?.[name] == null ? '' : String(current[name]);
  return <form action={action} className="editor">
    <input type="hidden" name="resource" value={resource} />
    <input type="hidden" name="id" value={initial('id')} />
    {fields.map(f => {
      const help = f.help && <small className="muted">{f.help}</small>;
      if (f.kind === 'picture') return <PictureField key={f.name} field={f} initial={initial(f.name)} />;
      if (f.kind === 'boolean') return <label key={f.name} className="checkbox"><input type="checkbox" name={f.name} defaultChecked={current ? Boolean(current[f.name]) : true} />{f.label}</label>;
      if (f.kind === 'textarea') return <label key={f.name}>{f.label}<textarea name={f.name} required={f.required} maxLength={f.max} defaultValue={initial(f.name)} />{help}</label>;
      if (f.kind === 'ref' || f.kind === 'choice') {
        const list = f.kind === 'ref' ? options[f.name] ?? [] : (f.choices ?? []).map(c => ({ value: c, label: c }));
        return <label key={f.name}>{f.label}<select name={f.name} required={f.required} defaultValue={initial(f.name)}>
          <option value="" disabled={f.required}>{f.required ? 'Choose one' : 'None'}</option>
          {list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>{help}</label>;
      }
      const type = f.kind === 'email' ? 'email' : f.kind === 'url' ? 'url' : f.kind === 'integer' || f.kind === 'decimal' ? 'number' : 'text';
      return <label key={f.name}>{f.label}<input name={f.name} type={type} required={f.required} maxLength={type === 'number' ? undefined : f.max}
        min={f.min} max={type === 'number' ? f.max : undefined} step={f.kind === 'decimal' ? '0.01' : undefined} defaultValue={initial(f.name)} />{help}</label>;
    })}
    {state.error && <p className="notice" role="alert">{state.error}</p>}
    <div className="actions"><button className="primary" disabled={pending}>{pending ? 'Saving…' : current ? 'Save changes →' : `Add ${singular} →`}</button>{current && <Link href={`/${resource}`}>Cancel edit</Link>}</div>
  </form>;
}

export function DeleteRecord({ resource, singular, id, name }: { resource: string; singular: string; id: number; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(deleteRecord, { error: '' });
  return <><button className="danger" onClick={() => dialog.current?.showModal()} aria-label={`Delete ${singular} ${name}`}>Delete</button>
    <dialog ref={dialog} aria-labelledby={`delete-${resource}-${id}`}><h2 id={`delete-${resource}-${id}`}>Delete this {singular}?</h2><p>{name}</p>
      <form action={action}><input type="hidden" name="resource" value={resource} /><input type="hidden" name="id" value={id} />
        {state.error && <p role="alert">{state.error}</p>}
        <div className="actions"><button type="button" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button><button className="danger" disabled={pending}>{pending ? 'Deleting…' : `Delete ${singular}`}</button></div>
      </form></dialog></>;
}

export function MixEditor({ chains }: { chains: { id: number; name: string; weight: number }[] }) {
  const [state, action, pending] = useActionState(saveMix, { error: '' });
  const [weights, setWeights] = useState(() => Object.fromEntries(chains.map(c => [c.id, c.weight])));
  const total = Object.values(weights).reduce((s, w) => s + (Number(w) || 0), 0);
  return <form action={action} className="editor">
    {chains.map(c => <label key={c.id}>{c.name.toUpperCase()}
      <div className="mixrow"><input type="range" min={0} max={100} value={weights[c.id]} aria-label={`${c.name} weight slider`} onChange={e => setWeights(w => ({ ...w, [c.id]: Number(e.target.value) }))} />
        <input name={`weight-${c.id}`} type="number" min={0} max={100} required value={weights[c.id]} onChange={e => setWeights(w => ({ ...w, [c.id]: Number(e.target.value) }))} />
        <span>{total ? Math.round(100 * (Number(weights[c.id]) || 0) / total) : 0}%</span></div></label>)}
    <small className="muted">Weights are relative. Share = weight ÷ total ({total}).</small>
    {state.error && <p className="notice" role="alert">{state.error}</p>}
    <div className="actions"><button className="primary" disabled={pending}>{pending ? 'Saving…' : 'Save mix →'}</button></div>
  </form>;
}
