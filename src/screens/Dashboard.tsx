import type { ScreenProps, DashLayout, Tab } from '../viewtypes'
import { fmt, fmtShort, donut, dateParts, payerMeta } from '../lib/format'
import BudgetCertainty from '../components/BudgetCertainty'
import DataActions from '../components/DataActions'
import Icon, { categoryIcon } from '../components/Icon'
import { EmptyState, ProgressBar, ScreenHeading } from '../components/ui'

interface Props extends ScreenProps {
  layout: DashLayout
  setLayout: (layout: DashLayout) => void
  onNavigate: (tab: Tab) => void
  onReviewQuotes: () => void
}

export default function Dashboard({
  state,
  d,
  h,
  layout,
  setLayout,
  onNavigate,
  onReviewQuotes,
}: Props) {
  const { totals: t, cats, spentCats, people } = d
  const withinBudget = t.projectedDiff <= 0
  const settled = cats.filter((c) => c.quote > 0 && c.balance === 0).length
  const recent = [...state.payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const layouts: { key: DashLayout; label: string }[] = [
    { key: 'cards', label: 'Overview' },
    { key: 'progress', label: 'Progress' },
    { key: 'charts', label: 'Insights' },
  ]

  return (
    <div className="screen">
      <ScreenHeading
        eyebrow="A LITTLE PLANNING, A LOT OF LOVE"
        title="Your day, at a glance."
        description="Every detail. Every rupee. All in one place."
      />
      <DataActions onExport={h.openExports} onHistory={h.openHistory} />
      <div className="segmented" aria-label="Dashboard view">
        {layouts.map((s) => (
          <button
            key={s.key}
            className={layout === s.key ? 'selected' : ''}
            aria-pressed={layout === s.key}
            onClick={() => setLayout(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {layout !== 'cards' && <BudgetCertainty totals={t} onView={onReviewQuotes} />}
      {layout === 'cards' && (
        <>
          <section className="budget-hero" aria-label="Wedding payment summary">
            <div className="hero-flower" aria-hidden="true">
              <Icon name="flower" size={180} />
            </div>
            <div className="hero-top">
              <span className="eyebrow">A BEAUTIFUL DAY IN THE MAKING</span>
              <Icon name="heart" size={17} />
            </div>
            <div className="hero-main">
              <div>
                <p className="hero-label">Total paid so far</p>
                <div className="hero-amount">{fmt(t.totalPaid)}</div>
                <p className="hero-caption">
                  {t.totalQuote > 0
                    ? `Known quotes: ${fmt(t.totalQuote)}`
                    : 'Quotes not recorded yet'}
                </p>
              </div>
              <div
                className="hero-ring"
                style={{
                  background: `conic-gradient(#E8C8B5 ${Math.min(100, t.heroPct) * 3.6}deg, #ffffff22 0)`,
                }}
              >
                <div>
                  <strong>{t.totalQuote > 0 ? `${t.heroPct}%` : '—'}</strong>
                  <span>{t.totalQuote > 0 ? 'OF QUOTES' : 'NO QUOTES'}</span>
                </div>
              </div>
            </div>
            <div className="hero-footer">
              <div>
                <span>Known balance</span>
                <strong>{fmt(t.totalBalance)}</strong>
              </div>
              <div>
                <span>Planned budget</span>
                <strong>{fmt(t.totalBudget)}</strong>
              </div>
            </div>
          </section>
          <BudgetCertainty totals={t} onView={onReviewQuotes} />
          <div className="quick-stats">
            <button onClick={() => onNavigate('budget')}>
              <span className="stat-icon">
                <Icon name="budget" size={19} />
              </span>
              <div>
                <strong>
                  {cats.length}
                  <span> budget items</span>
                </strong>
                <small>{settled} fully paid</small>
              </div>
              <Icon name="chevron" size={15} />
            </button>
            <button onClick={() => onNavigate('payments')}>
              <span className="stat-icon sage">
                <Icon name="payments" size={19} />
              </span>
              <div>
                <strong>
                  {state.payments.length}
                  <span> payments</span>
                </strong>
                <small>Recorded so far</small>
              </div>
            </button>
          </div>
          <div className={`budget-note ${withinBudget ? '' : 'warning'}`}>
            <span className="note-icon">
              <Icon name={withinBudget ? 'check' : 'budget'} size={15} />
            </span>
            <p>
              {t.awaitingQuoteCount
                ? 'Your estimate is provisional.'
                : withinBudget
                  ? 'Your quotes are within budget.'
                  : 'Keep an eye on your budget.'}
              <strong>
                {fmt(Math.abs(t.projectedDiff))} {withinBudget ? 'below' : 'above'} your planned
                budget
              </strong>
            </p>
          </div>
          <div className="section-heading">
            <h2>Where it’s going</h2>
            <button className="text-button" onClick={() => onNavigate('budget')}>
              View budget <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="list-card">
            {[...spentCats]
              .sort((a, b) => b.paid - a.paid)
              .map((c) => (
                <button className="spend-row" key={c.id} onClick={() => h.openDetail(c.id)}>
                  <span
                    className="category-icon"
                    style={{ background: `${c.sliceColor}13`, color: c.sliceColor }}
                  >
                    <Icon name={categoryIcon(c.name)} size={21} />
                  </span>
                  <div className="spend-info">
                    <div className="row-between">
                      <strong>{c.name}</strong>
                      <b>{c.paidFmt}</b>
                    </div>
                    <ProgressBar
                      value={c.sharePct}
                      color={c.sliceColor}
                      label={`${c.name} share of spending`}
                    />
                    <span className="row-caption">{c.sharePct}% of total spending</span>
                  </div>
                </button>
              ))}
            {!spentCats.length && (
              <EmptyState
                title="Your story starts here"
                description="Record your first payment to see your spending take shape."
                action={
                  <button className="small-primary" onClick={() => h.openPayment()}>
                    Record a payment
                  </button>
                }
              />
            )}
          </div>
          {recent.length > 0 && (
            <>
              <div className="section-heading">
                <h2>Recent payments</h2>
                <button className="text-button" onClick={() => onNavigate('payments')}>
                  View all <Icon name="arrow" size={15} />
                </button>
              </div>
              <div className="list-card">
                {recent.map((p) => {
                  const c = cats.find((c) => c.id === p.category_id)
                  return (
                    <button
                      className="recent-row"
                      key={p.id}
                      onClick={() => h.openDetail(p.category_id)}
                    >
                      <span className="category-icon">
                        <Icon name={categoryIcon(c?.name || '')} />
                      </span>
                      <span className="recent-info">
                        <strong>{p.item}</strong>
                        <small>
                          {c?.name} · {payerMeta(p.paid_by, state.payers).short}
                        </small>
                      </span>
                      <span className="recent-amount">
                        <strong>{fmt(p.amount)}</strong>
                        <small>{dateParts(p.date).fmt}</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {layout === 'progress' && (
        <>
          <div className="summary-strip">
            <div>
              <span>Paid</span>
              <strong>{fmtShort(t.totalPaid)}</strong>
            </div>
            <div>
              <span>Known balance</span>
              <strong>{fmtShort(t.totalBalance)}</strong>
            </div>
            <div>
              <span>Fully paid</span>
              <strong>
                {settled} / {cats.length}
              </strong>
            </div>
          </div>
          <div className="section-heading">
            <h2>One detail at a time</h2>
            <span className="count-label">{cats.length} items</span>
          </div>
          {cats.map((c) => (
            <button key={c.id} className="progress-card" onClick={() => h.openDetail(c.id)}>
              <div className="row-between">
                <span className="item-heading">
                  <span className="category-icon">
                    <Icon name={categoryIcon(c.name)} />
                  </span>
                  <strong>{c.name}</strong>
                </span>
                <span
                  className="status-badge"
                  style={{ background: c.status.bg, color: c.status.color }}
                >
                  {c.status.label}
                </span>
              </div>
              <div className="progress-meta">
                <span>
                  {c.paidFmt}{' '}
                  <span className="muted">
                    {c.hasQuote ? `of ${c.quoteFmt}` : 'paid · awaiting quote'}
                  </span>
                </span>
                <strong>{c.hasQuote ? `${c.paidPct}%` : 'Not available'}</strong>
              </div>
              {c.hasQuote && (
                <ProgressBar
                  value={c.paidPct}
                  color={c.balance === 0 && c.quote > 0 ? 'var(--sage)' : undefined}
                  label={`${c.name} paid`}
                />
              )}
            </button>
          ))}
          {!cats.length && (
            <EmptyState
              icon="budget"
              title="Make room for your plans"
              description="Add your first budget item to start tracking progress."
              action={
                <button className="small-primary" onClick={h.openCategory}>
                  Add a budget item
                </button>
              }
            />
          )}
        </>
      )}

      {layout === 'charts' && (
        <>
          <Chart
            title="Spend by category"
            description="The little details behind your big day."
            items={spentCats.map((c) => ({
              name: c.name,
              value: c.paid,
              color: c.sliceColor,
              pct: c.sharePct,
            }))}
            total={t.totalPaid}
          />
          <Chart
            title="Made possible, together"
            description="Everyone’s contribution to your celebration."
            items={people.map((p) => ({
              name: p.shortName,
              value: p.amount,
              color: p.color,
              pct: p.pct,
            }))}
            total={t.totalPaid}
          />
          <section className="insight-card">
            <h2>Plans & commitments</h2>
            <div className="comparison-row">
              <span>Planned budget</span>
              <strong>{fmt(t.totalBudget)}</strong>
            </div>
            <ProgressBar value={100} color="#C5AF8E" label="Planned budget" />
            <div className="comparison-row">
              <span>Projected total{t.awaitingQuoteCount ? ' (provisional)' : ''}</span>
              <strong>{fmt(t.projectedTotal)}</strong>
            </div>
            <ProgressBar
              value={t.totalBudget > 0 ? (t.projectedTotal / t.totalBudget) * 100 : 0}
              label="Projected share of budget"
            />
            <p className={`comparison-note ${withinBudget ? 'positive' : 'negative'}`}>
              {fmt(Math.abs(t.projectedDiff))} {withinBudget ? 'under' : 'over'} your planned budget
            </p>
          </section>
        </>
      )}
      <p className="screen-footnote">
        <Icon name="heart" size={12} /> A little closer to your forever.
      </p>
    </div>
  )
}

function Chart({
  title,
  description,
  items,
  total,
}: {
  title: string
  description: string
  items: { name: string; value: number; color: string; pct: number }[]
  total: number
}) {
  return (
    <section className="insight-card">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <div
        className="chart-ring"
        role="img"
        aria-label={`${title}: ${fmt(total)}`}
        style={{ background: donut(items) }}
      >
        <div>
          <span>TOTAL PAID</span>
          <strong>{fmtShort(total)}</strong>
        </div>
      </div>
      {items.map((item) => (
        <div className="legend-row" key={item.name}>
          <span className="legend-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <strong>{item.pct}%</strong>
        </div>
      ))}
      {!items.length && (
        <p className="chart-empty">Your chart will appear after your first payment.</p>
      )}
    </section>
  )
}
