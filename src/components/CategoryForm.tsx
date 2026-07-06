import { useState } from 'react'
import type { NewCategory } from '../types'
import { Label, TextInput, primaryBtn } from './ui'

interface Props {
  saving: boolean
  onSubmit: (c: NewCategory) => void
}

export default function CategoryForm({ saving, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [vendor, setVendor] = useState('')
  const [budget, setBudget] = useState('')
  const [quote, setQuote] = useState('')
  const [contact, setContact] = useState('')

  const valid = name.trim().length > 0

  return (
    <div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 600, marginBottom: 18 }}>New budget item</div>

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
        {saving ? 'Saving…' : 'Add item'}
      </button>
    </div>
  )
}
