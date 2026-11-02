'use client';
import { useActionState, useRef, useState } from 'react';
import { uploadProfilePhoto, deleteProfilePhoto } from '@/app/photo-actions';
import { PHOTO_MAX_BYTES, PHOTO_TYPES, TYPE_MESSAGE, sizeMessage } from '@/lib/photos';

export function PhotoCard({ userId, name, email, url }: { userId: string; name: string; email: string | null; url: string | null }) {
  const [state, upload, uploading] = useActionState(uploadProfilePhoto, { error: '' });
  const [removeState, remove, removing] = useActionState(deleteProfilePhoto, { error: '' });
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const initials = name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const shown = preview ?? url;

  function choose(file: File | undefined) {
    setLocalError('');
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) { setLocalError(TYPE_MESSAGE); if (input.current) input.current.value = ''; return; }
    if (file.size > PHOTO_MAX_BYTES) { setLocalError(sizeMessage(file.size)); if (input.current) input.current.value = ''; return; }
    setPreview(URL.createObjectURL(file));
  }

  return <article className="photocard" id={`member-${userId}`}>
    {shown ? <img className="photo" src={shown} alt={`Profile photo of ${name}`} /> : <div className="photo placeholder" aria-hidden="true">{initials}</div>}
    <div className="photometa"><strong>{name}</strong><small>{email ?? userId}</small><span className={url ? 'tag admin' : 'tag'}>{preview ? 'NEW PHOTO SELECTED' : url ? 'HAS PHOTO' : 'NO PHOTO'}</span></div>
    <form action={upload} className="photoform">
      <input type="hidden" name="user_id" value={userId} />
      <label className="filepick">{url ? 'Choose replacement' : 'Choose photo'}<input ref={input} type="file" name="photo" accept={PHOTO_TYPES.join(',')} required onChange={e => choose(e.target.files?.[0])} /></label>
      <button className="primary" disabled={uploading || !preview}>{uploading ? 'Uploading…' : url ? 'Replace' : 'Upload'}</button>
    </form>
    {(localError || state.error) && <p className="notice" role="alert">{localError || state.error}</p>}
    {url && <><button className="danger" onClick={() => dialog.current?.showModal()}>Remove photo</button>
      <dialog ref={dialog} aria-labelledby={`remove-${userId}`}><h2 id={`remove-${userId}`}>Remove {name}’s photo?</h2><p>The image is deleted from storage and the profile falls back to initials in both apps.</p>
        <form action={remove}><input type="hidden" name="user_id" value={userId} />{removeState.error && <p role="alert">{removeState.error}</p>}
          <div className="actions"><button type="button" disabled={removing} onClick={() => dialog.current?.close()}>Cancel</button><button className="danger" disabled={removing}>{removing ? 'Removing…' : 'Remove photo'}</button></div></form></dialog></>}
  </article>;
}
