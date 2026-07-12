import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Minus, Plus, Check, ImagePlus, User, Building2 } from 'lucide-react'
import { categoryIcon } from '../lib/icons'
import Footer from '../components/Footer'
import PhotoManager from '../components/PhotoManager'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { createVenue, unitWord } from '../lib/venues'
import { CATEGORIES, AMENITIES } from '../data/categories'
import { peso } from '../lib/format'

const TYPE_OPTIONS = CATEGORIES.filter((c) => c.id !== 'all')

interface HostForm {
  name: string
  city: string
  area: string
  capacity: string | number
  pricePerHour: string | number
  blurb: string
  hostType: string
  businessName: string
  priceUnit: string
  includedHours: string | number
}

// Steps 1..10 grouped into 3 phases. Step 0 is the intro.
const PHASES = [
  { name: 'Tell us about your space', range: [1, 3] },
  { name: 'Make it stand out', range: [4, 7] },
  { name: 'Set your price and publish', range: [8, 10] },
]
const LAST = 10

export default function HostNew() {
  const { user, displayName, loading: authLoading } = useAuth()
  const { refresh } = useVenues()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<HostForm>({ name: '', city: '', area: '', capacity: 50, pricePerHour: 5000, blurb: '', hostType: 'individual', businessName: '', priceUnit: 'hour', includedHours: '' })
  const [photos, setPhotos] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [amenities, setAmenities] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof HostForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value } as HostForm)
  const toggle = (list: string[], setList: (next: string[]) => void, val: string) =>
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  if (authLoading) {
    return <main className="min-h-[70vh] grid place-items-center py-[60px] px-5"><p className="text-ink-soft">Loading…</p></main>
  }

  if (!user) {
    return (
      <>
        <main className="min-h-[70vh] grid place-items-center py-[60px] px-5">
          <div className="max-w-[460px] mx-auto p-8 border border-line rounded-lg bg-white shadow-card">
            <h1 className="text-[26px] font-extrabold mb-2 text-center">List your venue</h1>
            <p className="text-center text-ink-soft text-[14.5px] mb-6">Create an account to start your listing.</p>
            <Link to="/signup" state={{ from: '/host/new' }} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ display: 'block', textAlign: 'center' }}>Create an account</Link>
            <p className="text-center text-ink-soft text-sm mt-[18px]">Already have an account? <Link to="/signin" state={{ from: '/host/new' }} className="text-brand font-semibold hover:underline">Sign in</Link></p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const hostName = form.hostType === 'business' ? form.businessName.trim() : displayName

  // Per-step validation gate for the Next button.
  const canNext = {
    1: types.length > 0,
    2: form.city.trim().length > 0,
    3: Number(form.capacity) > 0,
    4: true,
    5: true,
    6: form.name.trim().length > 0,
    7: true,
    8: Number(form.pricePerHour) > 0,
    9: form.hostType === 'individual' || form.businessName.trim().length > 0,
    10: true,
  }[step] ?? true

  const publish = async () => {
    setError('')
    try {
      setSaving(true)
      const { data, error } = await createVenue({
        owner_id: user.id,
        name: form.name,
        city: form.city,
        area: form.area || null,
        types,
        capacity: Number(form.capacity) || 50,
        price_per_hour: Number(form.pricePerHour) || 0,
        blurb: form.blurb || null,
        amenities,
        image_urls: photos,
        host_name: hostName,
        host_type: form.hostType,
        price_unit: form.priceUnit,
        included_hours: form.priceUnit !== 'hour' && form.includedHours ? Number(form.includedHours) : null,
      })
      if (error) { setError(error.message); return }
      if (!data?.id) { setError('Something went wrong saving your listing. Please try again.'); return }
      await refresh()
      navigate(`/venue/${data.id}`)
    } catch (e) {
      console.error('publish failed', e)
      setError('Something went wrong saving your listing. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const next = () => { if (step < LAST) setStep(step + 1) }
  const back = () => setStep(Math.max(0, step - 1))

  // ---------- Intro ----------
  if (step === 0) {
    return (
      <>
        <main className="py-14 pb-20">
          <div className="max-w-wrap mx-auto px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
              <div>
                <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">List your venue</span>
                <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.08] mt-2.5">It's easy to list your space on Gathr.</h1>
                <p className="text-ink-soft text-[17px] mt-4 max-w-[440px]">Tell us a few things about your venue and it goes live to people planning their next event across the Philippines.</p>
                <button className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" onClick={() => setStep(1)} style={{ width: 'auto', padding: '15px 28px', marginTop: 22 }}>Get started</button>
              </div>
              <ol className="list-none m-0 p-0 flex flex-col">
                {PHASES.map((p, i) => (
                  <li key={p.name} className="flex gap-[18px] py-5 border-t border-line items-start">
                    <span className="font-bold text-[20px] text-ink min-w-[28px]">{i + 1}</span>
                    <div>
                      <b className="text-[18px] block mb-[3px]">{p.name}</b>
                      <span className="text-ink-soft text-[14.5px]">{['What it\'s for, where it is, how many it holds.', 'Amenities, photos, a name, and a description.', 'Choose your hourly price, review, and publish.'][i]}</span>
                    </div>
                  </li>
                ))}
                <li className="flex gap-[18px] py-5 border-t border-b border-line items-start">
                  <span className="font-bold text-[20px] text-ink min-w-[28px]">{PHASES.length + 1}</span>
                  <div>
                    <b className="text-[18px] block mb-[3px]">Go live</b>
                    <span className="text-ink-soft text-[14.5px]">Your listing appears in Gathr search right away.</span>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <div className="min-h-[calc(100vh-74px)] flex flex-col">
      <div className="flex-1 flex items-center justify-center py-10 px-5 pb-[130px]">
        <div className="w-full max-w-[640px]">
          {step === 1 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">Which events is your space for?</h1>
              <p className="text-ink-soft text-base my-3 mb-7">Pick all that fit. You can change these later.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TYPE_OPTIONS.map((c) => {
                  const Icon = categoryIcon(c.icon)
                  const on = types.includes(c.id)
                  return (
                    <button key={c.id} type="button" className={`flex flex-col gap-3 items-start p-[18px] border rounded bg-white text-left transition-all duration-150 ${on ? 'border-brand shadow-[0_0_0_1px_var(--brand)] bg-tint' : 'border-line-strong hover:border-ink'}`} onClick={() => toggle(types, setTypes, c.id)}>
                      <Icon strokeWidth={1.6} className="w-[26px] h-[26px] text-ink" />
                      <span className="font-semibold text-[14.5px]">{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">Where's your space?</h1>
              <p className="text-ink-soft text-base my-3 mb-7">Guests search by city, so this matters.</p>
              <div className="mb-3.5">
                <label className="block text-[13px] font-bold mb-1.5 text-ink">City</label>
                <input autoFocus value={form.city} onChange={set('city')} placeholder="Cebu City" className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" />
              </div>
              <div className="mb-3.5">
                <label className="block text-[13px] font-bold mb-1.5 text-ink">Area / district <span className="font-normal text-ink-faint">(optional)</span></label>
                <input value={form.area} onChange={set('area')} placeholder="Lahug" className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">How many guests can it hold?</h1>
              <p className="text-ink-soft text-base my-3 mb-7">The maximum capacity for a single event.</p>
              <div className="flex items-center gap-7">
                <button type="button" onClick={() => setForm({ ...form, capacity: Math.max(1, (Number(form.capacity) || 0) - 10) })} aria-label="Decrease" className="w-12 h-12 rounded-full border border-line-strong grid place-items-center text-ink transition-colors duration-150 hover:border-ink"><Minus size={20} /></button>
                <input type="number" min="1" className="text-[30px] font-extrabold min-w-[70px] text-center border-0 border-b-2 border-line-strong bg-transparent text-ink py-1 px-0 outline-none focus:border-b-brand" value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })} aria-label="Guest capacity" />
                <button type="button" onClick={() => setForm({ ...form, capacity: (Number(form.capacity) || 0) + 10 })} aria-label="Increase" className="w-12 h-12 rounded-full border border-line-strong grid place-items-center text-ink transition-colors duration-150 hover:border-ink"><Plus size={20} /></button>
              </div>
              <p className="text-ink-soft text-base mt-4">Type a number or use the buttons.</p>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">What does your space offer?</h1>
              <p className="text-ink-soft text-base my-3 mb-7">Tap everything that's included.</p>
              <div className="flex flex-wrap gap-2" style={{ maxWidth: 560 }}>
                {AMENITIES.map((a) => (
                  <button key={a} type="button" className={`py-2 px-3.5 border rounded-full text-[13px] font-semibold transition-all duration-150 ${amenities.includes(a) ? 'bg-ink text-white border-ink' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'}`} onClick={() => toggle(amenities, setAmenities, a)}>{a}</button>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">Add a few photos.</h1>
              <p className="text-ink-soft text-base my-3 mb-7">Upload from your phone or computer. Great photos get more bookings.</p>
              <PhotoManager photos={photos} onChange={setPhotos} userId={user.id} />
            </>
          )}

          {step === 6 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">Give your space a name.</h1>
              <p className="text-ink-soft text-base my-3 mb-7">Short, specific names work best.</p>
              <div className="mb-3.5">
                <input autoFocus maxLength={50} value={form.name} onChange={set('name')} placeholder="The Glass House" className="w-full py-4 px-4 border border-line-strong rounded-xl font-[inherit] text-lg bg-white text-ink outline-none focus:border-brand" />
                <div className="text-[13px] font-semibold text-brand mt-2">{form.name.length}/50</div>
              </div>
            </>
          )}

          {step === 7 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">Describe your space.</h1>
              <p className="text-ink-soft text-base my-3 mb-7">What makes it special, who it suits, what's included.</p>
              <div className="mb-3.5">
                <textarea autoFocus value={form.blurb} onChange={set('blurb')} placeholder="Open-air rooftop with skyline views and a built-in bar…" className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand resize-y min-h-[150px]" />
              </div>
            </>
          )}

          {step === 8 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">How do you charge?</h1>
              <p className="text-ink-soft text-base my-3 mb-7">Pick how guests pay, then set your rate. You can change it anytime.</p>
              <div className="flex flex-wrap gap-2 mb-[22px]" style={{ maxWidth: 460 }}>
                {[['hour', 'Per hour'], ['head', 'Per head'], ['event', 'Per event (flat)']].map(([val, label]) => (
                  <button type="button" key={val} className={`py-2 px-3.5 border rounded-full text-[13px] font-semibold transition-all duration-150 ${form.priceUnit === val ? 'bg-ink text-white border-ink' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'}`} onClick={() => setForm({ ...form, priceUnit: val })}>{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-1 border-b-2 border-ink w-fit pb-2">
                <span className="text-[40px] font-extrabold">₱</span>
                <input type="number" min="0" step="100" value={form.pricePerHour} onChange={set('pricePerHour')} className="border-0 outline-0 text-[40px] font-extrabold w-[200px] text-ink bg-transparent" />
                <span className="text-ink-soft text-lg self-end pb-2">/ {unitWord(form.priceUnit)}</span>
              </div>
              {form.priceUnit !== 'hour' && (
                <div className="mt-[22px] max-w-[280px]">
                  <label className="block text-[13px] font-bold mb-1.5 text-ink">Hours included <span className="font-normal text-ink-faint">(optional)</span></label>
                  <input type="number" min="1" max="24" value={form.includedHours} onChange={set('includedHours')} placeholder="e.g. 4" className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" />
                  <div className="text-[13px] font-semibold text-brand mt-2">How long the {form.priceUnit === 'head' ? 'per-head' : 'flat'} rate covers. Price stays the same regardless of hours.</div>
                </div>
              )}
              {form.priceUnit === 'head' && <p className="text-ink-soft text-[15px] mt-3.5">Good for venues that include food or catering. Total = rate × guests.</p>}
            </>
          )}

          {step === 9 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">Who's listing this venue?</h1>
              <p className="text-ink-soft text-base my-3 mb-7">This is the name guests see on your listing.</p>
              <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 460 }}>
                <button type="button" className={`flex flex-col gap-3 items-start p-[18px] border rounded bg-white text-left transition-all duration-150 ${form.hostType === 'individual' ? 'border-brand shadow-[0_0_0_1px_var(--brand)] bg-tint' : 'border-line-strong hover:border-ink'}`} onClick={() => setForm({ ...form, hostType: 'individual' })}>
                  <User strokeWidth={1.6} className="w-[26px] h-[26px] text-ink" />
                  <span className="font-semibold text-[14.5px]">An individual</span>
                </button>
                <button type="button" className={`flex flex-col gap-3 items-start p-[18px] border rounded bg-white text-left transition-all duration-150 ${form.hostType === 'business' ? 'border-brand shadow-[0_0_0_1px_var(--brand)] bg-tint' : 'border-line-strong hover:border-ink'}`} onClick={() => setForm({ ...form, hostType: 'business' })}>
                  <Building2 strokeWidth={1.6} className="w-[26px] h-[26px] text-ink" />
                  <span className="font-semibold text-[14.5px]">A business</span>
                </button>
              </div>
              {form.hostType === 'business' ? (
                <div className="mt-[22px] max-w-[460px]">
                  <label className="block text-[13px] font-bold mb-1.5 text-ink">Business name</label>
                  <input autoFocus value={form.businessName} onChange={set('businessName')} placeholder="Skyline Events Co." className="w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand" />
                </div>
              ) : (
                <p className="text-ink-soft text-[15px] mt-[18px]">Listing as <b className="text-ink">{displayName}</b>.</p>
              )}
            </>
          )}

          {step === 10 && (
            <>
              <h1 className="text-[clamp(26px,3.4vw,34px)] font-extrabold leading-[1.12]">Review your listing.</h1>
              <p className="text-ink-soft text-base my-3 mb-7">Here's what guests will see. Publish when you're ready.</p>
              <div className="flex flex-col sm:flex-row gap-[18px] border border-line-strong rounded-lg p-4 bg-white shadow-card">
                <div className="w-full sm:w-[160px] h-[130px] rounded-[14px] overflow-hidden bg-gradient shrink-0">
                  {photos[0]
                    ? <img src={photos[0]} alt={form.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center text-white opacity-80"><ImagePlus size={26} /></div>}
                </div>
                <div className="flex flex-col gap-1 py-1">
                  <b className="text-[19px]">{form.name || 'Untitled space'}</b>
                  <span className="text-ink-soft text-sm">{[form.area, form.city].filter(Boolean).join(', ')}</span>
                  <span className="text-ink-soft text-sm">Up to {form.capacity} guests · {types.map((t) => TYPE_OPTIONS.find((c) => c.id === t)?.label).filter(Boolean).join(', ')}</span>
                  <span className="text-ink text-base font-bold mt-1.5">{peso(Number(form.pricePerHour))} <em className="not-italic text-ink-soft font-normal text-sm">/ {unitWord(form.priceUnit)}</em></span>
                  <span className="text-ink-soft text-sm">Hosted by {hostName || displayName}{form.hostType === 'business' ? ' · Business' : ''}</span>
                  {amenities.length > 0 && <span className="text-brand font-semibold">{amenities.length} amenit{amenities.length === 1 ? 'y' : 'ies'}</span>}
                </div>
              </div>
              {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mt-4">{error}</div>}
            </>
          )}
        </div>
      </div>

      {/* Bottom progress + nav */}
      <div className="fixed left-0 right-0 bottom-0 bg-white border-t border-line z-30">
        <div className="flex gap-1.5 p-0">
          {PHASES.map((p) => {
            const [a, b] = p.range
            const fill = step > b ? 100 : step < a ? 0 : ((step - a + 1) / (b - a + 1)) * 100
            return <span key={p.name} className="flex-1 h-[5px] bg-line overflow-hidden"><i className="block h-full bg-ink transition-[width] duration-300 ease-in-out" style={{ width: fill + '%' }} /></span>
          })}
        </div>
        <div className="max-w-wrap mx-auto px-10 flex items-center justify-between py-4 px-10">
          <button className="font-bold text-[15px] text-ink underline" onClick={back}>Back</button>
          {step < LAST ? (
            <button className="w-auto inline-flex items-center gap-2 bg-brand text-white font-bold text-[15px] py-3 px-6 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed" onClick={next} disabled={!canNext}>
              Next <ArrowRight size={18} />
            </button>
          ) : (
            <button className="w-auto inline-flex items-center gap-2 bg-brand text-white font-bold text-[15px] py-3 px-6 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed" onClick={publish} disabled={saving}>
              {saving ? 'Publishing…' : <>Publish <Check size={18} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
