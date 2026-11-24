import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derive } from '../src/lib/compute.js'
import { budgetCsv, csvText, historyCsv, paymentsCsv } from '../src/lib/export.js'
import type { AppState, Category } from '../src/types.js'

const category = (id: string, budget: number, quote: number): Category => ({
  id,
  name: id,
  vendor: '',
  contact: '',
  budget,
  quote,
  sort_order: 1,
})
const state: AppState = {
  categories: [
    category('quoted', 100, 120),
    category('unquoted', 50, 0),
    category('overpaid', 100, 100),
  ],
  payers: [],
  payments: [
    {
      id: 'p1',
      category_id: 'quoted',
      date: '2026-11-24',
      item: 'Advance',
      paid_by: 'Amma',
      amount: 20.25,
    },
    {
      id: 'p2',
      category_id: 'unquoted',
      date: '2026-11-24',
      item: 'Deposit',
      paid_by: 'Amma',
      amount: 70,
    },
    {
      id: 'p3',
      category_id: 'overpaid',
      date: '2026-11-24',
      item: 'Settlement',
      paid_by: 'Amma',
      amount: 150,
    },
  ],
}

test('unknown quotes remain explicit and overpayments cannot hide another vendor balance', () => {
  const d = derive(state)
  assert.equal(d.totals.awaitingQuoteCount, 1)
  assert.equal(d.totals.unquotedBudget, 50)
  assert.equal(d.totals.totalBalance, 99.75)
  assert.equal(d.totals.projectedTotal, 340)
  assert.equal(d.totals.projectedDiff, 90)
  assert.equal(d.cats[1].status.label, 'Awaiting quote')
  assert.equal(d.cats[1].balanceFmt, 'Awaiting quote')
  assert.equal(d.cats[1].projected, 70)
  assert.equal(d.totals.heroPct, 55)
})

test('CSV preserves cents, blanks unknowns, quotes multiline text and neutralizes formula text', () => {
  const csv = csvText(
    ['Text', 'Amount'],
    [
      [' =HYPERLINK("bad")', 10.25],
      ['Cake, "roses"\nthank you', -10],
      ['\tSUM(1)', null],
      ['@formula', 0],
    ]
  )
  assert(csv.startsWith('\uFEFF'))
  assert(csv.includes('"\' =HYPERLINK(""bad"")","10.25"'))
  assert(csv.includes('"Cake, ""roses""\nthank you","-10"'))
  assert(csv.includes('"\'\tSUM(1)",""'))
  assert(csv.includes('"\'@formula","0"'))
  const budget = budgetCsv(derive(state))
  assert(budget.includes('"Awaiting quote","","70","","70"'))
  assert(paymentsCsv(state).includes('"20.25"'))
  assert(historyCsv([]).includes('Before (JSON)'))
})
