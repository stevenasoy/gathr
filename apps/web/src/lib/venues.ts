import { apiJson, ApiError } from './api'
import type { VenueRow } from '../types/db'
import type { Venue, PriceUnit, DbError } from '../types'

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80'

// Map a DB venue row into the same shape the app uses for seed venues.
export function normalizeVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    city: row.city,
    area: row.area && row.area !== row.city ? row.area : null,
    types: row.types || [],
    capacity: row.capacity,
    pricePerHour: row.price_per_hour,
    rating: null, // new listing, no rating yet
    reviews: 0,
    badge: 'New on Gathr',
    host: {
      name: row.host_name || 'Host',
      type: (row.host_type || 'individual') as 'individual' | 'business',
      superhost: false,
      since: new Date(row.created_at).getFullYear(),
    },
    amenities: row.amenities || [],
    blurb: row.blurb || '',
    images: row.image_urls && row.image_urls.length ? row.image_urls : [DEFAULT_IMG],
    status: row.status || 'live',
    priceUnit: (row.price_unit || 'hour') as PriceUnit,
    includedHours: row.included_hours || null,
    isHostListing: true,
  }
}

// Display suffix + booking multiplier label for a pricing unit.
export const unitWord = (u: PriceUnit | string | undefined): PriceUnit =>
  (u === 'head' ? 'head' : u === 'event' ? 'event' : 'hour')

export async function fetchPublicVenues(): Promise<Venue[]> {
  try {
    const { venues } = await apiJson<{ venues: VenueRow[] | null }>('/api/venues', { auth: 'none' })
    return (venues || []).map(normalizeVenue)
  } catch (e) {
    console.error('fetchPublicVenues failed, falling back to empty', e)
    return []
  }
}

export async function fetchVenue(id: string): Promise<Venue | null> {
  try {
    const data = await apiJson<VenueRow>(`/api/venues/${id}`, { auth: 'optional' })
    return normalizeVenue(data)
  } catch (e) {
    console.error('fetchVenue failed', e)
    return null
  }
}

export async function fetchMyVenues(ownerId: string): Promise<{ data: Venue[]; error: DbError | null }> {
  try {
    if (!ownerId) {
      return { data: [], error: { message: 'Owner ID is required.' } }
    }
    const { venues } = await apiJson<{ venues: VenueRow[] | null }>('/api/venues/my')
    return { data: (venues || []).map(normalizeVenue), error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: [], error: { message } }
  }
}

export async function createVenue(venue: Partial<VenueRow>): Promise<{ data: VenueRow | null; error: DbError | null }> {
  try {
    const data = await apiJson<VenueRow>('/api/venues', { method: 'POST', body: venue })
    return { data, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function updateVenue(id: string, fields: Partial<VenueRow>): Promise<{ error: DbError | null }> {
  try {
    await apiJson(`/api/venues/${id}`, { method: 'PUT', body: fields })
    return { error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { error: { message } }
  }
}

export async function setVenueStatus(id: string, status: string): Promise<{ error: DbError | null }> {
  return updateVenue(id, { status })
}

export async function deleteVenue(id: string): Promise<{ error: DbError | null }> {
  try {
    await apiJson(`/api/venues/${id}`, { method: 'DELETE' })
    return { error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { error: { message } }
  }
}