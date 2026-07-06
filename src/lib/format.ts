import type { Payer } from '../types'

export const PALETTE = ['#A05C6A', '#7E4451', '#C9A15B', '#7C9A78', '#8FA1B3', '#C08497']
export const TINTS = ['#F6E7EA', '#F1E4E6', '#F7EFDD', '#EEF3EC', '#EEF1F4', '#F5E9EF']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const NBSP = ' '

/** "Rs 1,969,000" */
export function fmt(n: number | string): string {
  return 'Rs' + NBSP + Math.round(Number(n) || 0).toLocaleString('en-US')
}

/** Compact: "Rs 1.97M", "Rs 200K" */
export function fmtShort(n: number | string): string {
  const v = Number(n) || 0
  if (v >= 1_000_000) return 'Rs' + NBSP + (v / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (v >= 1000) return 'Rs' + NBSP + Math.round(v / 1000) + 'K'
  return fmt(v)
}

export interface PayerMeta {
  color: string
  tint: string
  short: string
}

/** Look a payer up by name; fall back to a stable default for unknown names. */
export function payerMeta(name: string, payers: Payer[]): PayerMeta {
  const hit = payers.find((p) => p.name === name)
  if (hit) return { color: hit.color, tint: hit.tint, short: hit.short_name }
  return { color: '#8FA1B3', tint: '#EEF1F4', short: (name || '').split(/[@\s]/)[0] || 'Other' }
}

/** Extract a dialable phone number from a free-text contact string. */
export function phoneOf(contact: string): string {
  const m = (contact || '').match(/[0-9][0-9\s]{6,}/)
  return m ? m[0].replace(/\s/g, '') : ''
}

/** Build a conic-gradient() donut/pie background from weighted colored slices. */
export function donut(items: { value: number; color: string }[]): string {
  const total = items.reduce((a, x) => a + x.value, 0) || 1
  let acc = 0
  const segs = items.map((x) => {
    const s = (acc / total) * 360
    acc += x.value
    const e = (acc / total) * 360
    return `${x.color} ${s.toFixed(1)}deg ${e.toFixed(1)}deg`
  })
  return `conic-gradient(${segs.join(',')})`
}

export interface DateParts {
  day: string
  mon: string
  fmt: string
}

export function dateParts(d: string): DateParts {
  const p = (d || '').split('-')
  return {
    day: p[2] || '',
    mon: MONTHS[(parseInt(p[1], 10) || 1) - 1],
    fmt: p[0] ? `${p[0]}/${p[1]}/${p[2]}` : d,
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
