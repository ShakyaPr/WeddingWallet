import type { AppState, Category, Payment, Payer } from '../types'
import { PALETTE, TINTS, fmt, payerMeta } from './format'

export interface StatusBadge {
  label: string
  bg: string
  color: string
}

export interface ComputedCategory extends Category {
  paid: number
  balance: number
  paidPct: number
  status: StatusBadge
  overBudget: boolean
  overByFmt: string
  sliceColor: string
  quoteColor: string
  budgetFmt: string
  quoteFmt: string
  paidFmt: string
  balanceFmt: string
  payments: Payment[]
}

export interface ComputedPerson {
  name: string
  amount: number
  amountFmt: string
  pct: number
  color: string
  tint: string
  shortName: string
  initial: string
}

export interface ComputedVendor {
  name: string
  item: string
  contact: string
  hasContact: boolean
  quoteFmt: string
  paidFmt: string
  balanceFmt: string
  initial: string
  color: string
  tint: string
  phone: string
  hasPhone: boolean
}

/** Per-category rollups: paid, balance, %, status badge, over-budget flag. */
export function computeCategories(categories: Category[], payments: Payment[]): ComputedCategory[] {
  return categories.map((c, i) => {
    const cps = payments.filter((p) => p.category_id === c.id)
    const paid = cps.reduce((a, p) => a + Number(p.amount || 0), 0)
    const quote = Number(c.quote || 0)
    const budget = Number(c.budget || 0)
    const balance = Math.max(quote - paid, 0)
    const pct = quote > 0 ? Math.min(100, Math.round((paid / quote) * 100)) : 0

    let status: StatusBadge
    if (quote === 0 && paid === 0) status = { label: 'Not started', bg: '#F0E9E9', color: '#9A868A' }
    else if (paid <= 0) status = { label: 'Pending', bg: '#F0E9E9', color: '#9A868A' }
    else if (paid >= quote) status = { label: 'Fully paid', bg: '#E9F0E6', color: '#5E7A58' }
    else status = { label: 'Partially paid', bg: '#F6EEDD', color: '#9A7434' }

    const overBudget = quote > budget && budget > 0

    return {
      ...c,
      paid,
      quote,
      budget,
      balance,
      paidPct: pct,
      status,
      overBudget,
      overByFmt: fmt(quote - budget),
      sliceColor: PALETTE[i % PALETTE.length],
      quoteColor: overBudget ? '#A65454' : '#3A2C2E',
      budgetFmt: fmt(budget),
      quoteFmt: quote > 0 ? fmt(quote) : '—',
      paidFmt: fmt(paid),
      balanceFmt: fmt(balance),
      payments: cps,
    }
  })
}

/** Contributions grouped by payer, largest first. */
export function computePeople(payments: Payment[], payers: Payer[], totalPaid: number): ComputedPerson[] {
  const map: Record<string, number> = {}
  payments.forEach((p) => {
    map[p.paid_by] = (map[p.paid_by] || 0) + Number(p.amount || 0)
  })
  return Object.keys(map)
    .map((name) => {
      const m = payerMeta(name, payers)
      return {
        name,
        amount: map[name],
        amountFmt: fmt(map[name]),
        pct: totalPaid > 0 ? +((map[name] / totalPaid) * 100).toFixed(1) : 0,
        color: m.color,
        tint: m.tint,
        shortName: m.short,
        initial: m.short[0] || '?',
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

/** One card per category that has a real (non-placeholder) vendor. */
export function computeVendors(cats: ComputedCategory[]): ComputedVendor[] {
  return cats
    .filter((c) => c.vendor && c.vendor !== 'To be decided')
    .map((c, i) => {
      const phone = phoneFromContact(c.contact)
      return {
        name: c.vendor,
        item: c.name,
        contact: c.contact,
        hasContact: !!c.contact,
        quoteFmt: c.quoteFmt,
        paidFmt: c.paidFmt,
        balanceFmt: c.balanceFmt,
        initial: c.vendor[0] || '?',
        color: PALETTE[i % PALETTE.length],
        tint: TINTS[i % TINTS.length],
        phone,
        hasPhone: !!phone,
      }
    })
}

function phoneFromContact(contact: string): string {
  const m = (contact || '').match(/[0-9][0-9\s]{6,}/)
  return m ? m[0].replace(/\s/g, '') : ''
}

export interface Totals {
  totalBudget: number
  totalQuote: number
  totalPaid: number
  totalBalance: number
  heroPct: number
  overBudgetDiff: number
}

export function computeTotals(cats: ComputedCategory[]): Totals {
  const totalBudget = cats.reduce((a, c) => a + c.budget, 0)
  const totalQuote = cats.reduce((a, c) => a + c.quote, 0)
  const totalPaid = cats.reduce((a, c) => a + c.paid, 0)
  const totalBalance = Math.max(totalQuote - totalPaid, 0)
  const heroPct = totalQuote > 0 ? Math.round((totalPaid / totalQuote) * 100) : 0
  return { totalBudget, totalQuote, totalPaid, totalBalance, heroPct, overBudgetDiff: totalQuote - totalBudget }
}

/** Everything the screens need, derived from raw state in one place. */
export function derive(state: AppState) {
  const cats = computeCategories(state.categories, state.payments)
  const totals = computeTotals(cats)
  const spentCats = cats
    .filter((c) => c.paid > 0)
    .map((c) => ({ ...c, sharePct: totals.totalPaid > 0 ? Math.round((c.paid / totals.totalPaid) * 100) : 0 }))
  const people = computePeople(state.payments, state.payers, totals.totalPaid)
  const vendors = computeVendors(cats)
  return { cats, totals, spentCats, people, vendors }
}

export type Derived = ReturnType<typeof derive>
export type SpentCategory = Derived['spentCats'][number]
