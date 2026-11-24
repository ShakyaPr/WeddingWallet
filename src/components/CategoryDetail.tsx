import type { ComputedCategory } from '../lib/compute'
import type { Payer } from '../types'
import { dateParts, fmt, payerMeta } from '../lib/format'
import { ProgressBar, primaryBtn } from './ui'
import Icon, { categoryIcon } from './Icon'

interface Props {
  cat: ComputedCategory
  payers: Payer[]
  onAddPayment: (categoryId: string) => void
  onEdit: (categoryId: string) => void
  onEditPayment: (paymentId: string) => void
  onDeletePayment: (id: string) => void
  onDeleteCategory: (id: string) => void
}

export default function CategoryDetail({
  cat,
  payers,
  onAddPayment,
  onEdit,
  onEditPayment,
  onDeletePayment,
  onDeleteCategory,
}: Props) {
  return (
    <div className="category-detail">
      <span className="category-icon detail-icon">
        <Icon name={categoryIcon(cat.name)} size={26} />
      </span>
      <h2 id="sheet-title" className="sheet-title">
        {cat.name}
      </h2>
      <p className="sheet-subtitle">
        {cat.vendor || 'Vendor to be decided'}
        {cat.contact && <span className="detail-contact">{cat.contact}</span>}
      </p>
      <span className="status-badge" style={{ background: cat.status.bg, color: cat.status.color }}>
        {cat.status.label}
      </span>
      <div className="detail-money">
        {[
          { label: 'Planned budget', value: cat.budgetFmt },
          { label: 'Vendor quote', value: cat.quoteFmt },
          { label: 'Paid so far', value: cat.paidFmt, color: 'var(--sage)' },
          { label: 'Known balance', value: cat.balanceFmt, color: 'var(--wine)' },
        ].map((s) => (
          <div key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>
      {cat.hasQuote && <ProgressBar value={cat.paidPct} label={`${cat.name} paid`} />}
      <p className="detail-progress-label">
        {cat.quote > 0
          ? `${cat.paidPct}% of quoted amount paid`
          : 'Add a quote to track payment progress'}
      </p>
      {cat.overBudget && (
        <p className="form-hint">The quote is {cat.overByFmt} above your planned budget.</p>
      )}
      <div className="section-heading">
        <h2>Payment history</h2>
        <span className="count-label">{cat.payments.length} payments</span>
      </div>
      {!cat.payments.length && (
        <p className="sheet-subtitle">No payments yet. Your first one starts the story.</p>
      )}
      {[...cat.payments]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((p) => (
          <div className="detail-payment" key={p.id}>
            <div>
              <strong>{p.item}</strong>
              <small>
                {dateParts(p.date).fmt} · {payerMeta(p.paid_by, payers).short}
              </small>
            </div>
            <b>{fmt(p.amount)}</b>
            <button
              className="icon-button"
              onClick={() => onEditPayment(p.id)}
              aria-label={`Edit payment: ${p.item}`}
            >
              <Icon name="edit" size={17} />
            </button>
            <button
              className="icon-button"
              onClick={() => onDeletePayment(p.id)}
              aria-label={`Delete payment: ${p.item}`}
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
        ))}
      <button onClick={() => onAddPayment(cat.id)} style={primaryBtn}>
        <span className="button-content">
          <Icon name="plus" size={18} />
          Record payment
        </span>
      </button>
      <div className="detail-actions">
        <button className="secondary-button" onClick={() => onEdit(cat.id)}>
          Edit details
        </button>
        <button className="secondary-button delete-item" onClick={() => onDeleteCategory(cat.id)}>
          Delete item
        </button>
      </div>
    </div>
  )
}
