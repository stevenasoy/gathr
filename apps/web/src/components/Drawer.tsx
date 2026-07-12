import type { ReactNode } from 'react'
import { Root, Portal, Overlay, Content, Title } from '@radix-ui/react-dialog'

/**
 * Right-side slide-over panel built on Radix Dialog (same primitive as Modal,
 * styled as a drawer). Gives focus trap, ESC to close, scroll lock, and
 * `role="dialog"` + accessible name — the things a hand-rolled CSS drawer lacks.
 *
 * The `ariaLabel` is rendered as a visually-hidden Title so screen readers
 * announce the panel and Radix doesn't warn about a missing title.
 */
export function Drawer({
  open,
  onOpenChange,
  children,
  ariaLabel = 'Panel',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <Portal>
        <Overlay className="dialog-overlay" />
        <Content className="drawer-content">
          <Title className="sr-only">{ariaLabel}</Title>
          {children}
        </Content>
      </Portal>
    </Root>
  )
}