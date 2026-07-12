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
    <div className="max-w-[560px]">
      <div className="flex gap-3 items-center flex-wrap">
        <button type="button" className="inline-flex items-center gap-2 py-3 px-5 rounded-full border-[1.5px] border-ink bg-white font-bold text-sm cursor-pointer transition-colors duration-150 hover:bg-tint disabled:opacity-60 disabled:cursor-default" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
          {uploading > 0 ? <><Loader2 size={17} className="animate-spin" /> Uploading {uploading} photo{uploading > 1 ? 's' : ''}…</> : <><Upload size={17} /> Upload photos</>}
        </button>
        <input
          ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex items-center gap-2 flex-1 min-w-[220px] border border-line-strong rounded-full py-2 px-3.5 text-ink-faint">
          <Link2 size={15} />
          <input
            type="url" placeholder="or paste an image link"
            className="border-0 outline-0 flex-1 text-sm bg-transparent min-w-0"
            value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPastedUrl() } }}
          />
          <button type="button" className="font-semibold text-[13px] text-brand hover:underline" onClick={addPastedUrl} disabled={!urlDraft.trim()}>Add</button>
        </div>
      </div>
      <p className="text-ink-faint text-sm mt-2.5">JPG, PNG, or WebP up to 5MB each. The first photo is your cover.</p>
      {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-3.5 mt-3 mb-0">{error}</div>}

      {photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-2.5 mt-4">
          {photos.map((src, i) => (
            <div className="aspect-square rounded-xl overflow-hidden bg-tint relative" key={src + i}>
              <img src={src} alt={'Photo ' + (i + 1)} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.parentElement?.classList.add('hidden') }} />
              {i === 0 && <span className="absolute left-2 bottom-2 bg-[rgba(10,8,14,0.72)] text-white text-[11px] font-bold py-[3px] px-2 rounded-full">Cover</span>}
              <button type="button" className="absolute top-1.5 right-1.5 w-[26px] h-[26px] rounded-full border-0 bg-[rgba(10,8,14,0.62)] text-white grid place-items-center cursor-pointer hover:bg-[rgba(10,8,14,0.85)]" aria-label={'Remove photo ' + (i + 1)} onClick={() => remove(i)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-ink-faint text-sm mt-3.5"><ImagePlus size={28} /> No photos yet. You can add them later too.</div>
      )}
    </div>
  )
}
