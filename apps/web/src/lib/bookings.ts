import { apiJson, ApiError } from './api'
import type { BookingRow } from '../types/db'
import type { DbError } from '../types'

export async function createBooking(booking: Partial<BookingRow>): Promise<{ data: BookingRow | null; error: DbError | null }> {
  try {
    const data = await apiJson<BookingRow>('/api/bookings', { method: 'POST', body: booking })
    return { data, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function fetchBooking(id: string): Promise<{ data: BookingRow | null; error: DbError | null }> {
  try {
    if (!id) return { data: null, error: null }
    const data = await apiJson<BookingRow>(`/api/bookings/${id}`)
    return { data, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function listBookings(userId: string): Promise<{ data: BookingRow[] | null; error: DbError | null }> {
  try {
    if (!userId) return { data: [], error: { message: 'User ID is required.' } }
    const { bookings } = await apiJson<{ bookings: BookingRow[] | null }>('/api/bookings')
    return { data: bookings, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function cancelBooking(id: string): Promise<{ error: DbError | null }> {
  try {
    await apiJson(`/api/bookings/${id}`, { method: 'DELETE' })
    return { error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { error: { message } }
  }
}

// Host side: requests on a set of the host's own venue ids.
export async function listRequestsForVenues(venueIds: string[]): Promise<{ data: BookingRow[] | null; error: DbError | null }> {
  try {
    if (!venueIds.length) return { data: [], error: null }
    const { bookings } = await apiJson<{ bookings: BookingRow[] | null }>(
      `/api/bookings/requests?venue_ids=${venueIds.join(',')}`,
    )
    return { data: bookings, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function setBookingStatus(id: string, status: string): Promise<{ error: DbError | null }> {
  try {
    await apiJson(`/api/bookings/${id}`, { method: 'PATCH', body: { status } })
    return { error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { error: { message } }
  }
}