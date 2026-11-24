import { useState } from 'react'
import type { Category, NewPayment, Payer, Payment } from '../types'
import { Label, TextInput, Select, primaryBtn } from './ui'
import { todayISO } from '../lib/format'

interface Props {
  categories: Category[]
  payers: Payer[]
  initialCategoryId?: string
  initial?: Payment
  saving: boolean
  onSubmit: (p: NewPayment) => void
}

export default function PaymentForm({
  categories,
  payers,
  initialCategoryId,
  initial,
  saving,
  onSubmit,
}: Props) {
  const [categoryId, setCategoryId] = useState(
    initial?.category_id || initialCategoryId || categories[0]?.id || ''
  )
  const [item, setItem] = useState(initial?.item || '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [paidBy, setPaidBy] = useState(initial?.paid_by || payers[0]?.name || '')
  const [date, setDate] = useState(initial?.date || todayISO())

  const valid =
    !!categoryId && Number.isFinite(Number(amount)) && Number(amount) > 0 && !!paidBy && !!date

  function submit() {
    if (valid && !saving)
      onSubmit({
        category_id: categoryId,
        item: item.trim() || 'Payment',
        amount: Number(amount),
        paid_by: paidBy,
        date,
      })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <h2 id="sheet-title" className="sheet-title">
        {initial ? 'Edit payment' : 'Record a payment'}
      </h2>
      <p className="sheet-subtitle">
        {initial
          ? 'Correct the details. Your changes will be saved in history.'
          : 'Another little step towards your big day.'}
      </p>

      {(!categories.length || (!payers.length && !initial?.paid_by)) && (
        <p className="form-hint">Add a budget item and a person before recording a payment.</p>
      )}
      <Label htmlFor="paymentform-category">Category</Label>
      <Select
        id="paymentform-category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Label htmlFor="paymentform-description">Description</Label>
      <TextInput
        id="paymentform-description"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        placeholder="e.g. Advance, Final settlement"
      />

      <Label htmlFor="paymentform-amount-rs">Amount (Rs)</Label>
      <TextInput
        id="paymentform-amount-rs"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        placeholder="0"
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Label htmlFor="paymentform-paid-by">Paid by</Label>
          <Select
            id="paymentform-paid-by"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            {initial?.paid_by && !payers.some((p) => p.name === initial.paid_by) && (
              <option value={initial.paid_by}>{initial.paid_by}</option>
            )}
            {payers.map((p) => (
              <option key={p.id} value={p.name}>
                {p.short_name}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Label htmlFor="paymentform-date">Date</Label>
          <TextInput
            id="paymentform-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            style={{ padding: '11px 13px' }}
          />
        </div>
      </div>

      <button disabled={!valid || saving} type="submit" style={primaryBtn}>
        {saving ? 'Saving…' : initial ? 'Save changes' : 'Save payment'}
      </button>
    </form>
  )
}
