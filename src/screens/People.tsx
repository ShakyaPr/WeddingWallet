import { useState } from 'react'
import type { ScreenProps } from '../viewtypes'
import { fmt, fmtShort, dateParts, donut } from '../lib/format'
import { screenTitle } from '../components/ui'

const rowLabel = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' as const, color: '#B49398' }

export default function People({ d, h }: ScreenProps) {
  const { people, totals, cats } = d
  const [selected, setSelected] = useState<string | null>(null)
  const active = people.find((p) => p.name === selected) || null

  // With someone selected the donut dims everyone else and the centre shows their share.
  const slices = people.map((p) => ({ value: p.amount, color: !active || active.name === p.name ? p.color : '#F1E7E4' }))

  return (
    <div style={{ animation: 'wbFade .3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={screenTitle}>Who paid what</div>
        <button onClick={h.openPerson} style={{ border: 'none', background: '#7E4451', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: '9px 15px', borderRadius: 22 }}>
          + Person
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F1E7E4', borderRadius: 22, padding: 22, boxShadow: '0 8px 20px rgba(58,44,46,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 150, height: 150, borderRadius: '50%', background: donut(slices), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .25s ease' }}>
          <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1, color: '#B49398', maxWidth: 78, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              {active ? active.shortName : 'Contributed'}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 600, marginTop: 2, color: active ? active.color : '#3A2C2E' }}>
              {fmtShort(active ? active.amount : totals.totalPaid)}
            </div>
            {active && <div style={{ fontSize: 9.5, color: '#B49398', marginTop: 1 }}>{active.pct}% of total</div>}
          </div>
        </div>
        {people.length > 0 && (
          <div style={{ fontSize: 11.5, color: '#B49398', marginTop: 14 }}>
            {active ? 'Tap again to close' : 'Tap a person to see their payments'}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        {people.map((p) => {
          const open = active?.name === p.name
          return (
            <div
              key={p.name}
              style={{ background: '#fff', border: `1px solid ${open ? p.color + '55' : '#F1E7E4'}`, borderRadius: 18, padding: '15px 16px', marginBottom: 11, boxShadow: open ? `0 10px 22px ${p.color}22` : '0 6px 16px rgba(58,44,46,0.04)', transition: 'border-color .2s ease, box-shadow .2s ease' }}
            >
              <button
                onClick={() => setSelected(open ? null : p.name)}
                aria-expanded={open}
                style={{ display: 'block', width: '100%', border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{p.initial}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.shortName}</div>
                      <div style={{ fontSize: 11, color: '#9A868A' }}>
                        {p.pct}% of total · {p.payments.length} payment{p.payments.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600 }}>{p.amountFmt}</span>
                    <span style={{ fontSize: 10, color: '#C0A9AD', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease', lineHeight: 1 }}>▼</span>
                  </div>
                </div>
                <div style={{ height: 7, borderRadius: 6, background: '#F1E7E4', overflow: 'hidden', marginTop: 12 }}>
                  <div style={{ height: '100%', borderRadius: 6, width: `${p.pct}%`, background: p.color }} />
                </div>
              </button>

              {open && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F5EEEB', animation: 'wbFade .25s ease' }}>
                  <div style={{ ...rowLabel, marginBottom: 2 }}>Payments</div>
                  {p.payments.map((pay, i) => {
                    const dp = dateParts(pay.date)
                    const cat = cats.find((c) => c.id === pay.category_id)
                    return (
                      <div
                        key={pay.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: i === p.payments.length - 1 ? 'none' : '1px solid #F5EEEB' }}
                      >
                        <div style={{ flex: '0 0 auto', width: 38, height: 38, borderRadius: 12, background: p.tint, color: p.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1 }}>{dp.day}</div>
                          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.4 }}>{dp.mon}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pay.item}</div>
                          <div style={{ fontSize: 11, color: '#9A868A', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cat?.name || 'Unknown'}{cat?.vendor ? ` · ${cat.vendor}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{fmt(pay.amount)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {people.length === 0 && <div style={{ fontSize: 13, color: '#9A868A', padding: '10px 2px' }}>No contributions recorded yet.</div>}
      </div>
    </div>
  )
}
