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
    <div className="relative bg-ink/[0.02] border border-ink/[0.04] p-2 rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[5px] hover:shadow-bar hover:bg-ink/[0.03]">
      <div className="bg-surface rounded-[18px] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] h-full">
        <Link to={`/venue/${venue.id}`} className="block group">
          <div className="relative aspect-[3/2] rounded overflow-hidden bg-gradient border border-line">
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
                className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              />
            )}
            {venue.badge && <span className="absolute top-3 left-3 bg-white/[0.96] text-ink text-[11px] font-bold uppercase tracking-[0.05em] py-[5px] px-2.5 rounded-full shadow-card border border-black/[0.04]">{venue.badge}</span>}
          </div>

          <div className="pt-3 px-0.5 pb-0" style={{ padding: '16px 14px 14px' }}>
            <div className="flex justify-between gap-2.5 items-baseline">
              <span className="font-outfit font-bold text-base text-ink tracking-[-0.01em]">{venue.name}</span>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap font-mono text-ink-soft">{venue.rating ? <><Star className="text-gold fill-gold w-3.5 h-3.5" /> {venue.rating}</> : 'New'}</span>
            </div>
            <div className="text-ink-soft text-[13.5px] mt-0.5">{venue.area ? `${venue.area}, ` : ''}{venue.city}</div>
            <div className="text-ink-soft text-[13.5px] mt-0.5">Up to {venue.capacity} guests</div>
            <div className="mt-1.5 text-sm text-ink-soft">
              <b className="font-mono font-bold text-[15.5px] text-ink">{peso(venue.pricePerHour)}</b> / {unitWord(venue.priceUnit)}
            </div>
          </div>
        </Link>
      </div>
      {venue.isHostListing && (
      <button
        type="button"
        className={[
          'absolute top-4 right-4 w-[34px] h-[34px] grid place-items-center text-white z-10',
          saved && '[&_svg]:fill-rose-600 [&_svg]:text-rose-600',
        ].filter(Boolean).join(' ')}
        aria-label={saved ? 'Remove from saved' : 'Save venue'}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(venue.id) }}
      >
        <Heart size={22} strokeWidth={2} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-150 hover:scale-[1.12]" />
      </button>
      )}
    </div>
  )
}

export default memo(VenueCard)
