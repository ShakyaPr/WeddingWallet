import { useState } from 'react'
import type { ScreenProps } from '../viewtypes'
import { fmt, dateParts, payerMeta } from '../lib/format'
import { AddButton, EmptyState, ScreenHeading, SearchField } from '../components/ui'
import DataActions from '../components/DataActions'
import Icon from '../components/Icon'

export default function Payments({ state, d, h }: ScreenProps) {
  const [search, setSearch] = useState('')
  const [payer, setPayer] = useState('')
  const rows = [...state.payments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({
      p,
      dp: dateParts(p.date),
      cat: d.cats.find((c) => c.id === p.category_id),
      m: payerMeta(p.paid_by, state.payers),
    }))
    .filter(
      ({ p, cat }) =>
        (!payer || p.paid_by === payer) &&
        `${p.item} ${cat?.name || ''} ${cat?.vendor || ''} ${p.paid_by}`
          .toLowerCase()
          .includes(search.toLowerCase())
    )
  return (
    <div className="screen">
      <ScreenHeading
        eyebrow="EVERY PAYMENT, REMEMBERED"
        title="Payment journal"
        description="The little steps that bring your day to life."
        action={<AddButton onClick={() => h.openPayment()}>Record</AddButton>}
      />
      <DataActions onExport={h.openExports} onHistory={h.openHistory} />
      <div className="payment-total">
        <span className="stat-icon">
          <Icon name="payments" size={23} />
        </span>
        <div>
          <span>Total recorded</span>
          <strong>{fmt(d.totals.totalPaid)}</strong>
        </div>
        <span className="payment-count">{state.payments.length} payments</span>
      </div>
      <SearchField value={search} onChange={setSearch} placeholder="Search your payments" />
      <div className="payment-filter">
        <span className="count-label">
          {rows.length} {rows.length === 1 ? 'payment' : 'payments'}
        </span>
        <select
          aria-label="Filter by person"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
        >
          <option value="">All people</option>
          {state.payers.map((p) => (
            <option key={p.id} value={p.name}>
              {p.short_name}
            </option>
          ))}
        </select>
      </div>
      <div className="list-card payment-list">
        {rows.map(({ p, dp, cat, m }, i) => (
          <div key={p.id}>
            {(i === 0 || rows[i - 1].p.date.slice(0, 7) !== p.date.slice(0, 7)) && (
              <div className="month-heading">
                {new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
                  new Date(`${p.date}T12:00:00`)
                )}
              </div>
            )}
            <div className="payment-row">
              <div className="payment-date">
                <strong>{dp.day}</strong>
                <span>{dp.mon}</span>
              </div>
              <div className="payment-info">
                <div className="payment-line">
                  <strong>{p.item}</strong>
                  <b>{fmt(p.amount)}</b>
                </div>
                <p>
                  {cat?.name || 'Unknown category'}
                  {cat?.vendor && cat.vendor !== 'To be decided' ? ` · ${cat.vendor}` : ''}
                </p>
                <div className="row-between">
                  <span className="payer-chip" style={{ background: m.tint, color: 'var(--wine)' }}>
                    <span style={{ background: m.color }} />
                    {m.short}
                  </span>
                  <div className="payment-row-actions">
                    <button
                      className="icon-button"
                      onClick={() => h.openEditPayment(p.id)}
                      aria-label={`Edit payment: ${p.item}, ${fmt(p.amount)}`}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      className="icon-button delete-payment"
                      onClick={() => h.deletePayment(p.id)}
                      aria-label={`Delete payment: ${p.item}, ${fmt(p.amount)}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!rows.length && (
        <EmptyState
          icon="payments"
          title={search || payer ? 'No matching payments' : 'Your first step, recorded'}
          description={
            search || payer
              ? 'Try another search or choose a different person.'
              : 'Add a payment and keep every contribution in one place.'
          }
          action={
            !search && !payer ? (
              <AddButton onClick={() => h.openPayment()}>Record a payment</AddButton>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
