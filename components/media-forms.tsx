 'use client';
import {useActionState,useRef,useState} from 'react';
import Link from 'next/link';
import {saveCaption,deleteCaption} from '@/app/actions';
import {MEDIA_IMAGES,MEDIA_ORIGIN} from '@/lib/media-images';
type Caption={id:number;caption_text:string;image_description:string;prompt:string|null;model:string|null;tone:string|null;image_path:string|null};
export function MediaEditor({current}:{current?:Caption}){
 const [state,action,pending]=useActionState(saveCaption,{error:''});
 const [imagePath,setImagePath]=useState(current?.image_path??'');
 return <form action={action} className="editor">
 <input type="hidden" name="id" value={current?.id??''}/>
 <label>CAPTION TEXT<textarea name="caption_text" required maxLength={500} defaultValue={current?.caption_text??''}/></label>
 <label>IMAGE / SCENE DESCRIPTION<textarea name="image_description" required maxLength={2000} defaultValue={current?.image_description??''}/></label>
 <label>TONE<select name="tone" defaultValue={current?.tone??'Deadpan'}><option>Deadpan</option><option>Unhinged</option><option>Wholesome</option></select></label>
 <label>AI MODEL<input name="model" maxLength={120} defaultValue={current?.model??''} placeholder="Model used to generate this caption"/></label>
 <label>PICTURE<select name="image_path" value={imagePath} required onChange={e=>setImagePath(e.target.value)}><option value="" disabled>Choose a matching picture</option>{MEDIA_IMAGES.map(image=><option key={image.path} value={image.path}>{image.title}</option>)}</select></label>
 {imagePath&&<img className="editor-picture" src={`${MEDIA_ORIGIN}${imagePath}`} alt="Selected caption picture"/>}
 <label>GENERATION PROMPT<textarea name="prompt" maxLength={4000} defaultValue={current?.prompt??''}/></label>
 {state.error&&<p className="notice" role="alert">{state.error}</p>}
 <div className="actions"><button className="primary" disabled={pending}>{pending?'Saving…':current?'Save changes →':'Publish caption →'}</button>{current&&<Link href="/media">Cancel edit</Link>}</div>
 </form>;
}
export function DeleteMedia({id}:{id:number}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [state,action,pending]=useActionState(deleteCaption,{error:''});
 return <><button className="danger" onClick={()=>dialog.current?.showModal()} aria-label={`Delete caption ${id}`}>Delete</button>
 <dialog ref={dialog} aria-labelledby={`delete-${id}`}><h2 id={`delete-${id}`}>Delete caption #{id}?</h2><p>This removes the caption and its votes from both apps.</p>
 <form action={action}><input type="hidden" name="id" value={id}/>{state.error&&<p role="alert">{state.error}</p>}<div className="actions"><button type="button" disabled={pending} onClick={()=>dialog.current?.close()}>Cancel</button><button className="danger" disabled={pending}>{pending?'Deleting…':'Delete caption'}</button></div></form></dialog></>;
}
