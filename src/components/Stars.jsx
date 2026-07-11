import { useState } from 'react'
import { Star } from 'lucide-react'

// Read-only star row (review cards).
export function Stars({ rating, size = 14 }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= rating ? 'star on' : 'star'} />
      ))}
    </span>
  )
}

// Interactive 1–5 picker (leave-a-review form).
export function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const lit = hover || value
  return (
    <div className="star-picker" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" role="radio" aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <Star size={26} className={n <= lit ? 'star on' : 'star'} />
        </button>
      ))}
    </div>
  )
}
