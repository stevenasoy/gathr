import type { ReactNode } from 'react'
import { Root, Portal, Overlay, Content, Title, Description, Action, Cancel } from '@radix-ui/react-alert-dialog'

const safeBtn =
  'py-2.5 px-5 rounded-full bg-brand text-white font-bold text-[14.5px] border border-white/[0.08] shadow-card transition-all duration-150 hover:bg-brand-press hover:-translate-y-px active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed'
const destructiveBtn =
  'py-2.5 px-5 rounded-full bg-[#a01230] text-white font-bold text-[14.5px] border border-white/[0.08] shadow-card transition-all duration-150 hover:bg-[#7d0e26] hover:-translate-y-px active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed'
const cancelBtn =
  'py-2.5 px-5 rounded-full border border-line-strong bg-white font-semibold text-[14.5px] text-ink transition-colors duration-150 hover:bg-tint'

/**
 * Branded confirmation dialog built on Radix AlertDialog.
 * Use for destructive or irreversible actions (cancel booking, delete listing).
 * `destructive` swaps the confirm button to the system red used elsewhere (#a01230).
 * AlertDialog.Action auto-closes on click; onConfirm may be async and should catch
 * its own errors — failures surface on the parent page after close.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title: string
  body: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}) {
  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <Portal>
        <Overlay className="dialog-overlay" />
        <Content className="dialog-content max-w-[440px]">
          <Title className="text-[20px] font-extrabold text-ink leading-tight m-0">{title}</Title>
          <Description className="text-ink-soft text-[14.5px] mt-2 leading-relaxed m-0">{body}</Description>
          <div className="mt-6 flex justify-end gap-2.5 flex-wrap">
            <Cancel asChild>
              <button type="button" className={cancelBtn}>{cancelLabel}</button>
            </Cancel>
            <Action asChild>
              <button type="button" className={destructive ? destructiveBtn : safeBtn} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </Action>
          </div>
        </Content>
      </Portal>
    </Root>
  )
}