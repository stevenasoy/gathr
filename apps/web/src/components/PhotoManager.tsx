import { useRef, useState } from 'react'
import { ImagePlus, Link2, Loader2, Upload, X } from 'lucide-react'
import { uploadVenuePhoto } from '../lib/storage'

// Shared photo picker for the host wizard (step 5) and the edit form.
// Controlled: parent owns the `photos` array of URLs (uploaded + pasted mix).
// Uploads go to Supabase Storage via uploadVenuePhoto; pasted URLs are kept
// as-is so existing listings keep working.
export default function PhotoManager({ photos, onChange, userId }: {
  photos: string[]
  onChange: (next: string[]) => void
  userId: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0) // count of in-flight uploads
  const [error, setError] = useState('')
  const [urlDraft, setUrlDraft] = useState('')

  const addUrls = (urls: string[]): void => onChange([...photos, ...urls.filter((u) => u && !photos.includes(u))])

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList) return
    const files = [...fileList]
    if (!files.length) return
    setError('')
    setUploading((n) => n + files.length)
    const results = await Promise.all(files.map((f) => uploadVenuePhoto(f, userId)))
    setUploading((n) => n - files.length)
    const failed = results.filter((r) => r.error)
    if (failed.length) setError(failed[0].error?.message ?? 'Some photos failed to upload.')
    addUrls(results.map((r) => r.url).filter((u): u is string => !!u))
    if (fileRef.current) fileRef.current.value = ''
  }

  const addPastedUrl = () => {
    const url = urlDraft.trim()
    if (!url) return
    if (!/^https?:\/\//.test(url)) { setError('Photo links must start with http(s)://'); return }
    setError('')
    addUrls([url])
    setUrlDraft('')
  }

  const remove = (i: number): void => onChange(photos.filter((_, idx) => idx !== i))

  return (
    <div className="photo-manager">
      <div className="photo-actions">
        <button type="button" className="photo-upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
          {uploading > 0 ? <><Loader2 size={17} className="spin" /> Uploading {uploading} photo{uploading > 1 ? 's' : ''}…</> : <><Upload size={17} /> Upload photos</>}
        </button>
        <input
          ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="photo-url-row">
          <Link2 size={15} />
          <input
            type="url" placeholder="or paste an image link"
            value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPastedUrl() } }}
          />
          <button type="button" className="btn-clear" onClick={addPastedUrl} disabled={!urlDraft.trim()}>Add</button>
        </div>
      </div>
      <p className="photo-hint">JPG, PNG, or WebP up to 5MB each. The first photo is your cover.</p>
      {error && <div className="form-error">{error}</div>}

      {photos.length > 0 ? (
        <div className="photo-thumbs">
          {photos.map((src, i) => (
            <div className="photo-thumb" key={src + i}>
              <img src={src} alt={'Photo ' + (i + 1)} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.parentElement?.classList.add('broken') }} />
              {i === 0 && <span className="photo-cover-tag">Cover</span>}
              <button type="button" className="photo-remove" aria-label={'Remove photo ' + (i + 1)} onClick={() => remove(i)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="photo-empty"><ImagePlus size={28} /> No photos yet. You can add them later too.</div>
      )}
    </div>
  )
}
