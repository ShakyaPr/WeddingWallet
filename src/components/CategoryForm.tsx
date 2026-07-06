import { useState } from 'react'
import type { NewCategory } from '../types'
import { Label, TextInput, primaryBtn } from './ui'

export interface CategoryFormValues {
  name: string
  vendor: string
  budget: number | string
  quote: number | string
  contact: string
}

interface Props {
  saving: boolean
  onSubmit: (c: NewCategory) => void
  /** When provided, the form is in "edit" mode and pre-filled. */
  initial?: CategoryFormValues
  title?: string
  submitLabel?: string
}

export default function CategoryForm({ saving, onSubmit, initial, title = 'New budget item', submitLabel = 'Add item' }: Props) {
  // "To be decided" is a placeholder vendor — show it as empty so it's editable.
  const initialVendor = initial?.vendor && initial.vendor !== 'To be decided' ? initial.vendor : ''
  const [name, setName] = useState(initial?.name ?? '')
  const [vendor, setVendor] = useState(initialVendor)
  const [budget, setBudget] = useState(initial?.budget ? String(initial.budget) : '')
  const [quote, setQuote] = useState(initial?.quote ? String(initial.quote) : '')
  const [contact, setContact] = useState(initial?.contact ?? '')

  const valid = name.trim().length > 0

  return (
    <div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 600, marginBottom: 18 }}>{title}</div>

      <Label>Item name</Label>
      <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Photography" />

      <Label>Vendor</Label>
      <TextInput value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Label>Budget (Rs)</Label>
          <TextInput value={budget} onChange={(e) => setBudget(e.target.value)} type="number" inputMode="numeric" placeholder="0" />
        </div>
        <div style={{ flex: 1 }}>
          <Label>Quoted (Rs)</Label>
          <TextInput value={quote} onChange={(e) => setQuote(e.target.value)} type="number" inputMode="numeric" placeholder="0" />
        </div>
      </div>

      <Label>Contact</Label>
      <TextInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number" />

      <button
        disabled={!valid || saving}
        onClick={() => valid && onSubmit({ name: name.trim(), vendor: vendor.trim(), contact: contact.trim(), budget: Number(budget) || 0, quote: Number(quote) || 0 })}
        style={primaryBtn}
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
