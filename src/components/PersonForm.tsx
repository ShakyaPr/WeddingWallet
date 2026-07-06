import { useState } from 'react'
import type { NewPayer } from '../types'
import { Label, TextInput, primaryBtn } from './ui'
import { PALETTE, TINTS } from '../lib/format'

interface Props {
  saving: boolean
  onSubmit: (p: NewPayer) => void
}

export default function PersonForm({ saving, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [colorIdx, setColorIdx] = useState(0)

  const valid = name.trim().length > 0

  return (
    <div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 600, marginBottom: 18 }}>Add a person</div>

      <Label>Full name / email</Label>
      <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amma, or an email" />

      <Label>Short label</Label>
      <TextInput value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. Amma" />

      <Label>Colour</Label>
      <div style={{ display: 'flex', gap: 10, margin: '8px 0 18px' }}>
        {PALETTE.map((c, i) => (
          <button
            key={c}
            onClick={() => setColorIdx(i)}
            aria-label={`colour ${i + 1}`}
            style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: colorIdx === i ? '3px solid #3A2C2E' : '3px solid transparent' }}
          />
        ))}
      </div>

      <button
        disabled={!valid || saving}
        onClick={() =>
          valid &&
          onSubmit({
            name: name.trim(),
            short_name: shortName.trim() || name.trim().split(/[@\s]/)[0],
            color: PALETTE[colorIdx],
            tint: TINTS[colorIdx],
          })
        }
        style={primaryBtn}
      >
        {saving ? 'Saving…' : 'Add person'}
      </button>
    </div>
  )
}
