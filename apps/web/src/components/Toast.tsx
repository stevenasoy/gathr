import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Provider, Viewport, Root, Title, Description } from '@radix-ui/react-toast'

type Variant = 'neutral' | 'success' | 'error'

interface ToastItem {
  id: number
  title?: string
  description?: string
  variant: Variant
  duration: number
}

export interface ToastOptions {
  title?: string
  description?: string
  variant?: Variant
  /** ms before auto-dismiss; default 3200 */
  duration?: number
}

type ToastFn = (msg: string | ToastOptions) => void

const ToastCtx = createContext<{ toast: ToastFn } | null>(null)

/**
 * Imperative toast hook. `const { toast } = useToast()` then `toast('Saved')`
 * or `toast({ title, description, variant })`. Must be rendered under ToastProvider.
 */
export function useToast(): { toast: ToastFn } {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const VARIANT_BG: Record<Variant, string> = {
  neutral: 'bg-ink',
  success: 'bg-[#137a3c]',
  error: 'bg-[#a01230]',
}

const DEFAULT_DURATION = 3200

/**
 * Toast system built on Radix Toast (headless). Owns the look via tokens.
 * Gives queueing, auto-dismiss, swipe-to-dismiss, and a live region for
 * screen readers. Persistent inline errors should NOT use this — toasts are
 * transient; keep errors inline where the user must act on them.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastFn>((msg) => {
    const id = ++idRef.current
    const opts = typeof msg === 'string' ? { title: msg } : msg
    setItems((cur) => [...cur, {
      id,
      title: opts.title,
      description: opts.description,
      variant: opts.variant ?? 'neutral',
      duration: opts.duration ?? DEFAULT_DURATION,
    }])
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      <Provider swipeDirection="right" duration={DEFAULT_DURATION} label="Notifications">
        {children}
        {items.map((t) => (
          <Root
            key={t.id}
            duration={t.duration}
            onOpenChange={(open) => { if (!open) remove(t.id) }}
          >
            <div className={`toast-card ${VARIANT_BG[t.variant]}`}>
              {t.title && <Title className="toast-title">{t.title}</Title>}
              {t.description && <Description className="toast-desc">{t.description}</Description>}
            </div>
          </Root>
        ))}
        <Viewport className="toast-viewport" />
      </Provider>
    </ToastCtx.Provider>
  )
}