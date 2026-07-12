import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import { CITIES } from '../data/venues'
import { CATEGORIES } from '../data/categories'

interface SearchBarProps {
  compact?: boolean
  initial?: { where?: string; type?: string; date?: string; guests?: string }
}

// Shared search pill. `compact` shrinks padding for the sticky search page bar.
export default function SearchBar({ compact = false, initial = {} }: SearchBarProps) {
  const navigate = useNavigate()
  const [where, setWhere] = useState(initial.where || '')
  const [type, setType] = useState(initial.type || '')
  const [date, setDate] = useState(initial.date || '')
  const [guests, setGuests] = useState(initial.guests || '')

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (where) params.set('where', where)
    if (type) params.set('type', type)
    if (date) params.set('date', date)
    if (guests) params.set('guests', guests)
    navigate(`/search?${params.toString()}`)
  }

  const segPadding = compact ? '6px 16px' : undefined

  return (
    <form className="pill" onSubmit={submit} role="search">
      <div className="pill-seg pill-seg--select" style={segPadding ? { padding: segPadding } : undefined}>
        <label htmlFor="sb-where">Where</label>
        <input id="sb-where" list="cities" placeholder="Search city" value={where} onChange={(e) => setWhere(e.target.value)} />
        <datalist id="cities">
          {CITIES.map((c) => <option key={c} value={c} />)}
        </datalist>
        <ChevronDown size={16} className="pill-seg-caret" />
      </div>

      <div className="pill-seg pill-seg--select" style={segPadding ? { padding: segPadding } : undefined}>
        <label htmlFor="sb-type">Event type</label>
        <select id="sb-type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Any event</option>
          {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="pill-seg-caret" />
      </div>

      <div className="pill-seg" style={segPadding ? { padding: segPadding } : undefined}>
        <label htmlFor="sb-date">Date</label>
        <input
          id="sb-date"
          type={date ? 'date' : 'text'}
          placeholder="Add date"
          onFocus={(e) => {
            e.target.type = 'date';
            if (typeof e.target.showPicker === 'function') {
              try { e.target.showPicker(); } catch { /* user gesture may block picker; fallback works via click */ }
            }
          }}
          onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="pill-seg" style={segPadding ? { padding: segPadding } : undefined}>
        <label htmlFor="sb-guests">Guests</label>
        <input id="sb-guests" type="number" min="1" placeholder="Add guests" value={guests} onChange={(e) => setGuests(e.target.value)} />
      </div>

      <button className="pill-go" type="submit">
        <Search size={18} />
        {!compact && <span>Search</span>}
      </button>
    </form>
  )
}
