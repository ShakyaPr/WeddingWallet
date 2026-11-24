import { useState } from 'react'
import type { ScreenProps } from '../viewtypes'
import { fmt, fmtShort, dateParts, donut } from '../lib/format'
import { AddButton, EmptyState, ProgressBar, ScreenHeading } from '../components/ui'
import Icon from '../components/Icon'

export default function People({ state, d, h }: ScreenProps) {
  const { people, totals, cats } = d
  const [selected, setSelected] = useState<string | null>(null)
  // Include people who have not contributed yet so newly added people are visible.
  const contributors = [
    ...people,
    ...state.payers
      .filter((p) => !people.some((person) => person.name === p.name))
      .map((p) => ({
        name: p.name,
        amount: 0,
        amountFmt: fmt(0),
        pct: 0,
        color: p.color,
        tint: p.tint,
        shortName: p.short_name,
        initial: p.short_name[0] || '?',
        payments: [],
      })),
  ]
  const active = contributors.find((p) => p.name === selected)
  const slices = people.map((p) => ({
    value: p.amount,
    color: !active || active.name === p.name ? p.color : '#EDE5E0',
  }))
  return (
    <div className="screen">
      <ScreenHeading
        eyebrow="A CELEBRATION WE BUILD TOGETHER"
        title="Better, together."
        description="Every contribution is part of your story."
        action={<AddButton onClick={h.openPerson}>Person</AddButton>}
      />
      <section className="contribution-card">
        <div
          className="chart-ring"
          role="img"
          aria-label={`${active ? active.shortName : 'Total'} contributed ${fmt(active ? active.amount : totals.totalPaid)}`}
          style={{ background: donut(slices) }}
        >
          <div>
            <span>{active ? active.shortName : 'CONTRIBUTED'}</span>
            <strong>{fmtShort(active ? active.amount : totals.totalPaid)}</strong>
            {active && <small>{active.pct}% of total</small>}
          </div>
        </div>
        <p>
          {contributors.length
            ? 'Tap a person to explore their contributions'
            : 'Every contribution will find its place here'}
        </p>
      </section>
      <div className="section-heading">
        <h2>Made possible by</h2>
        <span className="count-label">{contributors.length} people</span>
      </div>
      {contributors.map((p) => {
        const open = selected === p.name
        return (
          <section className={`person-card ${open ? 'expanded' : ''}`} key={p.name}>
            <button
              className="person-toggle"
              onClick={() => setSelected(open ? null : p.name)}
              aria-expanded={open}
              aria-controls={`person-${encodeURIComponent(p.name)}`}
            >
              <span className="person-avatar" style={{ background: p.tint, color: 'var(--wine)' }}>
                {p.initial}
              </span>
              <span className="person-name">
                <strong>{p.shortName}</strong>
                <small>
                  {p.payments.length} {p.payments.length === 1 ? 'payment' : 'payments'} · {p.pct}%
                  of total
                </small>
              </span>
              <span className="person-amount">
                <strong>{p.amountFmt}</strong>
                <Icon
                  name="chevron"
                  size={16}
                  style={{ transform: open ? 'rotate(90deg)' : undefined }}
                />
              </span>
            </button>
            <ProgressBar value={p.pct} color={p.color} label={`${p.shortName} contribution`} />
            {open && (
              <div className="person-payments" id={`person-${encodeURIComponent(p.name)}`}>
                <p className="eyebrow">CONTRIBUTIONS</p>
                {p.payments.map((pay) => {
                  const dp = dateParts(pay.date)
                  const cat = cats.find((c) => c.id === pay.category_id)
                  return (
                    <div className="person-payment" key={pay.id}>
                      <span className="payment-date">
                        <strong>{dp.day}</strong>
                        <span>{dp.mon}</span>
                      </span>
                      <span>
                        <strong>{pay.item}</strong>
                        <small>{cat?.name || 'Unknown category'}</small>
                      </span>
                      <b>{fmt(pay.amount)}</b>
                    </div>
                  )
                })}
                {!p.payments.length && (
                  <p className="muted">No payments yet. Their contributions will appear here.</p>
                )}
              </div>
            )}
          </section>
        )
      })}
      {!contributors.length && (
        <EmptyState
          icon="people"
          title="Better, together"
          description="Add the people helping bring your celebration to life."
          action={<AddButton onClick={h.openPerson}>Add a person</AddButton>}
        />
      )}
    </div>
  )
}
