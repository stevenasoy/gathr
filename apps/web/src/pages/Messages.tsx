import { useEffect, useRef, useState, useCallback } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Send, MessageSquare } from 'lucide-react'
import Footer from '../components/Footer'
import { ThreadListSkeleton } from '../components/Skeleton'
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

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"

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

  const statusClass = (status?: string) => {
    if (status === 'confirmed') return 'bg-[#e6f6ec] text-[#137a3c]'
    if (status === 'cancelled') return 'bg-tint text-ink-soft'
    return 'bg-[#fef3e2] text-[#9a6700]'
  }

  // Plain function (not a component) so the input doesn't remount and drop focus.
  const wrap = (children: ReactNode) => embedded ? children : <><main>{children}</main><Footer /></>

  if (!authLoading && !user) {
    return wrap(
      <>
        {!embedded && <section className="py-14 pb-10 bg-surface border-b border-line text-center"><div className="wrap relative z-[1]"><span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Messages</span><h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Messages</h1></div></section>}
        <div className="wrap page-body"><div className="text-center py-[60px] px-5">
          <MessageSquare size={40} strokeWidth={1.5} className="text-ink-faint mb-3.5 mx-auto" />
          <h2 className="text-[22px] font-extrabold mb-2">Sign in to see your messages</h2>
          <Link to="/signin" state={{ from: '/messages' }} className={baseBtn} style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Sign in</Link>
        </div></div>
      </>
    )
  }

  const inbox = (
    <div className="grid grid-cols-1 sm:grid-cols-[300px_1fr] gap-0 border border-line rounded-lg overflow-hidden h-[600px] sm:h-[560px] bg-white">
      <aside className="border-b border-line sm:border-r sm:border-b-0 overflow-y-auto">
        {error ? (
          <div className="text-ink-soft text-[15px]" style={{ padding: 16 }}>
            <p style={{ marginBottom: 10 }}>{error}</p>
            <button className={baseBtn} style={{ width: 'auto', padding: '10px 18px' }} onClick={() => location.reload()}>Retry</button>
          </div>
        ) : loading ? (
          <ThreadListSkeleton count={5} />
        ) : threads.length === 0 ? (
          <p className="text-ink-soft text-[15px]" style={{ padding: 16 }}>No conversations yet. {role === 'host' ? 'They start when a guest messages or requests one of your venues.' : 'Message a venue or request one to start a conversation.'}</p>
        ) : threads.map((t) => {
          const last = latest[t.key]
          return (
            <button key={t.key} className={`flex flex-col gap-[3px] w-full text-left py-3.5 px-4 border-b border-line transition-colors duration-150 ${t.key === activeId ? 'bg-tint' : 'hover:bg-[#faf8fc]'}`} onClick={() => setActiveId(t.key)}>
              <div className="flex items-center justify-between gap-2">
                <b className="text-[14.5px]">{t.venue_name}</b>
                {t.inquiry
                  ? <span className={`text-[11px] font-bold uppercase tracking-[0.04em] py-1 px-2 rounded-full ${statusClass('requested')}`}>Inquiry</span>
                  : <span className={`text-[11px] font-bold uppercase tracking-[0.04em] py-1 px-2 rounded-full ${statusClass(t.status)}`}>{t.status}</span>}
              </div>
              <span className="text-xs text-ink-soft">{t.inquiry ? 'Pre-booking question' : fmtDate(t.event_date)}</span>
              {last && <span className="text-[13px] text-ink-faint whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">{last.body}</span>}
            </button>
          )
        })}
      </aside>

      <section className="flex flex-col min-w-0">
        {!active ? (
          <div className="empty-state m-auto">
            <MessageSquare size={36} strokeWidth={1.5} className="text-ink-faint mb-3.5 mx-auto" />
            <p>Select a conversation.</p>
          </div>
        ) : (
          <>
            <div className="py-4 px-5 border-b border-line">
              <Link to={`/venue/${active.venue_id}`} className="font-bold text-base text-ink hover:text-brand">{active.venue_name}</Link>
              <span className="block text-[13px] text-ink-soft mt-0.5">
                {active.inquiry ? 'Inquiry · no booking yet' : `${fmtDate(active.event_date)} · ${active.hours} hrs${active.guests ? ` · ${active.guests} guests` : ''}`}
              </span>
            </div>
            {!active.inquiry && (
              <Link to={`/bookings/${active.refId}`} className="block mx-5 mt-3.5 p-3.5 px-4 border border-line-strong rounded-[14px] bg-tint hover:border-brand">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-ink-soft">Booking summary</span>
                  <span className={`text-[11px] font-bold uppercase tracking-[0.04em] py-1 px-2 rounded-full ${statusClass(active.status)}`}>{active.status}</span>
                </div>
                <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13.5px] text-ink">
                  <span>{fmtDate(active.event_date)}</span>
                  <span>{active.hours} hrs</span>
                  {active.guests ? <span>{active.guests} guests</span> : null}
                  {active.event_type ? <span>{active.event_type}</span> : null}
                  <span><b>{peso(active.total_php)}</b></span>
                </div>
                {active.note && <div className="text-[13px] text-ink-soft italic mt-2">“{active.note}”</div>}
                <span className="inline-block mt-2.5 text-[13px] font-semibold text-brand">View booking details →</span>
              </Link>
            )}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2.5">
              {messages.length === 0
                ? <p className="text-ink-soft text-[15px] text-center m-auto">No messages yet. Say hello.</p>
                : messages.map((m) => (
                  <div key={m.id} className={`max-w-[72%] rounded-[14px] py-2.5 px-3.5 ${m.sender_id === user?.id ? 'self-end bg-brand text-white' : 'self-start bg-tint'}`}>
                    <p className="m-0 text-[14.5px] leading-snug">{m.body}</p>
                    <span className={`block text-[11px] opacity-65 mt-1 ${m.sender_id === user?.id ? 'text-white' : 'text-ink-soft'}`}>{fmtTime(m.created_at)}</span>
                  </div>
                ))}
              <div ref={endRef} />
            </div>
            <form className="flex gap-2 py-3.5 px-4 border-t border-line" onSubmit={send}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" className="flex-1 border border-line-strong rounded-full py-2.5 px-4 font-[inherit] text-sm outline-none focus:border-brand" />
              <button className={`${baseBtn} w-auto px-4 grid place-items-center rounded-full`} type="submit" disabled={sending || !draft.trim()} aria-label="Send"><Send size={18} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  )

  return wrap(
    <>
      {!embedded && (
        <section className="py-14 pb-10 bg-surface border-b border-line text-center"><div className="wrap relative z-[1]">
          <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Messages</span>
          <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Messages</h1>
        </div></section>
      )}
      <div className={embedded ? '' : 'wrap page-body'}>{inbox}</div>
    </>
  )
}
