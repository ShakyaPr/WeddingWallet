import { useState } from 'react'
import type { AppState } from '../types'
import type { Derived } from '../lib/compute'
import { allHistory } from '../lib/api'
import { budgetCsv, paymentsCsv, historyCsv, downloadCsv } from '../lib/export'
import Icon from './Icon'

export default function ExportSheet({ state, d }: { state: AppState; d: Derived }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  async function exportFile(kind: 'budget' | 'payments' | 'history') {
    setBusy(kind)
    setError('')
    setSuccess('')
    try {
      const text =
        kind === 'history'
          ? historyCsv(await allHistory())
          : kind === 'budget'
            ? budgetCsv(d)
            : paymentsCsv(state)
      downloadCsv(kind, text)
      setSuccess('Your CSV file is ready. Check your browser’s downloads.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  return (
    <div>
      <h2 id="sheet-title" className="sheet-title">
        Your plans, to keep
      </h2>
      <p className="sheet-subtitle">
        Download CSV files for Excel, Numbers, or Google Sheets. All amounts are in Sri Lankan
        rupees.
      </p>
      <div className="export-options">
        {(
          [
            {
              key: 'budget',
              icon: 'budget',
              title: 'Budget CSV',
              description: `${state.categories.length} items · quotes, payments & projections`,
            },
            {
              key: 'payments',
              icon: 'payments',
              title: 'Payments CSV',
              description: `${state.payments.length} payments · dates, amounts & people`,
            },
            {
              key: 'history',
              icon: 'history',
              title: 'Change history CSV',
              description: 'All recorded changes · who, when & before / after',
            },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            className="export-option"
            disabled={!!busy}
            onClick={() => exportFile(option.key)}
          >
            <span className="category-icon">
              <Icon name={option.icon} />
            </span>
            <span>
              <strong>{busy === option.key ? 'Preparing your file…' : option.title}</strong>
              <small>{option.description}</small>
            </span>
            <Icon name="download" size={18} />
          </button>
        ))}
      </div>
      <p className="export-note">
        Exports include all records, regardless of search or filters. Unknown quotes and balances
        stay blank. Projections remain provisional while quotes are missing.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          Couldn’t export: {error}. Please try again.
        </p>
      )}
      {success && (
        <p className="inline-success" role="status">
          {success}
        </p>
      )}
    </div>
  )
}
