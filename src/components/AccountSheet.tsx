import type { Me } from '../types'
import DataActions from './DataActions'
import { primaryBtn } from './ui'

/** Up to two initials from a name ("Piyumi Home" → "PH"), falling back to the username/email. */
export function initialsOf(me: Me): string {
  const source = me.name || me.username || me.email || '?'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function AccountSheet({
  me,
  onExport,
  onHistory,
}: {
  me: Me
  onExport: () => void
  onHistory: () => void
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 64,
          height: 64,
          margin: '4px auto 14px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#C99BA4,#7E4451)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Playfair Display', serif",
          color: '#fff',
          fontSize: 24,
          fontWeight: 600,
        }}
      >
        {initialsOf(me)}
      </div>
      <h2 id="sheet-title" className="sheet-title">
        {me.name || me.username}
      </h2>
      {me.email && (
        <div style={{ fontSize: 13.5, color: '#9A868A', marginTop: 4, wordBreak: 'break-all' }}>
          {me.email}
        </div>
      )}
      {me.username && me.username !== me.email && (
        <div style={{ fontSize: 12, color: '#B49398', marginTop: 4 }}>@{me.username}</div>
      )}

      <DataActions onExport={onExport} onHistory={onHistory} />
      {me.authEnabled ? (
        // A real form POST: the server clears the session and also signs you
        // out of Keycloak, then Keycloak redirects back to the login page.
        <form method="post" action="/auth/logout" style={{ marginTop: 22 }}>
          <button type="submit" style={primaryBtn}>
            Sign out
          </button>
        </form>
      ) : (
        <div style={{ marginTop: 22, fontSize: 12.5, color: '#B49398' }}>
          Login is disabled (local development).
        </div>
      )}
    </div>
  )
}
