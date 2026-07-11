import { useState } from 'react'
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
  const [form, setForm] = useState({ name: '', city: '', area: '', capacity: 50, pricePerHour: 5000, blurb: '', hostType: 'individual', businessName: '', priceUnit: 'hour', includedHours: '' })
  const [photos, setPhotos] = useState([])
  const [types, setTypes] = useState([])
  const [amenities, setAmenities] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggle = (list, setList, val) =>
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  if (authLoading) {
    return <main className="auth-page"><p style={{ color: 'var(--ink-soft)' }}>Loading…</p></main>
  }

  if (!user) {
    return (
      <>
        <main className="auth-page">
          <div className="form-card">
            <h1>List your venue</h1>
            <p className="form-sub">Create an account to start your listing.</p>
            <Link to="/signup" state={{ from: '/host/new' }} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>Create an account</Link>
            <p className="form-foot">Already have an account? <Link to="/signin" state={{ from: '/host/new' }}>Sign in</Link></p>
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
    setSaving(false)
    if (error) { setError(error.message); return }
    if (!data?.id) { setError('Something went wrong saving your listing. Please try again.'); return }
    await refresh()
    navigate(`/venue/${data.id}`)
  }

  const next = () => { if (step < LAST) setStep(step + 1) }
  const back = () => setStep(Math.max(0, step - 1))

  // ---------- Intro ----------
  if (step === 0) {
    return (
      <>
        <main className="wizard-intro">
          <div className="wrap">
            <div className="wizard-intro-grid">
              <div>
                <span className="page-eyebrow">List your venue</span>
                <h1>It's easy to list your space on Gathr.</h1>
                <p>Tell us a few things about your venue and it goes live to people planning their next event across the Philippines.</p>
                <button className="btn-primary" onClick={() => setStep(1)} style={{ width: 'auto', padding: '15px 28px', marginTop: 22 }}>Get started</button>
              </div>
              <ol className="step-cards">
                {PHASES.map((p, i) => (
                  <li key={p.name}>
                    <span className="step-num">{i + 1}</span>
                    <div>
                      <b>{p.name}</b>
                      <span>{['What it\'s for, where it is, how many it holds.', 'Amenities, photos, a name, and a description.', 'Choose your hourly price, review, and publish.'][i]}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <div className="wizard">
      <div className="wizard-body">
        <div className="wizard-step">
          {step === 1 && (
            <>
              <h1 className="wizard-h">Which events is your space for?</h1>
              <p className="wizard-sub">Pick all that fit. You can change these later.</p>
              <div className="type-grid">
                {TYPE_OPTIONS.map((c) => {
                  const Icon = categoryIcon(c.icon)
                  const on = types.includes(c.id)
                  return (
                    <button key={c.id} type="button" className={'type-card' + (on ? ' on' : '')} onClick={() => toggle(types, setTypes, c.id)}>
                      <Icon strokeWidth={1.6} />
                      <span>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="wizard-h">Where's your space?</h1>
              <p className="wizard-sub">Guests search by city, so this matters.</p>
              <div className="form-row"><label>City</label>
                <input autoFocus value={form.city} onChange={set('city')} placeholder="Cebu City" /></div>
              <div className="form-row"><label>Area / district <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span></label>
                <input value={form.area} onChange={set('area')} placeholder="Lahug" /></div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="wizard-h">How many guests can it hold?</h1>
              <p className="wizard-sub">The maximum capacity for a single event.</p>
              <div className="counter">
                <button type="button" onClick={() => setForm({ ...form, capacity: Math.max(1, (Number(form.capacity) || 0) - 10) })} aria-label="Decrease"><Minus size={20} /></button>
                <input type="number" min="1" className="counter-val counter-input" value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })} aria-label="Guest capacity" />
                <button type="button" onClick={() => setForm({ ...form, capacity: (Number(form.capacity) || 0) + 10 })} aria-label="Increase"><Plus size={20} /></button>
              </div>
              <p className="wizard-sub" style={{ marginTop: 16 }}>Type a number or use the buttons.</p>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="wizard-h">What does your space offer?</h1>
              <p className="wizard-sub">Tap everything that's included.</p>
              <div className="chiprow" style={{ maxWidth: 560 }}>
                {AMENITIES.map((a) => (
                  <button key={a} type="button" className={'chip' + (amenities.includes(a) ? ' on' : '')} onClick={() => toggle(amenities, setAmenities, a)}>{a}</button>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="wizard-h">Add a few photos.</h1>
              <p className="wizard-sub">Upload from your phone or computer. Great photos get more bookings.</p>
              <PhotoManager photos={photos} onChange={setPhotos} userId={user.id} />
            </>
          )}

          {step === 6 && (
            <>
              <h1 className="wizard-h">Give your space a name.</h1>
              <p className="wizard-sub">Short, specific names work best.</p>
              <div className="form-row">
                <input autoFocus maxLength={50} value={form.name} onChange={set('name')} placeholder="The Glass House" style={{ fontSize: 18, padding: '16px' }} />
                <div className="range-val">{form.name.length}/50</div>
              </div>
            </>
          )}

          {step === 7 && (
            <>
              <h1 className="wizard-h">Describe your space.</h1>
              <p className="wizard-sub">What makes it special, who it suits, what's included.</p>
              <div className="form-row">
                <textarea autoFocus value={form.blurb} onChange={set('blurb')} placeholder="Open-air rooftop with skyline views and a built-in bar…" style={{ minHeight: 150 }} />
              </div>
            </>
          )}

          {step === 8 && (
            <>
              <h1 className="wizard-h">How do you charge?</h1>
              <p className="wizard-sub">Pick how guests pay, then set your rate. You can change it anytime.</p>
              <div className="chiprow" style={{ marginBottom: 22, maxWidth: 460 }}>
                {[['hour', 'Per hour'], ['head', 'Per head'], ['event', 'Per event (flat)']].map(([val, label]) => (
                  <button type="button" key={val} className={'chip' + (form.priceUnit === val ? ' on' : '')} onClick={() => setForm({ ...form, priceUnit: val })}>{label}</button>
                ))}
              </div>
              <div className="price-input">
                <span className="price-peso">₱</span>
                <input type="number" min="0" step="100" value={form.pricePerHour} onChange={set('pricePerHour')} />
                <span className="price-unit">/ {unitWord(form.priceUnit)}</span>
              </div>
              {form.priceUnit !== 'hour' && (
                <div className="form-row" style={{ marginTop: 22, maxWidth: 280 }}>
                  <label>Hours included <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span></label>
                  <input type="number" min="1" max="24" value={form.includedHours} onChange={set('includedHours')} placeholder="e.g. 4" />
                  <div className="range-val">How long the {form.priceUnit === 'head' ? 'per-head' : 'flat'} rate covers. Price stays the same regardless of hours.</div>
                </div>
              )}
              {form.priceUnit === 'head' && <p className="dash-muted" style={{ marginTop: 14 }}>Good for venues that include food or catering. Total = rate × guests.</p>}
            </>
          )}

          {step === 9 && (
            <>
              <h1 className="wizard-h">Who's listing this venue?</h1>
              <p className="wizard-sub">This is the name guests see on your listing.</p>
              <div className="type-grid" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 460 }}>
                <button type="button" className={'type-card' + (form.hostType === 'individual' ? ' on' : '')} onClick={() => setForm({ ...form, hostType: 'individual' })}>
                  <User strokeWidth={1.6} />
                  <span>An individual</span>
                </button>
                <button type="button" className={'type-card' + (form.hostType === 'business' ? ' on' : '')} onClick={() => setForm({ ...form, hostType: 'business' })}>
                  <Building2 strokeWidth={1.6} />
                  <span>A business</span>
                </button>
              </div>
              {form.hostType === 'business' ? (
                <div className="form-row" style={{ marginTop: 22, maxWidth: 460 }}>
                  <label>Business name</label>
                  <input autoFocus value={form.businessName} onChange={set('businessName')} placeholder="Skyline Events Co." />
                </div>
              ) : (
                <p className="dash-muted" style={{ marginTop: 18 }}>Listing as <b style={{ color: 'var(--ink)' }}>{displayName}</b>.</p>
              )}
            </>
          )}

          {step === 10 && (
            <>
              <h1 className="wizard-h">Review your listing.</h1>
              <p className="wizard-sub">Here's what guests will see. Publish when you're ready.</p>
              <div className="review-card">
                <div className="review-photo">
                  {photos[0]
                    ? <img src={photos[0]} alt={form.name} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    : <div className="review-photo-empty"><ImagePlus size={26} /></div>}
                </div>
                <div className="review-info">
                  <b>{form.name || 'Untitled space'}</b>
                  <span>{[form.area, form.city].filter(Boolean).join(', ')}</span>
                  <span>Up to {form.capacity} guests · {types.map((t) => TYPE_OPTIONS.find((c) => c.id === t)?.label).filter(Boolean).join(', ')}</span>
                  <span className="review-price">{peso(form.pricePerHour)} <em>/ {unitWord(form.priceUnit)}</em></span>
                  <span>Hosted by {hostName || displayName}{form.hostType === 'business' ? ' · Business' : ''}</span>
                  {amenities.length > 0 && <span className="review-amen">{amenities.length} amenit{amenities.length === 1 ? 'y' : 'ies'}</span>}
                </div>
              </div>
              {error && <div className="form-error" style={{ marginTop: 16 }}>{error}</div>}
            </>
          )}
        </div>
      </div>

      {/* Bottom progress + nav */}
      <div className="wizard-bar">
        <div className="wizard-progress">
          {PHASES.map((p) => {
            const [a, b] = p.range
            const fill = step > b ? 100 : step < a ? 0 : ((step - a + 1) / (b - a + 1)) * 100
            return <span key={p.name} className="wizard-seg"><i style={{ width: fill + '%' }} /></span>
          })}
        </div>
        <div className="wrap wizard-nav">
          <button className="wizard-back" onClick={back}>Back</button>
          {step < LAST ? (
            <button className="btn-primary wizard-next" onClick={next} disabled={!canNext}>
              Next <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn-primary wizard-next" onClick={publish} disabled={saving}>
              {saving ? 'Publishing…' : <>Publish <Check size={18} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
