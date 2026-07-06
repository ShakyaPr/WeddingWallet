import type { ComputedCategory } from '../lib/compute'
import type { Payer } from '../types'
import { dateParts, payerMeta } from '../lib/format'
import { primaryBtn } from './ui'

interface Props {
  cat: ComputedCategory
  payers: Payer[]
  onAddPayment: (categoryId: string) => void
  onEdit: (categoryId: string) => void
  onDeletePayment: (id: string) => void
  onDeleteCategory: (id: string) => void
}

const secondaryBtn = {
  flex: 1,
  border: '1px solid #EAD7DA',
  background: 'transparent',
  fontSize: 13.5,
  fontWeight: 700,
  padding: 13,
  borderRadius: 15,
} as const

const tile = (bg: string) => ({ background: bg, borderRadius: 14, padding: 13 })
const tileLabel = (color: string) => ({ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color })

export default function CategoryDetail({ cat, payers, onAddPayment, onEdit, onDeletePayment, onDeleteCategory }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, fontWeight: 600 }}>{cat.name}</div>
          <div style={{ fontSize: 13, color: '#9A868A', marginTop: 2 }}>{cat.vendor}</div>
        </div>
        <span style={{ flex: '0 0 auto', fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 20, background: cat.status.bg, color: cat.status.color }}>
          {cat.status.label}
        </span>
      </div>

      {cat.contact && <div style={{ fontSize: 13, color: '#8B6169', marginTop: 9, fontWeight: 600 }}>{cat.contact}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <div style={tile('#F6EEEC')}>
          <div style={tileLabel('#B49398')}>Budget</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{cat.budgetFmt}</div>
        </div>
        <div style={tile('#F6EEEC')}>
          <div style={tileLabel('#B49398')}>Quoted</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: cat.quoteColor }}>{cat.quoteFmt}</div>
        </div>
        <div style={tile('#EEF3EC')}>
          <div style={tileLabel('#8AA184')}>Paid</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: '#5E7A58' }}>{cat.paidFmt}</div>
        </div>
        <div style={tile('#F7E9EB')}>
          <div style={tileLabel('#C08B96')}>Balance</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: '#A05C6A' }}>{cat.balanceFmt}</div>
        </div>
      </div>

      <div style={{ height: 9, borderRadius: 6, background: '#F1E7E4', overflow: 'hidden', marginTop: 16 }}>
        <div style={{ height: '100%', borderRadius: 6, width: `${cat.paidPct}%`, background: 'linear-gradient(90deg,#A05C6A,#C99BA4)' }} />
      </div>
      <div style={{ fontSize: 11.5, color: '#9A868A', marginTop: 7 }}>{cat.paidPct}% of quoted amount paid</div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#B49398', margin: '20px 0 10px' }}>Payments</div>

      {cat.payments.length === 0 && <div style={{ fontSize: 13, color: '#9A868A', padding: '6px 0' }}>No payments recorded yet.</div>}

      {cat.payments.map((p) => {
        const dp = dateParts(p.date)
        const m = payerMeta(p.paid_by, payers)
        return (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F5EEEB' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.item}</div>
              <div style={{ fontSize: 11, color: '#9A868A', marginTop: 2 }}>{dp.fmt} · {m.short}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{new Intl.NumberFormat('en-US').format(Math.round(Number(p.amount)))}</span>
              <button onClick={() => onDeletePayment(p.id)} aria-label="Delete payment" style={{ border: 'none', background: 'none', color: '#C0A9AD', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          </div>
        )
      })}

      <button onClick={() => onAddPayment(cat.id)} style={primaryBtn}>+ Record payment</button>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button onClick={() => onEdit(cat.id)} style={{ ...secondaryBtn, color: '#7E4451' }}>
          Edit details
        </button>
        <button onClick={() => onDeleteCategory(cat.id)} style={{ ...secondaryBtn, color: '#A65454' }}>
          Delete item
        </button>
      </div>
    </div>
  )
}
