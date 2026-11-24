import type { Totals } from '../lib/compute'
import { fmt } from '../lib/format'
import Icon from './Icon'

export default function BudgetCertainty({
  totals: t,
  onView,
}: {
  totals: Totals
  onView?: () => void
}) {
  if (!t.awaitingQuoteCount) return null
  return (
    <section className="certainty-card" aria-label="Budget certainty">
      <div className="certainty-heading">
        <Icon name="budget" size={20} />
        <strong>
          {t.awaitingQuoteCount} {t.awaitingQuoteCount === 1 ? 'item is' : 'items are'} awaiting
          quotes
        </strong>
      </div>
      <p>
        Known balances exclude these items. Their planned {fmt(t.unquotedBudget)} is still an
        estimate.
      </p>
      <div className="certainty-estimate">
        <span>
          Projected total <small>provisional</small>
        </span>
        <strong>{fmt(t.projectedTotal)}</strong>
      </div>
      <details className="certainty-explanation">
        <summary>How this is estimated</summary>
        <p>
          Uses quotes where available and planned amounts otherwise, with payments already made as
          the minimum.
        </p>
      </details>
      {onView && (
        <button className="text-button" onClick={onView}>
          Review missing quotes <Icon name="arrow" size={15} />
        </button>
      )}
    </section>
  )
}
