import type { CSSProperties } from 'react'
import type { ScreenProps, DashLayout } from '../viewtypes'
import { fmt, fmtShort, donut } from '../lib/format'
import { card } from '../components/ui'

const statCard: CSSProperties = {
  background: '#fff',
  border: '1px solid #F1E7E4',
  borderRadius: 17,
  padding: 15,
  boxShadow: '0 6px 18px rgba(58,44,46,0.04)',
}
const statLabel: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: '#B49398',
}
const sectionTitle: CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 17,
  fontWeight: 600,
  margin: '22px 2px 12px',
}

interface Props extends ScreenProps {
  layout: DashLayout
  setLayout: (l: DashLayout) => void
}

export default function Dashboard({ state, d, h, layout, setLayout }: Props) {
  const { totals: t, cats, spentCats, people } = d
  const overBudgetColor = t.overBudgetDiff > 0 ? '#A65454' : '#5E7A58'
  const overBudgetFmt =
    (t.overBudgetDiff >= 0 ? '+' : '−') + fmt(Math.abs(t.overBudgetDiff))
  const committedBarPct = t.totalBudget > 0 ? Math.min(100, Math.round((t.totalQuote / t.totalBudget) * 100)) : 0

  const segs: { k: DashLayout; l: string }[] = [
    { k: 'cards', l: 'Overview' },
    { k: 'progress', l: 'Progress' },
    { k: 'charts', l: 'Charts' },
  ]

  return (
    <div style={{ animation: 'wbFade .3s ease' }}>
      {/* layout switcher */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#F2E9E6', borderRadius: 13, marginBottom: 16 }}>
        {segs.map((s) => {
          const on = layout === s.k
          return (
            <button
              key={s.k}
              onClick={() => setLayout(s.k)}
              style={{
                flex: 1,
                border: 'none',
                padding: '8px 4px',
                borderRadius: 10,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: 0.3,
                transition: 'all .2s',
                background: on ? '#FCFAF9' : 'transparent',
                color: on ? '#7E4451' : '#A98D91',
                boxShadow: on ? '0 2px 6px rgba(58,44,46,0.1)' : 'none',
              }}
            >
              {s.l}
            </button>
          )
        })}
      </div>

      {layout === 'cards' && (
        <div>
          {/* hero */}
          <div
            style={{
              position: 'relative',
              borderRadius: 24,
              padding: '24px 22px',
              background: 'linear-gradient(150deg,#7E4451 0%,#A05C6A 55%,#C99BA4 100%)',
              color: '#fff',
              overflow: 'hidden',
              boxShadow: '0 16px 34px -14px rgba(126,68,81,0.55)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', opacity: 0.8 }}>
                  Total paid
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 600, marginTop: 6, lineHeight: 1 }}>
                  {fmt(t.totalPaid)}
                </div>
                <div style={{ fontSize: 12.5, opacity: 0.82, marginTop: 8 }}>of {fmt(t.totalQuote)} committed</div>
              </div>
              <div
                style={{
                  flex: '0 0 auto',
                  width: 78,
                  height: 78,
                  borderRadius: '50%',
                  background: `conic-gradient(#F2C4C9 ${t.heroPct * 3.6}deg, rgba(255,255,255,0.22) 0)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: '#8B4D5A',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{t.heroPct}%</div>
                  <div style={{ fontSize: 8.5, letterSpacing: 1, opacity: 0.75 }}>PAID</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18, paddingTop: 15, borderTop: '1px solid rgba(255,255,255,0.18)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, opacity: 0.72, textTransform: 'uppercase' }}>Still to pay</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{fmt(t.totalBalance)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, letterSpacing: 1, opacity: 0.72, textTransform: 'uppercase' }}>Est. budget</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{fmt(t.totalBudget)}</div>
              </div>
            </div>
          </div>

          {/* stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 14 }}>
            <div style={statCard}>
              <div style={statLabel}>Categories</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, marginTop: 5 }}>{cats.length}</div>
            </div>
            <div style={statCard}>
              <div style={statLabel}>Payments</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 600, marginTop: 5 }}>{state.payments.length}</div>
            </div>
            <div style={statCard}>
              <div style={statLabel}>Committed</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5, color: '#7E4451' }}>{fmt(t.totalQuote)}</div>
            </div>
            <div style={statCard}>
              <div style={statLabel}>Vs budget</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5, color: overBudgetColor }}>{overBudgetFmt}</div>
            </div>
          </div>

          <div style={sectionTitle}>Where it's going</div>
          <div style={{ ...card, borderRadius: 18, padding: '6px 16px', boxShadow: '0 6px 18px rgba(58,44,46,0.04)' }}>
            {spentCats.map((c) => (
              <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid #F5EEEB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.sliceColor }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{c.paidFmt}</span>
                </div>
                <div style={{ height: 7, borderRadius: 6, background: '#F1E7E4', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, width: `${c.sharePct}%`, background: c.sliceColor }} />
                </div>
              </div>
            ))}
            {spentCats.length === 0 && <div style={{ padding: '14px 0', fontSize: 13, color: '#9A868A' }}>No payments yet.</div>}
          </div>
        </div>
      )}

      {layout === 'progress' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { l: 'Paid', v: fmt(t.totalPaid), c: '#3A2C2E' },
              { l: 'To pay', v: fmt(t.totalBalance), c: '#A05C6A' },
              { l: 'Committed', v: fmt(t.totalQuote), c: '#3A2C2E' },
            ].map((x) => (
              <div key={x.l} style={{ flex: 1, background: '#fff', border: '1px solid #F1E7E4', borderRadius: 16, padding: '13px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#B49398' }}>{x.l}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4, color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, margin: '4px 2px 12px' }}>Payment progress</div>
          {cats.map((c) => (
            <div
              key={c.id}
              onClick={() => h.openDetail(c.id)}
              style={{ cursor: 'pointer', background: '#fff', border: '1px solid #F1E7E4', borderRadius: 18, padding: '15px 16px', marginBottom: 11, boxShadow: '0 6px 16px rgba(58,44,46,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{c.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.status.bg, color: c.status.color }}>{c.status.label}</span>
              </div>
              <div style={{ fontSize: 12, color: '#9A868A', marginBottom: 10 }}>{c.paidFmt} of {c.quoteFmt}</div>
              <div style={{ height: 8, borderRadius: 6, background: '#F1E7E4', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 6, width: `${c.paidPct}%`, background: 'linear-gradient(90deg,#A05C6A,#C99BA4)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {layout === 'charts' && (
        <div>
          <div style={{ ...card, borderRadius: 20, padding: 20, boxShadow: '0 6px 18px rgba(58,44,46,0.04)' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Spend by category</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: '0 0 auto', width: 120, height: 120, borderRadius: '50%', background: donut(spentCats.map((c) => ({ value: c.paid, color: c.sliceColor }))), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{fmtShort(t.totalPaid)}</div>
                  <div style={{ fontSize: 8, letterSpacing: 1, color: '#B49398' }}>TOTAL</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {spentCats.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.sliceColor }} />
                      {c.name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9A868A' }}>{c.sharePct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...card, borderRadius: 20, padding: 20, marginTop: 14, boxShadow: '0 6px 18px rgba(58,44,46,0.04)' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Who's paying</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: '0 0 auto', width: 120, height: 120, borderRadius: '50%', background: donut(people.map((p) => ({ value: p.amount, color: p.color }))), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                {people.map((p) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                      {p.shortName}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9A868A' }}>{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...card, borderRadius: 20, padding: 20, marginTop: 14, boxShadow: '0 6px 18px rgba(58,44,46,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600 }}>Committed vs budget</div>
              <span style={{ fontSize: 12, fontWeight: 800, color: overBudgetColor }}>{overBudgetFmt}</span>
            </div>
            <div style={{ fontSize: 11, color: '#9A868A', marginBottom: 5 }}>Budget {fmt(t.totalBudget)}</div>
            <div style={{ height: 10, borderRadius: 7, background: '#F1E7E4', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', background: '#C9B48A', width: '100%' }} />
            </div>
            <div style={{ fontSize: 11, color: '#9A868A', marginBottom: 5 }}>Committed {fmt(t.totalQuote)}</div>
            <div style={{ height: 10, borderRadius: 7, background: '#F1E7E4', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 7, background: 'linear-gradient(90deg,#7E4451,#A05C6A)', width: `${committedBarPct}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
