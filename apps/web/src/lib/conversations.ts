import { apiJson, ApiError } from './api'
import type { ConversationRow } from '../types/db'
import type { DbError } from '../types'

// One conversation per (venue, guest). Idempotent get-or-create. guest_id is
// pinned server-side to the caller, so the guestId arg is only a guard.
export async function getOrCreateConversation(
  venueId: string,
  venueName: string,
  guestId: string,
): Promise<{ data: ConversationRow | null; error: DbError | null }> {
  try {
    if (!guestId) return { data: null, error: { message: 'Guest ID is required.' } }
    const data = await apiJson<ConversationRow>('/api/conversations', {
      method: 'POST',
      body: { venue_id: venueId, venue_name: venueName },
    })
    return { data, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function listConversationsForGuest(guestId: string): Promise<{ data: ConversationRow[] | null; error: DbError | null }> {
  try {
    if (!guestId) return { data: [], error: { message: 'Guest ID is required.' } }
    const { conversations } = await apiJson<{ conversations: ConversationRow[] | null }>('/api/conversations/guest')
    return { data: conversations, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function listConversationsForVenues(venueIds: string[]): Promise<{ data: ConversationRow[] | null; error: DbError | null }> {
  try {
    if (!venueIds.length) return { data: [], error: null }
    const { conversations } = await apiJson<{ conversations: ConversationRow[] | null }>(
      `/api/conversations/venues?venue_ids=${venueIds.join(',')}`,
    )
    return { data: conversations, error: null }
  } catch (e: unknown) {
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}