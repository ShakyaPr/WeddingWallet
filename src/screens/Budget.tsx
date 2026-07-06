import type { ScreenProps } from '../viewtypes'
import { screenTitle } from '../components/ui'

const cellLabel = { fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' as const, color: '#B49398' }

export default function Budget({ d, h }: ScreenProps) {
  return (
    <div style={{ animation: 'wbFade .3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={screenTitle}>Budget items</div>
        <button onClick={h.openCategory} style={{ border: 'none', background: '#7E4451', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: '9px 15px', borderRadius: 22 }}>
          + Add
        </button>
      </div>

      {d.cats.map((c) => (
        <div
          key={c.id}
          onClick={() => h.openDetail(c.id)}
          style={{ cursor: 'pointer', background: '#fff', border: '1px solid #F1E7E4', borderRadius: 20, padding: '17px 17px 15px', marginBottom: 12, boxShadow: '0 8px 20px rgba(58,44,46,0.05)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#9A868A', marginTop: 2 }}>{c.vendor}</div>
            </div>
            <span style={{ flex: '0 0 auto', fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: c.status.bg, color: c.status.color }}>
              {c.status.label}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, gap: 6 }}>
            <div>
              <div style={cellLabel}>Budget</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>{c.budgetFmt}</div>
            </div>
            <div>
              <div style={cellLabel}>Quoted</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3, color: c.quoteColor }}>{c.quoteFmt}</div>
            </div>
            <div>
              <div style={cellLabel}>Paid</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3, color: '#5E7A58' }}>{c.paidFmt}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={cellLabel}>Balance</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 3, color: '#A05C6A' }}>{c.balanceFmt}</div>
            </div>
          </div>

          <div style={{ height: 7, borderRadius: 6, background: '#F1E7E4', overflow: 'hidden', marginTop: 13 }}>
            <div style={{ height: '100%', borderRadius: 6, width: `${c.paidPct}%`, background: 'linear-gradient(90deg,#A05C6A,#C99BA4)' }} />
          </div>

          {c.overBudget && (
            <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#A65454', background: '#F8E7E7', display: 'inline-block', padding: '3px 9px', borderRadius: 14 }}>
              Over budget by {c.overByFmt}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
