'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { MEDIA_IMAGES } from '@/lib/media-images';

export async function login() {redirect('https://caption-archive-admin.vercel.app/auth/login');}
export async function logout() {const client=await db();await client.auth.signOut();redirect('/login');}
export type ActionState = { error: string };
const field=(f:FormData,key:string)=>String(f.get(key)??'').trim();
export async function saveCaption(_previous:ActionState, form:FormData):Promise<ActionState> {
 const {supabase}=await requireAdmin();
 const id=field(form,'id');
 const caption_text=field(form,'caption_text');
 const image_description=field(form,'image_description');
 const prompt=field(form,'prompt')||null;
 const tone=field(form,'tone');
 const model=field(form,'model')||'admin-import';
 const image_path=field(form,'image_path')||null;
 if(id&&(!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id))))return {error:'Invalid caption ID.'};
 if(!caption_text||caption_text.length>500||!image_description||image_description.length>2000)return {error:'Enter a caption (1–500 characters) and scene description (1–2,000 characters).'};
 if(!['Deadpan','Unhinged','Wholesome'].includes(tone))return {error:'Choose a listed tone.'};
 if(model.length>120||(prompt?.length??0)>4000)return {error:'Model must be at most 120 characters and prompt at most 4,000.'};
 if(!MEDIA_IMAGES.some(image=>image.path===image_path))return {error:'Choose a picture from the gallery before saving.'};
 const record={caption_text,image_description,prompt,tone,model,image_path};
 const result=id ? await supabase.from('captions').update(record).eq('id',Number(id)).select('id').single() : await supabase.from('captions').insert(record).select('id').single();
 if(result.error)return {error:'The caption could not be saved. Check the fields and try again.'};
 // A database trigger writes the audit entry within this same transaction.
 revalidatePath('/');revalidatePath('/media');revalidatePath('/ratings');redirect('/media?status=saved');
}
export async function deleteCaption(_previous:ActionState,form:FormData):Promise<ActionState> {
 const {supabase}=await requireAdmin();const id=Number(form.get('id'));
 if(!Number.isSafeInteger(id)||id<1)return {error:'Invalid caption ID.'};
 const {error}=await supabase.from('captions').delete().eq('id',id).select('id').single();
 if(error)return {error:'The caption could not be removed. Please try again.'};
 revalidatePath('/');revalidatePath('/media');revalidatePath('/ratings');redirect('/media?status=deleted');
}
