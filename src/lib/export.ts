import type { ActivityEntry, AppState } from '../types'
import type { Derived } from './compute'
import { todayISO } from './format'

type Cell = string | number | null | undefined

/** Quote every field and prevent text cells from becoming spreadsheet formulas. */
export function csvText(headers: string[], rows: Cell[][]): string {
  function cell(value: Cell) {
    let text = value == null ? '' : String(value)
    if (typeof value === 'string' && (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)))
      text = "'" + text
    return '"' + text.replace(/"/g, '""') + '"'
  }
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function budgetCsv(d: Derived): string {
  return csvText(
    [
      'Item',
      'Vendor',
      'Contact',
      'Planned budget (LKR)',
      'Quote status',
      'Quoted (LKR)',
      'Paid (LKR)',
      'Known balance (LKR)',
      'Projected total (LKR)',
      'Payment status',
    ],
    d.cats.map((c) => [
      c.name,
      c.vendor,
      c.contact,
      c.budget,
      c.hasQuote ? 'Quote recorded' : 'Awaiting quote',
      c.hasQuote ? c.quote : null,
      c.paid,
      c.hasQuote ? c.balance : null,
      c.projected,
      c.status.label,
    ])
  )
}

export function paymentsCsv(state: AppState): string {
  return csvText(
    ['Payment ID', 'Date', 'Description', 'Budget item', 'Vendor', 'Paid by', 'Amount (LKR)'],
    [...state.payments]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => {
        const category = state.categories.find((c) => c.id === p.category_id)
        return [
          p.id,
          p.date,
          p.item,
          category?.name || '',
          category?.vendor || '',
          p.paid_by,
          Number(p.amount),
        ]
      })
  )
}

export function historyCsv(entries: ActivityEntry[]): string {
  return csvText(
    [
      'History ID',
      'Time (ISO)',
      'Changed by',
      'User ID',
      'Action',
      'Record type',
      'Record',
      'Record ID',
      'Before (JSON)',
      'After (JSON)',
      'Restores history ID',
    ],
    entries.map((e) => [
      e.id,
      e.created_at,
      e.actor_name,
      e.actor_id,
      e.action,
      e.entity_type,
      e.entity_label,
      e.entity_id,
      e.before_data ? JSON.stringify(e.before_data) : '',
      e.after_data ? JSON.stringify(e.after_data) : '',
      e.restores_id,
    ])
  )
}

export function downloadCsv(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `weddingwallet-${name}-${todayISO()}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
