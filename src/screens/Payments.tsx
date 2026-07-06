import type { ScreenProps } from '../viewtypes'
import { fmt, dateParts, payerMeta } from '../lib/format'
import { screenTitle } from '../components/ui'

export default function Payments({ state, d, h }: ScreenProps) {
  // Newest first — the API already returns them sorted by date desc.
  const rows = state.payments.map((p) => {
    const dp = dateParts(p.date)
    const cat = d.cats.find((c) => c.id === p.category_id)
    const m = payerMeta(p.paid_by, state.payers)
    const slice = cat?.sliceColor || '#A05C6A'
    return { p, dp, cat, m, slice }
  })

  return (
    <div style={{ animation: 'wbFade .3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={screenTitle}>Payment log</div>
        <button onClick={() => h.openPayment()} style={{ border: 'none', background: '#7E4451', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: '9px 15px', borderRadius: 22 }}>
          + Record
        </button>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#F3E7E4,#EADBD8)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#8B6169' }}>Total recorded</span>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: '#7E4451' }}>{fmt(d.totals.totalPaid)}</span>
      </div>

      {rows.map(({ p, dp, cat, m, slice }) => (
        <div key={p.id} style={{ display: 'flex', gap: 13, background: '#fff', border: '1px solid #F1E7E4', borderRadius: 17, padding: '14px 15px', marginBottom: 10, boxShadow: '0 6px 16px rgba(58,44,46,0.04)' }}>
          <div style={{ flex: '0 0 auto', width: 44, height: 44, borderRadius: 13, background: slice + '1F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: slice }}>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{dp.day}</div>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5 }}>{dp.mon}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{p.item}</span>
              <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>{fmt(p.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, gap: 8 }}>
              <span style={{ fontSize: 11.5, color: '#9A868A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cat?.name || 'Unknown'} · {cat?.vendor || ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: m.tint, color: m.color }}>{m.short}</span>
                <button
                  onClick={() => h.deletePayment(p.id)}
                  aria-label="Delete payment"
                  style={{ border: 'none', background: 'none', color: '#C0A9AD', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {rows.length === 0 && <div style={{ fontSize: 13, color: '#9A868A', padding: '10px 2px' }}>No payments recorded yet.</div>}
    </div>
  )
}
