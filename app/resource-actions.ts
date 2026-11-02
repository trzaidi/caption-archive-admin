'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { findResource, type Field } from '@/lib/resources';
import { MEDIA_IMAGES } from '@/lib/media-images';
import type { ActionState } from '@/app/actions';

type Parsed = { ok: true; value: unknown } | { ok: false; error: string };

function parseField(field: Field, form: FormData): Parsed {
  if (field.kind === 'boolean') return { ok: true, value: form.get(field.name) === 'on' };
  const raw = String(form.get(field.name) ?? '').trim();
  if (!raw) return field.required ? { ok: false, error: `${field.label} is required.` } : { ok: true, value: null };
  const bad = (why: string): Parsed => ({ ok: false, error: `${field.label}: ${why}` });
  switch (field.kind) {
    case 'text': case 'textarea':
      return raw.length > (field.max ?? 2000) ? bad(`use at most ${field.max ?? 2000} characters.`) : { ok: true, value: raw };
    case 'integer': {
      if (!/^-?\d+$/.test(raw)) return bad('enter a whole number.');
      const n = Number(raw);
      if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) return bad(`enter a number from ${field.min} to ${field.max}.`);
      return { ok: true, value: n };
    }
    case 'decimal': {
      if (!/^\d+(\.\d{1,2})?$/.test(raw)) return bad('enter a number with at most two decimals.');
      const n = Number(raw);
      if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) return bad(`enter a value from ${field.min} to ${field.max}.`);
      return { ok: true, value: n };
    }
    case 'choice':
      return field.choices?.includes(raw) ? { ok: true, value: raw } : bad('choose a listed option.');
    case 'ref':
      return /^[1-9]\d{0,15}$/.test(raw) ? { ok: true, value: Number(raw) } : bad('choose a listed option.');
    case 'picture':
      return MEDIA_IMAGES.some(i => i.path === raw) ? { ok: true, value: raw } : bad('choose a picture from the gallery.');
    case 'email': {
      const email = raw.toLowerCase();
      return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? { ok: true, value: email } : bad('enter a valid email address.');
    }
    case 'domain': {
      const domain = raw.toLowerCase().replace(/^@/, '');
      return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) ? { ok: true, value: domain } : bad('enter a domain such as columbia.edu.');
    }
    case 'url':
      return /^https:\/\/\S+$/.test(raw) && raw.length <= (field.max ?? 300) ? { ok: true, value: raw } : bad('enter an https:// address.');
    case 'envname':
      return /^[A-Z][A-Z0-9_]{0,63}$/.test(raw) ? { ok: true, value: raw } : bad('use an uppercase variable name such as GEMINI_API_KEY.');
  }
}

function databaseMessage(code: string | undefined, singular: string) {
  if (code === '23505') return `That ${singular} already exists.`;
  if (code === '23503') return `This ${singular} is still used elsewhere, or a linked record no longer exists.`;
  if (code === '23514') return 'One of the values is outside the allowed format or range.';
  if (code === '42501') return 'Your account is not allowed to make this change.';
  return `The ${singular} could not be saved. Check the fields and try again.`;
}

const validId = (raw: string) => /^[1-9]\d{0,15}$/.test(raw) ? Number(raw) : null;

export async function saveRecord(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const resource = findResource(String(form.get('resource') ?? ''));
  if (!resource) return { error: 'Unknown record type.' };
  const rawId = String(form.get('id') ?? '');
  const id = rawId ? validId(rawId) : null;
  if (rawId && !id) return { error: 'Invalid record ID.' };
  if (id ? !resource.canUpdate : !resource.canCreate) return { error: `This ${resource.singular} cannot be ${id ? 'edited' : 'created'} here.` };
  const record: Record<string, unknown> = {};
  for (const field of resource.fields) {
    const parsed = parseField(field, form);
    if (!parsed.ok) return { error: parsed.error };
    record[field.name] = parsed.value;
  }
  const query = supabase.from(resource.table);
  const result = id ? await query.update(record).eq('id', id).select('id').single() : await query.insert(record).select('id').single();
  if (result.error) return { error: databaseMessage(result.error.code, resource.singular) };
  revalidatePath(`/${resource.key}`); revalidatePath('/');
  redirect(`/${resource.key}?status=saved`);
}

export async function deleteRecord(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const resource = findResource(String(form.get('resource') ?? ''));
  const id = validId(String(form.get('id') ?? ''));
  if (!resource || !resource.canDelete || !id) return { error: 'This record cannot be deleted.' };
  const { error } = await supabase.from(resource.table).delete().eq('id', id).select('id').single();
  if (error) return { error: error.code === '23503' ? `This ${resource.singular} is still used elsewhere. Remove or reassign those records first.` : `The ${resource.singular} could not be deleted. Please try again.` };
  revalidatePath(`/${resource.key}`); revalidatePath('/');
  redirect(`/${resource.key}?status=deleted`);
}

export async function saveMix(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const updates: { id: number; weight: number }[] = [];
  for (const [key, value] of form.entries()) {
    const match = /^weight-([1-9]\d{0,15})$/.exec(key);
    if (!match) continue;
    const raw = String(value).trim();
    if (!/^\d{1,3}$/.test(raw) || Number(raw) > 100) return { error: 'Each weight must be a whole number from 0 to 100.' };
    updates.push({ id: Number(match[1]), weight: Number(raw) });
  }
  if (!updates.length) return { error: 'There are no chains to update.' };
  if (updates.every(u => u.weight === 0)) return { error: 'At least one chain needs a weight above 0.' };
  for (const u of updates) {
    const { error } = await supabase.from('prompt_chain_mix').update({ weight: u.weight }).eq('prompt_chain_id', u.id).select('prompt_chain_id').single();
    if (error) return { error: 'The mix could not be saved. Please try again.' };
  }
  revalidatePath('/prompt-chain-mix'); revalidatePath('/prompt-chains');
  redirect('/prompt-chain-mix?status=saved');
}
