import { useState } from 'react'
import type { ScreenProps } from '../viewtypes'
import { AddButton, EmptyState, ProgressBar, ScreenHeading, SearchField } from '../components/ui'
import Icon, { categoryIcon } from '../components/Icon'
import BudgetCertainty from '../components/BudgetCertainty'
import DataActions from '../components/DataActions'
import { fmt } from '../lib/format'

export default function Budget({
  d,
  h,
  initialFilter = 'All items',
}: ScreenProps & { initialFilter?: string }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const filtered = d.cats.filter(
    (c) =>
      `${c.name} ${c.vendor}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'All items' ||
        (filter === 'Awaiting quote'
          ? !c.hasQuote
          : filter === 'To pay'
            ? c.hasQuote && c.balance > 0
            : c.hasQuote && c.balance === 0))
  )
  return (
    <div className="screen">
      <ScreenHeading
        eyebrow="THE PLAN FOR YOUR BIG DAY"
        title="Your budget"
        description={`${d.cats.length} details, one beautiful celebration.`}
        action={<AddButton onClick={h.openCategory}>Add item</AddButton>}
      />
      <DataActions onExport={h.openExports} onHistory={h.openHistory} />
      <div className="budget-summary">
        <span>
          Planned budget<strong>{fmt(d.totals.totalBudget)}</strong>
        </span>
        <span>
          Known balance<strong>{fmt(d.totals.totalBalance)}</strong>
        </span>
      </div>
      <BudgetCertainty
        totals={d.totals}
        onView={filter === 'Awaiting quote' ? undefined : () => setFilter('Awaiting quote')}
      />
      <SearchField value={search} onChange={setSearch} placeholder="Search items or vendors" />
      <div className="filter-row" aria-label="Budget filter">
        {['All items', 'To pay', 'Fully paid', 'Awaiting quote'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-chip ${filter === f ? 'selected' : ''}`}
            aria-pressed={filter === f}
          >
            {f}
          </button>
        ))}
        <span className="filter-count">{filtered.length} items</span>
      </div>
      <div className="budget-list">
        {filtered.map((c) => (
          <button key={c.id} className="budget-card" onClick={() => h.openDetail(c.id)}>
            <div className="budget-card-top">
              <span
                className="category-icon"
                style={{ color: c.sliceColor, background: `${c.sliceColor}13` }}
              >
                <Icon name={categoryIcon(c.name)} size={23} />
              </span>
              <div className="budget-card-name">
                <h2>{c.name}</h2>
                <p>{c.vendor || 'Vendor to be decided'}</p>
              </div>
              <Icon name="chevron" size={17} />
            </div>
            <div className="budget-money">
              <div>
                <span>Planned</span>
                <strong>{c.budgetFmt}</strong>
              </div>
              <div>
                <span>Quoted</span>
                <strong style={{ color: c.quoteColor }}>{c.quoteFmt}</strong>
              </div>
            </div>
            <div className="budget-paid">
              <span>
                <span className="positive">{c.paidFmt}</span> paid
              </span>
              <strong>
                {c.hasQuote ? (
                  <>
                    {c.balanceFmt} <span>to go</span>
                  </>
                ) : (
                  'Balance unknown'
                )}
              </strong>
            </div>
            {c.hasQuote && (
              <ProgressBar
                value={c.paidPct}
                color={c.quote > 0 && c.balance === 0 ? 'var(--sage)' : undefined}
                label={`${c.name} paid`}
              />
            )}
            <div className="budget-card-footer">
              <span
                className="status-badge"
                style={{ background: c.status.bg, color: c.status.color }}
              >
                {c.status.label}
              </span>
              {c.overBudget ? (
                <span className="over-budget">{c.overByFmt} over budget</span>
              ) : (
                <span className="muted">{c.hasQuote ? `${c.paidPct}% paid` : 'Quote needed'}</span>
              )}
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          icon="budget"
          title={
            search || filter !== 'All items'
              ? 'No matching items'
              : 'A beautiful day starts with a plan'
          }
          description={
            search || filter !== 'All items'
              ? 'Try another search or switch your filter.'
              : 'Add your venue, flowers, photography, and every detail in between.'
          }
          action={
            !search && filter === 'All items' ? (
              <AddButton onClick={h.openCategory}>Add your first item</AddButton>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
