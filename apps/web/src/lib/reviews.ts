import { apiJson, ApiError } from './api'
import type { Review, DbError } from '../types'

export interface ReviewStat {
  count: number
  sum: number
  avg: number
}

// Real guest reviews (table: reviews, see supabase/v4-schema.sql).
// One review per booking; RLS only lets the Gatherer of a confirmed, past
// booking insert. Reads are public.
export async function listReviews(venueId: string): Promise<{ data: Review[]; error: DbError | null }> {
  try {
    const { reviews } = await apiJson<{ reviews: Review[] | null }>(`/api/reviews/venue/${venueId}`, { auth: 'none' })
    return { data: reviews || [], error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: [], error: { message } }
  }
}

export async function getReviewForBooking(bookingId: string): Promise<Review | null> {
  try {
    const data = await apiJson<Review | null>(`/api/reviews/booking/${bookingId}`)
    return data || null
  } catch (e) {
    console.error('getReviewForBooking failed', e)
    return null
  }
}

export async function createReview({
  booking_id,
  venue_id,
  user_id,
  author_name,
  rating,
  body,
}: {
  booking_id: string
  venue_id: string
  user_id: string
  author_name: string
  rating: number
  body: string | null
}): Promise<{ data: Review | null; error: DbError | null }> {
  try {
    if (!user_id) return { data: null, error: { message: 'Authentication required.' } }
    const data = await apiJson<Review>('/api/reviews', {
      method: 'POST',
      body: { booking_id, venue_id, author_name, rating, body: body || null },
    })
    return { data, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

// Aggregate { venue_id: { count, avg } } for the whole catalog, so cards and
// sort-by-rating reflect real reviews. Cheap at this scale (one select).
export async function fetchReviewStats(): Promise<Record<string, ReviewStat>> {
  try {
    const { stats } = await apiJson<{ stats: Record<string, ReviewStat> | null }>('/api/reviews/stats', { auth: 'none' })
    return stats || {}
  } catch (e) {
    console.error('fetchReviewStats failed', e)
    return {}
  }
}