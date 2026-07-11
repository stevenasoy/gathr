import { supabase } from './supabase'
import { apiJson, ApiError } from './api'
import type { MessageRow } from '../types/db'
import type { Message, DbError } from '../types'

// A thread is identified by a column ('booking_id' or 'conversation_id') + id.
export type ThreadColumn = 'booking_id' | 'conversation_id'

export async function listMessages(col: ThreadColumn, id: string): Promise<{ data: MessageRow[] | null; error: DbError | null }> {
  try {
    if (!id) return { data: [], error: null }
    const { messages } = await apiJson<{ messages: MessageRow[] | null }>(`/api/messages?col=${col}&id=${id}`)
    return { data: messages, error: null }
  } catch (e: unknown) {
    console.error('listMessages failed:', e)
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

export async function sendMessage({
  col,
  id,
  senderId,
  body,
}: {
  col: ThreadColumn
  id: string
  senderId: string
  body: string
}): Promise<{ data: Message | null; error: DbError | null }> {
  try {
    if (!senderId) return { data: null, error: { message: 'Authentication required.' } }
    const data = await apiJson<Message>('/api/messages', { method: 'POST', body: { col, id, body } })
    return { data, error: null }
  } catch (e: unknown) {
    console.error('sendMessage failed:', e)
    const message = e instanceof ApiError ? e.message : 'Something went wrong.'
    return { data: null, error: { message } }
  }
}

// Live updates for one thread. Returns an unsubscribe function.
// Keeps using supabase directly since it's a realtime WebSocket connection.
export function subscribeToThread(col: ThreadColumn, id: string, onInsert: (m: Message) => void): () => void {
  const sb = supabase
  if (!sb || !id) return () => {}
  const channel = sb
    .channel(`msg:${col}:${id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `${col}=eq.${id}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe()
  return () => { sb.removeChannel(channel) }
}

// Latest message per thread for the inbox previews, keyed by the id value.
export async function fetchLatest(col: ThreadColumn, ids: string[]): Promise<Record<string, Message>> {
  try {
    if (!ids.length) return {}
    const { latest } = await apiJson<{ latest: Record<string, Message> | null }>('/api/messages/latest', {
      method: 'POST',
      body: { col, ids },
    })
    return latest || {}
  } catch (e) {
    console.error('fetchLatest failed', e)
    return {}
  }
}