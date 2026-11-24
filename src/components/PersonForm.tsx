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

  function submit() {
    if (valid && !saving)
      onSubmit({
        name: name.trim(),
        short_name: shortName.trim() || name.trim().split(/[@\s]/)[0],
        color: PALETTE[colorIdx],
        tint: TINTS[colorIdx],
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
        Add a person
      </h2>
      <p className="sheet-subtitle">Your celebration is even better together.</p>

      <Label htmlFor="personform-full-name-email">Full name / email</Label>
      <TextInput
        id="personform-full-name-email"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Amma, or an email"
      />

      <Label htmlFor="personform-short-label">Short label</Label>
      <TextInput
        id="personform-short-label"
        value={shortName}
        onChange={(e) => setShortName(e.target.value)}
        placeholder="e.g. Amma"
      />

      <div
        id="person-colour-label"
        style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}
      >
        Colour
      </div>
      <div
        role="group"
        aria-labelledby="person-colour-label"
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 18px' }}
      >
        {PALETTE.map((c, i) => (
          <button
            type="button"
            key={c}
            onClick={() => setColorIdx(i)}
            aria-label={['Rose', 'Wine', 'Gold', 'Sage', 'Slate', 'Mauve'][i]}
            aria-pressed={colorIdx === i}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: c,
              border: colorIdx === i ? '3px solid #3A2C2E' : '3px solid transparent',
            }}
          />
        ))}
      </div>

      <button disabled={!valid || saving} type="submit" style={primaryBtn}>
        {saving ? 'Saving…' : 'Add person'}
      </button>
    </form>
  )
}
