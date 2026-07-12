import { useState, memo } from 'react'
import { Link } from 'react-router-dom'
import { Star, Heart } from 'lucide-react'
import { useSavedMethods } from '../context/SavedContext'
import { unitWord } from '../lib/venues'
import { peso } from '../lib/format'
import { srcSet, withWidth, cardSizes } from '../lib/images'
import type { Venue } from '../types'

function VenueCard({ venue }: { venue: Venue }) {
  const { isSaved, toggle } = useSavedMethods()
  const [imgOk, setImgOk] = useState(true)
  const saved = isSaved(venue.id)

  return (
    <div className="card-wrap" style={{ position: 'relative' }}>
      <Link to={`/venue/${venue.id}`} className="card">
        <div className="card-media" style={{ aspectRatio: '3/2' }}>
          {imgOk && (
            <img
              src={withWidth(venue.images[0], 800)}
              alt={venue.name}
              loading="lazy"
              decoding="async"
              width={800}
              height={533}
              sizes={cardSizes}
              srcSet={srcSet(venue.images[0])}
              onError={() => setImgOk(false)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {venue.badge && <span className="card-badge">{venue.badge}</span>}
        </div>

        <div className="card-body">
          <div className="card-top">
            <span className="card-name">{venue.name}</span>
            <span className="card-rate">{venue.rating ? <><Star /> {venue.rating}</> : 'New'}</span>
          </div>
          <div className="card-sub">{venue.area ? `${venue.area}, ` : ''}{venue.city}</div>
          <div className="card-sub">Up to {venue.capacity} guests</div>
          <div className="card-price"><b>{peso(venue.pricePerHour)}</b> / {unitWord(venue.priceUnit)}</div>
        </div>
      </Link>
      <button
        type="button"
        className={'card-fav' + (saved ? ' saved' : '')}
        aria-label={saved ? 'Remove from saved' : 'Save venue'}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(venue.id) }}
      >
        <Heart size={22} strokeWidth={2} />
      </button>
    </div>
  )
}

export default memo(VenueCard)
