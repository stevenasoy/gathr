// App-domain types. Booking/Conversation/Message/Review are raw DB rows
// (pages consume snake_case directly); Venue is the normalized camelCase shape
// shared by seed venues and host listings (see lib/venues.ts normalizeVenue).

import type { PostgrestError } from '@supabase/supabase-js'
import type { BookingRow, ConversationRow, MessageRow, ReviewRow } from './db'

// A supabase error OR our ad-hoc "backend not connected" fallback share a
// `.message`, which is all callers read. Unioning keeps both paths typed.
export type DbError = PostgrestError | { message: string }
export type QueryResult<T> = { data: T | null; error: DbError | null }

export type { VenueRow, BookingRow, ConversationRow, MessageRow, ReviewRow, SavedVenueRow, Database } from './db'

export type Booking = BookingRow
export type Conversation = ConversationRow
export type Message = MessageRow
export type Review = ReviewRow

export type PriceUnit = 'hour' | 'head' | 'event'
export type Mode = 'traveling' | 'hosting'

export interface VenueHost {
  name: string
  type?: 'individual' | 'business'
  superhost: boolean
  since: number
}

export interface Venue {
  id: string
  name: string
  city: string
  area: string | null
  types: string[]
  capacity: number
  pricePerHour: number
  rating: number | null
  reviews: number
  badge: string | null
  host: VenueHost
  amenities: string[]
  blurb: string
  images: string[]
  // Host-listing extras (absent on seed venues):
  ownerId?: string
  status?: string
  priceUnit?: PriceUnit
  includedHours?: number | null
  isHostListing?: true
}

export interface Category {
  id: string
  label: string
  icon: string
}

// Keep Amenity as an open string (not a closed union) so test/sample amenity
// strings compile without edits.
export type Amenity = string