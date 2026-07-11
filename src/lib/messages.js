import { supabase, isSupabaseConfigured } from './supabase'

// A thread is identified by a column ('booking_id' or 'conversation_id') + id.

export async function listMessages(col, id) {
  if (!isSupabaseConfigured || !id) return { data: [], error: null }
  return supabase
    .from('messages')
    .select('*')
    .eq(col, id)
    .order('created_at', { ascending: true })
}

export async function sendMessage({ col, id, senderId, body }) {
  if (!isSupabaseConfigured) return { error: { message: 'Backend not connected.' } }
  return supabase
    .from('messages')
    .insert({ [col]: id, sender_id: senderId, body })
    .select()
    .single()
}

// Live updates for one thread. Returns an unsubscribe function.
export function subscribeToThread(col, id, onInsert) {
  if (!isSupabaseConfigured || !id) return () => {}
  const channel = supabase
    .channel(`msg:${col}:${id}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `${col}=eq.${id}` },
      (payload) => onInsert(payload.new))
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// Latest message per thread for the inbox previews, keyed by the id value.
export async function fetchLatest(col, ids) {
  if (!isSupabaseConfigured || !ids.length) return {}
  const { data } = await supabase
    .from('messages')
    .select(`${col}, body, created_at, sender_id`)
    .in(col, ids)
    .order('created_at', { ascending: false })
  const latest = {}
  for (const m of data || []) { const k = m[col]; if (k && !latest[k]) latest[k] = m }
  return latest
}
