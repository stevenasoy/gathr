import { supabase, isSupabaseConfigured } from './supabase'

// One conversation per (venue, guest). Idempotent get-or-create.
export async function getOrCreateConversation(venueId, venueName, guestId) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase
    .from('conversations')
    .upsert({ venue_id: venueId, venue_name: venueName, guest_id: guestId }, { onConflict: 'venue_id,guest_id' })
    .select()
    .single()
}

export async function listConversationsForGuest(guestId) {
  if (!isSupabaseConfigured) return { data: [] }
  return supabase.from('conversations').select('*').eq('guest_id', guestId).order('created_at', { ascending: false })
}

export async function listConversationsForVenues(venueIds) {
  if (!isSupabaseConfigured || !venueIds.length) return { data: [] }
  return supabase.from('conversations').select('*').in('venue_id', venueIds).order('created_at', { ascending: false })
}
