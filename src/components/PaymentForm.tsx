import { useState } from 'react'
import type { Category, NewPayment, Payer } from '../types'
import { Label, TextInput, Select, primaryBtn } from './ui'
import { todayISO } from '../lib/format'

interface Props {
  categories: Category[]
  payers: Payer[]
  initialCategoryId?: string
  saving: boolean
  onSubmit: (p: NewPayment) => void
}

export default function PaymentForm({ categories, payers, initialCategoryId, saving, onSubmit }: Props) {
  const [categoryId, setCategoryId] = useState(initialCategoryId || categories[0]?.id || '')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(payers[0]?.name || '')
  const [date, setDate] = useState(todayISO())

  const valid = !!categoryId && Number(amount) > 0 && !!paidBy

  return (
    <div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 600, marginBottom: 18 }}>Record a payment</div>

      <Label>Category</Label>
      <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <Label>Description</Label>
      <TextInput value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Advance, Final settlement" />

      <Label>Amount (Rs)</Label>
      <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="numeric" placeholder="0" />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Label>Paid by</Label>
          <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {payers.map((p) => (
              <option key={p.id} value={p.name}>{p.short_name}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Label>Date</Label>
          <TextInput value={date} onChange={(e) => setDate(e.target.value)} type="date" style={{ padding: '11px 13px' }} />
        </div>
      </div>

      <button
        disabled={!valid || saving}
        onClick={() => valid && onSubmit({ category_id: categoryId, item: item.trim() || 'Payment', amount: Number(amount), paid_by: paidBy, date })}
        style={primaryBtn}
      >
        {saving ? 'Saving…' : 'Save payment'}
      </button>
    </div>
  )
}
