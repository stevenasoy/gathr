import { supabase, isSupabaseConfigured } from './supabase'

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80'

// Map a DB venue row into the same shape the app uses for seed venues.
export function normalizeVenue(row) {
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
      type: row.host_type || 'individual',
      superhost: false,
      since: new Date(row.created_at).getFullYear(),
    },
    amenities: row.amenities || [],
    blurb: row.blurb || '',
    images: row.image_urls && row.image_urls.length ? row.image_urls : [DEFAULT_IMG],
    status: row.status || 'live',
    priceUnit: row.price_unit || 'hour',
    includedHours: row.included_hours || null,
    isHostListing: true,
  }
}

// Display suffix + booking multiplier label for a pricing unit.
export const unitWord = (u) => (u === 'head' ? 'head' : u === 'event' ? 'event' : 'hour')

export async function fetchPublicVenues() {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('status', 'live')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data || []).map(normalizeVenue)
}

export async function fetchVenue(id) {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.from('venues').select('*').eq('id', id).single()
  return data ? normalizeVenue(data) : null
}

export async function fetchMyVenues(ownerId) {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  return { data: (data || []).map(normalizeVenue), error }
}

export async function createVenue(venue) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase.from('venues').insert(venue).select().single()
}

export async function updateVenue(id, fields) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase.from('venues').update(fields).eq('id', id).select().single()
}

export async function setVenueStatus(id, status) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase.from('venues').update({ status }).eq('id', id)
}

export async function deleteVenue(id) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase.from('venues').delete().eq('id', id)
}
