import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, User, Building2 } from 'lucide-react'
import Footer from '../components/Footer'
import PhotoManager from '../components/PhotoManager'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { fetchVenue, updateVenue, unitWord } from '../lib/venues'
import { CATEGORIES, AMENITIES } from '../data/categories'

const TYPE_OPTIONS = CATEGORIES.filter((c) => c.id !== 'all')

export default function HostEdit() {
  const { id } = useParams()
  const { user, displayName, loading: authLoading } = useAuth()
  const { refresh } = useVenues()
  const navigate = useNavigate()

  const [form, setForm] = useState(null)
  const [photos, setPhotos] = useState([])
  const [types, setTypes] = useState([])
  const [amenities, setAmenities] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (authLoading) return
      if (!user) { setLoading(false); return }
      const v = await fetchVenue(id)
      if (!active) return
      if (!v || v.ownerId !== user.id) { setNotFound(true); setLoading(false); return }
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
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id, user, authLoading])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggle = (list, setList, val) =>
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  if (authLoading || loading) {
    return <main className="auth-page"><p style={{ color: 'var(--ink-soft)' }}>Loading…</p></main>
  }
  if (!user) {
    return (
      <>
        <main className="auth-page"><div className="form-card">
          <h1>Edit listing</h1>
          <p className="form-sub">Sign in to manage your listings.</p>
          <Link to="/signin" state={{ from: `/host/edit/${id}` }} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>Sign in</Link>
        </div></main>
        <Footer />
      </>
    )
  }
  if (notFound || !form) {
    return (
      <>
        <main className="wrap empty" style={{ paddingTop: 80 }}>
          <h3>Listing not found</h3>
          <Link to="/host/dashboard?tab=listings" className="btn-clear">Back to your listings</Link>
        </main>
        <Footer />
      </>
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!types.length) { setError('Pick at least one event type.'); return }
    if (form.hostType === 'business' && !form.businessName.trim()) { setError('Add your business name.'); return }
    setSaving(true)
    const image_urls = photos
    const { error: upErr } = await updateVenue(id, {
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
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    await refresh()
    navigate('/host/dashboard?tab=listings')
  }

  return (
    <>
      <main className="wrap" style={{ maxWidth: 720, paddingTop: 28, paddingBottom: 40 }}>
        <Link to="/host/dashboard?tab=listings" className="back-link"><ChevronLeft size={18} /> Your listings</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Edit listing</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 26 }}>Changes go live as soon as you save.</p>

        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label>Venue name</label>
            <input required value={form.name} onChange={set('name')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-row"><label>City</label><input required value={form.city} onChange={set('city')} /></div>
            <div className="form-row"><label>Area / district</label><input value={form.area} onChange={set('area')} /></div>
          </div>
          <div className="form-row">
            <label>Event types</label>
            <div className="chiprow">
              {TYPE_OPTIONS.map((c) => (
                <button type="button" key={c.id} className={'chip' + (types.includes(c.id) ? ' on' : '')} onClick={() => toggle(types, setTypes, c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label>How you charge</label>
            <div className="chiprow">
              {[['hour', 'Per hour'], ['head', 'Per head'], ['event', 'Per event (flat)']].map(([val, label]) => (
                <button type="button" key={val} className={'chip' + (form.priceUnit === val ? ' on' : '')} onClick={() => setForm({ ...form, priceUnit: val })}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-row"><label>Max capacity</label><input type="number" min="1" value={form.capacity} onChange={set('capacity')} /></div>
            <div className="form-row"><label>Price (₱ / {unitWord(form.priceUnit)})</label><input type="number" min="0" step="100" value={form.pricePerHour} onChange={set('pricePerHour')} /></div>
          </div>
          {form.priceUnit !== 'hour' && (
            <div className="form-row" style={{ maxWidth: 280 }}>
              <label>Hours included <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span></label>
              <input type="number" min="1" max="24" value={form.includedHours} onChange={set('includedHours')} placeholder="e.g. 4" />
            </div>
          )}
          <div className="form-row"><label>Description</label><textarea value={form.blurb} onChange={set('blurb')} /></div>
          <div className="form-row">
            <label>Amenities</label>
            <div className="chiprow">
              {AMENITIES.map((a) => (
                <button type="button" key={a} className={'chip' + (amenities.includes(a) ? ' on' : '')} onClick={() => toggle(amenities, setAmenities, a)}>{a}</button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label>Photos</label>
            <PhotoManager photos={photos} onChange={setPhotos} userId={user.id} />
          </div>
          <div className="form-row">
            <label>Listing as</label>
            <div className="chiprow">
              <button type="button" className={'chip' + (form.hostType === 'individual' ? ' on' : '')} onClick={() => setForm({ ...form, hostType: 'individual' })}>
                <User size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> An individual
              </button>
              <button type="button" className={'chip' + (form.hostType === 'business' ? ' on' : '')} onClick={() => setForm({ ...form, hostType: 'business' })}>
                <Building2 size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> A business
              </button>
            </div>
          </div>
          {form.hostType === 'business' ? (
            <div className="form-row"><label>Business name</label><input value={form.businessName} onChange={set('businessName')} placeholder="Skyline Events Co." /></div>
          ) : (
            <p className="dash-muted" style={{ marginTop: -4, marginBottom: 14 }}>Guests will see <b style={{ color: 'var(--ink)' }}>{displayName}</b> as the host.</p>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </main>
      <Footer />
    </>
  )
}
