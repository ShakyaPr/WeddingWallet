import type { ReactNode } from 'react'

export default function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(58,32,38,0.45)', zIndex: 40, display: 'flex', alignItems: 'flex-end', animation: 'wbFade .2s ease' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxHeight: '86%', overflowY: 'auto', background: '#FCFAF9', borderRadius: '28px 28px 0 0', padding: '10px 22px 30px', animation: 'wbSheet .3s cubic-bezier(.2,.8,.2,1)' }}
      >
        <div style={{ width: 42, height: 5, borderRadius: 3, background: '#E6D6D3', margin: '6px auto 16px' }} />
        {children}
      </div>
    </div>
  )
}
