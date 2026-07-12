import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, User, Building2 } from 'lucide-react'
import Footer from '../components/Footer'
import PhotoManager from '../components/PhotoManager'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { fetchVenue, updateVenue, unitWord } from '../lib/venues'
import { CATEGORIES, AMENITIES } from '../data/categories'
import type { PriceUnit } from '../types'

interface HostEditForm {
  name: string
  city: string
  area: string
  capacity: string | number
  pricePerHour: string | number
  blurb: string
  hostType: 'individual' | 'business'
  businessName: string
  priceUnit: PriceUnit
  includedHours: string | number | ''
}

const TYPE_OPTIONS = CATEGORIES.filter((c) => c.id !== 'all')

export default function HostEdit() {
  const { id } = useParams<{ id: string }>()
  const { user, displayName, loading: authLoading } = useAuth()
  const { refresh } = useVenues()
  const navigate = useNavigate()

  const [form, setForm] = useState<HostEditForm | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [amenities, setAmenities] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (authLoading) return
      if (!user) { setLoading(false); return }
      try {
        const v = await fetchVenue(id!)
        if (!active) return
        if (!v || v.ownerId !== user.id) { setNotFound(true); return }
        setForm({
          name: v.name, city: v.city, area: v.area || '',
          capacity: v.capacity, pricePerHour: v.pricePerHour, blurb: v.blurb || '',
          hostType: v.host?.type || 'individual',
          businessName: v.host?.type === 'business' ? (v.host?.name || '') : '',
          priceUnit: v.priceUnit || 'hour',
          includedHours: v.includedHours || '',
        })
        setTypes(v.types || [])
        setAmenities(v.amenities || [])
        setPhotos(v.images && v.images[0] && v.isHostListing ? v.images : [])
      } catch (e) {
        console.error('listing load failed', e)
        if (active) setLoadError('Could not load this listing. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id, user, authLoading])

  const set = (k: keyof HostEditForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => (prev ? { ...prev, [k]: e.target.value } : prev))
  const toggle = <T,>(list: T[], setList: (n: T[]) => void, val: T) =>
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  if (authLoading || loading) {
    return <main className="min-h-[70vh] grid place-items-center py-[60px] px-5"><p className="text-ink-soft">Loading…</p></main>
  }
  if (!user) {
    return (
      <>
        <main className="min-h-[70vh] grid place-items-center py-[60px] px-5">
          <div className="max-w-[460px] mx-auto p-8 border border-line rounded-lg bg-white shadow-card">
            <h1 className="text-[26px] font-extrabold mb-2 text-center">Edit listing</h1>
            <p className="text-center text-ink-soft text-[14.5px] mb-6">Sign in to manage your listings.</p>
            <Link to="/signin" state={{ from: `/host/edit/${id}` }} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ display: 'block', textAlign: 'center' }}>Sign in</Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }
  if (loadError) {
    return (
      <>
        <main className="max-w-wrap mx-auto px-10 text-center py-20 px-5 text-ink-soft" style={{ paddingTop: 80 }}>
          <h3 className="text-xl text-ink mb-2">{loadError}</h3>
          <button className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '12px 22px', marginTop: 12 }} onClick={() => location.reload()}>Retry</button>
        </main>
        <Footer />
      </>
    )
  }
  if (notFound || !form) {
    return (
      <>
        <main className="max-w-wrap mx-auto px-10 text-center py-20 px-5 text-ink-soft" style={{ paddingTop: 80 }}>
          <h3 className="text-xl text-ink mb-2">Listing not found</h3>
          <Link to="/host/dashboard?tab=listings" className="font-semibold text-[13px] text-brand hover:underline">Back to your listings</Link>
        </main>
        <Footer />
      </>
    )
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError('')
    if (!types.length) { setError('Pick at least one event type.'); return }
    if (form.hostType === 'business' && !form.businessName.trim()) { setError('Add your business name.'); return }
    try {
      setSaving(true)
      const image_urls = photos
      const { error: upErr } = await updateVenue(id!, {
        name: form.name,
        city: form.city,
        area: form.area || null,
        types,
        capacity: Number(form.capacity) || 50,
        price_per_hour: Number(form.pricePerHour) || 0,
        price_unit: form.priceUnit,
        included_hours: form.priceUnit !== 'hour' && form.includedHours ? Number(form.includedHours) : null,
        blurb: form.blurb || null,
        amenities,
        image_urls,
        host_type: form.hostType,
        host_name: form.hostType === 'business' ? form.businessName.trim() : displayName,
      })
      if (upErr) { setError(upErr.message); return }
      await refresh()
      navigate('/host/dashboard?tab=listings')
    } catch (e) {
      console.error('save listing failed', e)
      setError('Something went wrong saving your listing. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <main className="max-w-wrap mx-auto px-10" style={{ maxWidth: 720, paddingTop: 28, paddingBottom: 40 }}>
        <Link to="/host/dashboard?tab=listings" className="inline-flex items-center gap-1.5 text-ink-soft font-semibold text-sm mb-4 hover:text-ink"><ChevronLeft size={18} /> Your listings</Link>
        <h1 className="text-[28px] font-extrabold mb-1">Edit listing</h1>
        <p className="text-ink-soft mb-6">Changes go live as soon as you save.</p>

        <form onSubmit={onSubmit}>
          <div className="mb-3.5">
            <label className="block text-[13px] font-bold mb-1.5 text-ink">Venue name</label>
            <input required value={form.name} onChange={set('name')} className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="mb-3.5"><label className="block text-[13px] font-bold mb-1.5 text-ink">City</label><input required value={form.city} onChange={set('city')} className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" /></div>
            <div className="mb-3.5"><label className="block text-[13px] font-bold mb-1.5 text-ink">Area / district</label><input value={form.area} onChange={set('area')} className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" /></div>
          </div>
          <div className="mb-3.5">
            <label className="block text-[13px] font-bold mb-1.5 text-ink">Event types</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((c) => (
                <button type="button" key={c.id} className={`py-2 px-3.5 border rounded-full text-[13px] font-semibold transition-all duration-150 ${types.includes(c.id) ? 'bg-ink text-white border-ink' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'}`} onClick={() => toggle(types, setTypes, c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="mb-3.5">
            <label className="block text-[13px] font-bold mb-1.5 text-ink">How you charge</label>
            <div className="flex flex-wrap gap-2">
              {([['hour', 'Per hour'], ['head', 'Per head'], ['event', 'Per event (flat)']] as [PriceUnit, string][]).map(([val, label]) => (
                <button type="button" key={val} className={`py-2 px-3.5 border rounded-full text-[13px] font-semibold transition-all duration-150 ${form.priceUnit === val ? 'bg-ink text-white border-ink' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'}`} onClick={() => setForm({ ...form, priceUnit: val })}>{label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="mb-3.5"><label className="block text-[13px] font-bold mb-1.5 text-ink">Max capacity</label><input type="number" min="1" value={form.capacity} onChange={set('capacity')} className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" /></div>
            <div className="mb-3.5"><label className="block text-[13px] font-bold mb-1.5 text-ink">Price (₱ / {unitWord(form.priceUnit)})</label><input type="number" min="0" step="100" value={form.pricePerHour} onChange={set('pricePerHour')} className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" /></div>
          </div>
          {form.priceUnit !== 'hour' && (
            <div className="mb-3.5 max-w-[280px]">
              <label className="block text-[13px] font-bold mb-1.5 text-ink">Hours included <span className="font-normal text-ink-faint">(optional)</span></label>
              <input type="number" min="1" max="24" value={form.includedHours} onChange={set('includedHours')} placeholder="e.g. 4" className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" />
            </div>
          )}
          <div className="mb-3.5">
            <label className="block text-[13px] font-bold mb-1.5 text-ink">Description</label>
            <textarea value={form.blurb} onChange={set('blurb')} className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand resize-y min-h-[110px]" />
          </div>
          <div className="mb-3.5">
            <label className="block text-[13px] font-bold mb-1.5 text-ink">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <button type="button" key={a} className={`py-2 px-3.5 border rounded-full text-[13px] font-semibold transition-all duration-150 ${amenities.includes(a) ? 'bg-ink text-white border-ink' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'}`} onClick={() => toggle(amenities, setAmenities, a)}>{a}</button>
              ))}
            </div>
          </div>
          <div className="mb-3.5">
            <label className="block text-[13px] font-bold mb-1.5 text-ink">Photos</label>
            <PhotoManager photos={photos} onChange={setPhotos} userId={user.id} />
          </div>
          <div className="mb-3.5">
            <label className="block text-[13px] font-bold mb-1.5 text-ink">Listing as</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`inline-flex items-center gap-1 py-2 px-3.5 border rounded-full text-[13px] font-semibold transition-all duration-150 ${form.hostType === 'individual' ? 'bg-ink text-white border-ink' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'}`} onClick={() => setForm({ ...form, hostType: 'individual' })}>
                <User size={14} className="align-[-2px] mr-1" /> An individual
              </button>
              <button type="button" className={`inline-flex items-center gap-1 py-2 px-3.5 border rounded-full text-[13px] font-semibold transition-all duration-150 ${form.hostType === 'business' ? 'bg-ink text-white border-ink' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'}`} onClick={() => setForm({ ...form, hostType: 'business' })}>
                <Building2 size={14} className="align-[-2px] mr-1" /> A business
              </button>
            </div>
          </div>
          {form.hostType === 'business' ? (
            <div className="mb-3.5"><label className="block text-[13px] font-bold mb-1.5 text-ink">Business name</label><input value={form.businessName} onChange={set('businessName')} placeholder="Skyline Events Co." className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" /></div>
          ) : (
            <p className="text-ink-soft text-[15px] mt-[-4px] mb-3.5">Guests will see <b className="text-ink">{displayName}</b> as the host.</p>
          )}
          {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-3.5">{error}</div>}
          <button className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </main>
      <Footer />
    </>
  )
}
