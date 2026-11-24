import { useEffect, useRef, useState } from 'react'
import type { ActivityEntry, AppState } from '../types'
import { api } from '../lib/api'
import { fmt } from '../lib/format'
import Icon from './Icon'
import { EmptyState } from './ui'

const labels: Record<string, string> = {
  name: 'Name',
  vendor: 'Vendor',
  contact: 'Contact',
  budget: 'Planned budget',
  quote: 'Vendor quote',
  category_id: 'Budget item',
  date: 'Payment date',
  item: 'Description',
  paid_by: 'Paid by',
  amount: 'Amount',
  short_name: 'Short label',
  color: 'Colour',
  tint: 'Background colour',
}
const entities = { category: 'Budget item', payment: 'Payment', person: 'Person' }
const actions = { created: 'Added', updated: 'Edited', deleted: 'Deleted', restored: 'Restored' }

export default function HistorySheet({ state }: { state: AppState }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const live = useRef(false)
  const inFlight = useRef(false)
  async function load(before?: string) {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError('')
    try {
      const page = await api.history(before)
      if (!live.current) return
      setEntries((previous) => (before ? [...previous, ...page.entries] : page.entries))
      setCursor(page.nextCursor)
    } catch (e) {
      if (live.current) setError((e as Error).message)
    } finally {
      inFlight.current = false
      if (live.current) setLoading(false)
    }
  }
  useEffect(() => {
    live.current = true
    void load()
    return () => {
      live.current = false
    }
  }, [])

  function display(key: string, value: unknown, snapshot: Record<string, unknown>) {
    if (key === 'quote' && Number(value) === 0) return 'Awaiting quote'
    if (['budget', 'quote', 'amount'].includes(key)) return fmt(Number(value))
    if (key === 'category_id')
      return String(
        snapshot._category_name ||
          state.categories.find((c) => c.id === value)?.name ||
          'Removed budget item'
      )
    return value == null || value === '' ? 'Not set' : String(value)
  }

  return (
    <div>
      <h2 id="sheet-title" className="sheet-title">
        Every change, remembered
      </h2>
      <p className="sheet-subtitle">
        Who changed what, and when. History starts from the day this feature was added.
      </p>
      <div className="history-list">
        {entries.map((entry) => {
          const before = entry.before_data || {},
            after = entry.after_data || {}
          const keys = Object.keys(labels)
            .filter((key) => key in before || key in after)
            .filter(
              (key) =>
                entry.action !== 'updated' ||
                JSON.stringify(before[key]) !== JSON.stringify(after[key])
            )
          return (
            <details key={entry.id} className="history-entry">
              <summary>
                <span className={`history-icon ${entry.action}`}>
                  <Icon
                    name={
                      entry.action === 'deleted'
                        ? 'trash'
                        : entry.action === 'updated'
                          ? 'edit'
                          : entry.action === 'restored'
                            ? 'history'
                            : 'plus'
                    }
                    size={18}
                  />
                </span>
                <span className="history-summary">
                  <strong>
                    {actions[entry.action]} {entities[entry.entity_type].toLowerCase()}
                  </strong>
                  <span>{entry.entity_label}</span>
                  <small>
                    {entry.actor_name} ·{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(entry.created_at))}
                  </small>
                </span>
                <Icon name="chevron" size={15} />
              </summary>
              <div className="history-detail">
                {keys.map((key) => (
                  <div className="history-field" key={key}>
                    <span>{labels[key]}</span>
                    {entry.action === 'updated' ? (
                      <div>
                        <del>{display(key, before[key], before)}</del>
                        <span className="history-value">{display(key, after[key], after)}</span>
                      </div>
                    ) : (
                      <strong>
                        {display(
                          key,
                          entry.action === 'deleted' ? before[key] : after[key],
                          entry.action === 'deleted' ? before : after
                        )}
                      </strong>
                    )}
                  </div>
                ))}
                {Array.isArray(before._payments) && before._payments.length > 0 && (
                  <p className="export-note">
                    Included {before._payments.length} linked payments. Their deletions are also
                    listed in history.
                  </p>
                )}
              </div>
            </details>
          )
        })}
      </div>
      {!loading && !entries.length && !error && (
        <EmptyState
          icon="history"
          title="A fresh page in your story"
          description="New items, payments, edits, and deletions will appear here with the person who made the change."
        />
      )}
      {loading && (
        <p className="history-loading" role="status">
          Loading changes…
        </p>
      )}
      {error && (
        <div className="inline-error" role="alert">
          <p>Couldn’t load history: {error}</p>
          <button className="secondary-button" onClick={() => load(cursor || undefined)}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && cursor && (
        <button className="secondary-button history-more" onClick={() => load(cursor)}>
          Load older changes
        </button>
      )}
    </div>
  )
}
