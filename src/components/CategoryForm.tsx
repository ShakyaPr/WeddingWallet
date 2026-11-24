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

export default function CategoryForm({
  saving,
  onSubmit,
  initial,
  title = 'New budget item',
  submitLabel = 'Add item',
}: Props) {
  // "To be decided" is a placeholder vendor — show it as empty so it's editable.
  const initialVendor = initial?.vendor && initial.vendor !== 'To be decided' ? initial.vendor : ''
  const [name, setName] = useState(initial?.name ?? '')
  const [vendor, setVendor] = useState(initialVendor)
  const [budget, setBudget] = useState(initial?.budget ? String(initial.budget) : '')
  const [quote, setQuote] = useState(initial?.quote ? String(initial.quote) : '')
  const [contact, setContact] = useState(initial?.contact ?? '')

  const valid =
    name.trim().length > 0 &&
    Number.isFinite(Number(budget)) &&
    Number(budget) >= 0 &&
    Number.isFinite(Number(quote)) &&
    Number(quote) >= 0

  function submit() {
    if (valid && !saving)
      onSubmit({
        name: name.trim(),
        vendor: vendor.trim(),
        contact: contact.trim(),
        budget: Number(budget) || 0,
        quote: Number(quote) || 0,
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
        {title}
      </h2>
      <p className="sheet-subtitle">A place for every detail of your celebration.</p>

      <Label htmlFor="categoryform-item-name">Item name</Label>
      <TextInput
        id="categoryform-item-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Photography"
      />

      <Label htmlFor="categoryform-vendor">Vendor</Label>
      <TextInput
        id="categoryform-vendor"
        value={vendor}
        onChange={(e) => setVendor(e.target.value)}
        placeholder="Vendor name"
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Label htmlFor="categoryform-budget-rs">Budget (Rs)</Label>
          <TextInput
            id="categoryform-budget-rs"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Label htmlFor="categoryform-quoted-rs">Quoted (Rs)</Label>
          <TextInput
            id="categoryform-quoted-rs"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Not quoted yet"
          />
        </div>
      </div>
      <p className="quote-form-hint">
        Leave the quote blank until a vendor confirms their price. Unquoted items use your planned
        budget in the provisional estimate.
      </p>

      <Label htmlFor="categoryform-contact">Contact</Label>
      <TextInput
        id="categoryform-contact"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        type="tel"
        placeholder="Phone number"
      />

      <button disabled={!valid || saving} type="submit" style={primaryBtn}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
