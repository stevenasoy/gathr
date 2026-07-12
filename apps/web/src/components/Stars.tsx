import { useState } from 'react'
import { Star } from 'lucide-react'

// Read-only star row (review cards).
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= rating ? 'text-gold fill-gold' : 'text-line-strong'} />
      ))}
    </span>
  )
}

// Interactive 1–5 picker (leave-a-review form).
export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  const lit = hover || value
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" role="radio" aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="bg-transparent border-0 p-1 cursor-pointer leading-none"
        >
          <Star size={26} className={`transition-colors duration-100 ${n <= lit ? 'text-gold fill-gold' : 'text-line-strong'}`} />
        </button>
      ))}
    </div>
  )
}
