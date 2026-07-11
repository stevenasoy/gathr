import { useEffect, useRef, useState, useCallback } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Send, MessageSquare } from 'lucide-react'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { listBookings, listRequestsForVenues } from '../lib/bookings'
import { fetchMyVenues } from '../lib/venues'
import { listConversationsForGuest, listConversationsForVenues } from '../lib/conversations'
import { listMessages, sendMessage, subscribeToThread, fetchLatest } from '../lib/messages'
import { peso, fmtTime, fmtDate as fmtDateBase } from '../lib/format'
import type { Message } from '../types'
import type { BookingRow, ConversationRow } from '../types/db'

interface Thread {
  key: string
  col: 'booking_id' | 'conversation_id'
  refId: string
  venue_id: string
  venue_name: string
  inquiry?: boolean
  status?: string
  event_date?: string | null
  hours?: number
  guests?: number | null
  event_type?: string | null
  total_php?: number
  note?: string | null
}

interface MessagesProps {
  role?: 'guest' | 'host'
  embedded?: boolean
}

const fmtDate = (d: string | null | undefined) => fmtDateBase(d ?? null, 'compact')

export default function Messages({ role = 'guest', embedded = false }: MessagesProps) {
  const { user, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const [threads, setThreads] = useState<Thread[]>([])
  const [latest, setLatest] = useState<Record<string, Message>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>('')
  const endRef = useRef<HTMLDivElement>(null)

  // Load the user's threads: booking threads + conversation (inquiry) threads.
  useEffect(() => {
    let active = true
    async function load() {
      if (authLoading) return
      if (!user) { setLoading(false); return }
      try {
        setLoading(true)
        setError('')
        let bookings: BookingRow[] = []
        let convs: ConversationRow[] = []
        if (role === 'host') {
          const { data: mine, error: mineErr } = await fetchMyVenues(user.id)
          if (mineErr) throw mineErr
          const ids = (mine || []).map((v) => v.id)
          const [reqs, cs] = await Promise.all([listRequestsForVenues(ids), listConversationsForVenues(ids)])
          if (reqs.error) throw reqs.error
          if (cs.error) throw cs.error
          bookings = reqs.data || []
          convs = cs.data || []
        } else {
          const [bs, cs] = await Promise.all([listBookings(user.id), listConversationsForGuest(user.id)])
          if (bs.error) throw bs.error
          if (cs.error) throw cs.error
          bookings = bs.data || []
          convs = cs.data || []
        }
        if (!active) return

        const bThreads: Thread[] = bookings.map((b) => ({
          key: 'b:' + b.id, col: 'booking_id', refId: b.id,
          venue_id: b.venue_id, venue_name: b.venue_name,
          status: b.status, event_date: b.event_date, hours: b.hours, guests: b.guests,
          event_type: b.event_type, total_php: b.total_php, note: b.note,
        }))
        const cThreads: Thread[] = convs.map((c) => ({
          key: 'c:' + c.id, col: 'conversation_id', refId: c.id,
          venue_id: c.venue_id, venue_name: c.venue_name, inquiry: true,
        }))
        const all = [...cThreads, ...bThreads]
        setThreads(all)

        const [bl, cl] = await Promise.all([
          fetchLatest('booking_id', bookings.map((b) => b.id)),
          fetchLatest('conversation_id', convs.map((c) => c.id)),
        ])
        if (!active) return
        const lm: Record<string, Message> = {}
        bThreads.forEach((t) => { if (bl[t.refId]) lm[t.key] = bl[t.refId] })
        cThreads.forEach((t) => { if (cl[t.refId]) lm[t.key] = cl[t.refId] })
        setLatest(lm)

        const qc = params.get('c'), qb = params.get('b')
        const initial = qc ? 'c:' + qc : qb ? 'b:' + qb : (all[0]?.key ?? null)
        setActiveId((cur) => cur || initial)
      } catch (e) {
        console.error('messages load failed', e)
        if (active) setError('Could not load your messages. Check your connection and try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user, authLoading, role]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = threads.find((t) => t.key === activeId)

  // Load + live-subscribe to the active thread.
  useEffect(() => {
    if (!active) { setMessages([]); return }
    let alive = true
    setError('')
    listMessages(active.col, active.refId)
      .then(({ data, error }) => {
        if (error) {
          if (alive) {
            setError(error.message || 'Could not load messages.')
            setMessages([])
          }
        } else {
          if (alive) setMessages(data || [])
        }
      })
      .catch((e) => {
        console.error('thread load failed', e)
        if (alive) {
          setError(e instanceof Error ? e.message : 'Could not load messages.')
          setMessages([])
        }
      })
    const unsub = subscribeToThread(active.col, active.refId, (m) => {
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]))
      setLatest((cur) => ({ ...cur, [active.key]: m }))
    })
    return () => { alive = false; unsub() }
  }, [active?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !active || !user) return
    setDraft('')
    try {
      setSending(true)
      const { data, error } = await sendMessage({ col: active.col, id: active.refId, senderId: user.id, body })
      if (error) { setDraft(body); return }
      if (data) {
        setMessages((cur) => (cur.some((x) => x.id === data.id) ? cur : [...cur, data]))
        setLatest((cur) => ({ ...cur, [active.key]: data }))
      }
    } catch (e) {
      console.error('send failed', e)
      setDraft(body)
    } finally {
      setSending(false)
    }
  }, [draft, active, user])

  // Plain function (not a component) so the input doesn't remount and drop focus.
  const wrap = (children: ReactNode) => embedded ? children : <><main>{children}</main><Footer /></>

  if (!authLoading && !user) {
    return wrap(
      <>
        {!embedded && <section className="page-hero"><div className="wrap"><span className="page-eyebrow">Messages</span><h1>Messages</h1></div></section>}
        <div className="wrap page-body"><div className="empty-state">
          <MessageSquare size={40} strokeWidth={1.5} />
          <h2>Sign in to see your messages</h2>
          <Link to="/signin" state={{ from: '/messages' }} className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Sign in</Link>
        </div></div>
      </>
    )
  }

  const inbox = (
    <div className="msg-layout">
      <aside className="msg-threads">
        {error ? (
          <div className="dash-muted" style={{ padding: 16 }}>
            <p style={{ marginBottom: 10 }}>{error}</p>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => location.reload()}>Retry</button>
          </div>
        ) : loading ? (
          <p className="dash-muted" style={{ padding: 16 }}>Loading…</p>
        ) : threads.length === 0 ? (
          <p className="dash-muted" style={{ padding: 16 }}>No conversations yet. {role === 'host' ? 'They start when a guest messages or requests one of your venues.' : 'Message a venue or request one to start a conversation.'}</p>
        ) : threads.map((t) => {
          const last = latest[t.key]
          return (
            <button key={t.key} className={'msg-thread' + (t.key === activeId ? ' on' : '')} onClick={() => setActiveId(t.key)}>
              <div className="msg-thread-top">
                <b>{t.venue_name}</b>
                {t.inquiry
                  ? <span className="status-pill status-requested">Inquiry</span>
                  : <span className={'status-pill status-' + t.status}>{t.status}</span>}
              </div>
              <span className="msg-thread-sub">{t.inquiry ? 'Pre-booking question' : fmtDate(t.event_date)}</span>
              {last && <span className="msg-thread-preview">{last.body}</span>}
            </button>
          )
        })}
      </aside>

      <section className="msg-thread-view">
        {!active ? (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <MessageSquare size={36} strokeWidth={1.5} />
            <p>Select a conversation.</p>
          </div>
        ) : (
          <>
            <div className="msg-head">
              <Link to={`/venue/${active.venue_id}`} className="msg-head-title">{active.venue_name}</Link>
              <span className="msg-head-sub">
                {active.inquiry ? 'Inquiry · no booking yet' : `${fmtDate(active.event_date)} · ${active.hours} hrs${active.guests ? ` · ${active.guests} guests` : ''}`}
              </span>
            </div>
            {!active.inquiry && (
              <Link to={`/bookings/${active.refId}`} className="msg-booking-summary">
                <div className="msg-bs-top">
                  <span className="msg-bs-label">Booking summary</span>
                  <span className={'status-pill status-' + active.status}>{active.status}</span>
                </div>
                <div className="msg-bs-grid">
                  <span>{fmtDate(active.event_date)}</span>
                  <span>{active.hours} hrs</span>
                  {active.guests ? <span>{active.guests} guests</span> : null}
                  {active.event_type ? <span>{active.event_type}</span> : null}
                  <span><b>{peso(active.total_php)}</b></span>
                </div>
                {active.note && <div className="msg-bs-note">“{active.note}”</div>}
                <span className="msg-bs-link">View booking details →</span>
              </Link>
            )}
            <div className="msg-body">
              {messages.length === 0
                ? <p className="dash-muted" style={{ textAlign: 'center', margin: 'auto' }}>No messages yet. Say hello.</p>
                : messages.map((m) => (
                  <div key={m.id} className={'msg-bubble' + (m.sender_id === user?.id ? ' mine' : '')}>
                    <p>{m.body}</p>
                    <span className="msg-time">{fmtTime(m.created_at)}</span>
                  </div>
                ))}
              <div ref={endRef} />
            </div>
            <form className="msg-composer" onSubmit={send}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" />
              <button className="btn-primary" type="submit" disabled={sending || !draft.trim()} aria-label="Send"><Send size={18} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  )

  return wrap(
    <>
      {!embedded && (
        <section className="page-hero"><div className="wrap">
          <span className="page-eyebrow">Messages</span>
          <h1>Messages</h1>
        </div></section>
      )}
      <div className={embedded ? '' : 'wrap page-body'}>{inbox}</div>
    </>
  )
}