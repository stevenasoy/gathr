import { supabase, isSupabaseConfigured } from './supabase'

// Real guest reviews (table: reviews, see supabase/v4-schema.sql).
// One review per booking; RLS only lets the Gatherer of a confirmed, past
// booking insert. Reads are public.

export async function listReviews(venueId) {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function getReviewForBooking(bookingId) {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle()
  return data || null
}

export async function createReview({ booking_id, venue_id, user_id, author_name, rating, body }) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase
    .from('reviews')
    .insert({ booking_id, venue_id, user_id, author_name, rating, body: body || null })
    .select()
    .single()
}

// Aggregate { venue_id: { count, avg } } for the whole catalog, so cards and
// sort-by-rating reflect real reviews. Cheap at this scale (one select).
export async function fetchReviewStats() {
  if (!isSupabaseConfigured) return {}
  const { data, error } = await supabase.from('reviews').select('venue_id, rating')
  if (error || !data) return {}
  const stats = {}
  for (const r of data) {
    const s = (stats[r.venue_id] ||= { count: 0, sum: 0 })
    s.count += 1
    s.sum += r.rating
  }
  for (const id in stats) {
    stats[id].avg = Math.round((stats[id].sum / stats[id].count) * 100) / 100
  }
  return stats
}
