import Link from 'next/link';
import {requireAdmin} from '@/lib/admin';
import {Shell} from '@/components/shell';
import {MediaEditor,DeleteMedia} from '@/components/media-forms';
import {MEDIA_ORIGIN} from '@/lib/media-images';
export const dynamic='force-dynamic';
export default async function Media({searchParams}:{searchParams:Promise<{edit?:string;q?:string;status?:string;page?:string}>}){
 const {supabase,user}=await requireAdmin();const {edit,q='',status,page:pageString}=await searchParams;
 const page=Math.max(1,Math.floor(Number(pageString)||1));
 const search=q.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,100);
 let query=supabase.from('captions').select('id,caption_text,image_description,prompt,model,tone,image_path,created_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false});
 if(search)query=query.or(`caption_text.ilike.%${search}%,image_description.ilike.%${search}%`);
 const [{data,error,count},editing]=await Promise.all([query.range((page-1)*25,page*25-1),edit?supabase.from('captions').select('id,caption_text,image_description,prompt,model,tone,image_path').eq('id',edit).maybeSingle():Promise.resolve({data:null,error:null})]);
 if(error||editing.error)throw new Error('Unable to load the media inventory.');
 const current=editing.data??undefined;
 const pageLink=(n:number)=>`/media?${new URLSearchParams({q,page:String(n)})}`;
 return <Shell active="/media" email={user.email??''}><div className="pageheading"><div><p className="kicker">CONTENT / EDITORIAL CONTROL</p><h1>AI media<span className="accent">.</span></h1><p>Create, edit, and remove AI-generated captions.</p></div><a className="primary" href="https://design-gen-ai-phi.vercel.app/create" target="_blank" rel="noreferrer">Generate a caption ↗</a></div>
 {['saved','deleted'].includes(status??'')&&<p className="notice" role="status">Caption {status} successfully.</p>}
 {edit&&!current&&<p className="notice" role="alert">This caption no longer exists.</p>}
 <div className="twocol media-layout"><section className="panel"><h2>{current?'Edit caption':'Create caption'}</h2><p className="muted">Import an AI-generated caption and its model details, or generate one in the rating app.</p><MediaEditor key={current?.id??'new'} current={current}/></section>
 <section className="panel"><div className="paneltitle"><h2>Content inventory</h2><span className="muted">{count??0} records</span></div><form className="search"><input name="q" aria-label="Search media" defaultValue={q} placeholder="Search captions or descriptions"/><button>Search</button></form>
 <div className="itemlist">{(data??[]).map(c=><div className="inventory" key={c.id}>{c.image_path&&<img className="inventory-picture" src={`${MEDIA_ORIGIN}${c.image_path}`} alt={c.image_description}/>}<div><small>#{c.id} · {c.tone??'Uncategorized'} · {new Date(c.created_at).toLocaleDateString('en-US',{timeZone:'America/New_York'})}</small><p>{c.caption_text}</p><small>{c.model??'Model unspecified'}</small></div><div className="actions"><Link href={`/media?edit=${c.id}`}>Edit</Link><DeleteMedia id={c.id}/></div></div>)}{!data?.length&&<p className="muted">No matching media found.</p>}</div>
 <nav className="pagination" aria-label="Media pages">{page>1&&<Link href={pageLink(page-1)}>← Previous</Link>}<span>Page {page}</span>{page*25<(count??0)&&<Link href={pageLink(page+1)}>Next →</Link>}</nav></section></div></Shell>;
}
