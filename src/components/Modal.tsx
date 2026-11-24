import { useEffect, useRef, type ReactNode } from 'react'
import Icon from './Icon'

export default function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const sheet = sheetRef.current
    const background = document.querySelector('.wb-scroll') as HTMLElement | null
    const nav = document.querySelector('.bottom-nav') as HTMLElement | null
    const header = document.querySelector('.app-header') as HTMLElement | null
    const fab = document.querySelector('.payment-fab') as HTMLElement | null
    const toast = document.querySelector('.undo-toast') as HTMLElement | null
    const surfaces = [background, nav, header, fab, toast].filter((el): el is HTMLElement => !!el)
    surfaces.forEach((el) => {
      el.inert = true
    })
    sheet?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
      }
      if (e.key !== 'Tab') return
      const controls = Array.from(
        sheet?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary:not([aria-disabled="true"]), [tabindex="0"]'
        ) || []
      ).filter(
        (el) =>
          el.tabIndex >= 0 &&
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== 'hidden'
      )
      if (!controls?.length) {
        e.preventDefault()
        return
      }
      const first = controls[0],
        last = controls[controls.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
        e.preventDefault()
        last.focus()
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || document.activeElement === sheet)
      ) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      surfaces.forEach((el) => {
        el.inert = false
      })
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <button className="icon-button sheet-close" aria-label="Close dialog" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
        {children}
      </div>
    </div>
  )
}
