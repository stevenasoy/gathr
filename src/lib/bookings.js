import { supabase, isSupabaseConfigured } from './supabase'

export async function createBooking(booking) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase.from('bookings').insert(booking).select().single()
}

export async function fetchBooking(id) {
  if (!isSupabaseConfigured || !id) return { data: null, error: null }
  return supabase.from('bookings').select('*').eq('id', id).single()
}

export async function listBookings(userId) {
  if (!isSupabaseConfigured) return { data: [], error: null }
  return supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function cancelBooking(id) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase.from('bookings').delete().eq('id', id)
}

// Host side: requests on a set of the host's own venue ids.
export async function listRequestsForVenues(venueIds) {
  if (!isSupabaseConfigured || !venueIds.length) return { data: [], error: null }
  return supabase
    .from('bookings')
    .select('*')
    .in('venue_id', venueIds)
    .order('created_at', { ascending: false })
}

export async function setBookingStatus(id, status) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase.from('bookings').update({ status }).eq('id', id)
}
