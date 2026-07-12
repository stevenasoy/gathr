import type { ReactNode } from 'react'
import { Root, Portal, Overlay, Content, Title, Description, Close } from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg'

const MAX_W: Record<Size, string> = {
  sm: 'max-w-[380px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
}

/**
 * Branded modal built on Radix Dialog (headless — we own the styling).
 * Provides focus trap, ESC to close, scroll lock, and correct aria roles.
 * For destructive confirmations use ConfirmDialog instead (AlertDialog semantics).
 * A close button always renders top-right; pass `hideClose` to suppress it
 * (e.g. when children render their own close affordance).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: Size
  hideClose?: boolean
}) {
  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <Portal>
        <Overlay className="dialog-overlay" />
        <Content className={`dialog-content ${MAX_W[size]}`}>
          {!hideClose && (
            <Close
              aria-label="Close"
              className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-lg text-ink-faint hover:text-ink hover:bg-tint transition-colors duration-150 z-[1]"
            >
              <X size={18} />
            </Close>
          )}
          {(title || description) && (
            <div className="mb-3 pr-8">
              {title && <Title className="text-[20px] font-extrabold text-ink leading-tight m-0">{title}</Title>}
              {description ? (
                <Description className="text-ink-soft text-[14.5px] mt-1.5 leading-relaxed m-0">{description}</Description>
              ) : (
                <Description className="sr-only">{title || 'Dialog'}</Description>
              )}
            </div>
          )}
          {children}
          {footer && <div className="mt-6 flex justify-end gap-2.5 flex-wrap">{footer}</div>}
        </Content>
      </Portal>
    </Root>
  )
}