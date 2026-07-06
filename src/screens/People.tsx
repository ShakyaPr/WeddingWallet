import type { ScreenProps } from '../viewtypes'
import { fmtShort, donut } from '../lib/format'
import { screenTitle } from '../components/ui'

export default function People({ d, h }: ScreenProps) {
  const { people, totals } = d
  return (
    <div style={{ animation: 'wbFade .3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={screenTitle}>Who paid what</div>
        <button onClick={h.openPerson} style={{ border: 'none', background: '#7E4451', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: '9px 15px', borderRadius: 22 }}>
          + Person
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F1E7E4', borderRadius: 22, padding: 22, boxShadow: '0 8px 20px rgba(58,44,46,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 150, height: 150, borderRadius: '50%', background: donut(people.map((p) => ({ value: p.amount, color: p.color }))), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: 1, color: '#B49398' }}>CONTRIBUTED</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, marginTop: 2 }}>{fmtShort(totals.totalPaid)}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {people.map((p) => (
          <div key={p.name} style={{ background: '#fff', border: '1px solid #F1E7E4', borderRadius: 18, padding: '15px 16px', marginBottom: 11, boxShadow: '0 6px 16px rgba(58,44,46,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{p.initial}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.shortName}</div>
                  <div style={{ fontSize: 11, color: '#9A868A' }}>{p.pct}% of total</div>
                </div>
              </div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600 }}>{p.amountFmt}</span>
            </div>
            <div style={{ height: 7, borderRadius: 6, background: '#F1E7E4', overflow: 'hidden', marginTop: 12 }}>
              <div style={{ height: '100%', borderRadius: 6, width: `${p.pct}%`, background: p.color }} />
            </div>
          </div>
        ))}
        {people.length === 0 && <div style={{ fontSize: 13, color: '#9A868A', padding: '10px 2px' }}>No contributions recorded yet.</div>}
      </div>
    </div>
  )
}
