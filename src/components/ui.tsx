import type { CSSProperties, ReactNode } from 'react'
import Icon, { type IconName } from './Icon'

export const labelStyle: CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)' }
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={labelStyle}>
      {children}
    </label>
  )
}
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className || ''}`} />
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`field ${props.className || ''}`}>
      {children}
    </select>
  )
}
export const primaryBtn: CSSProperties = {
  width: '100%',
  marginTop: 12,
  border: 'none',
  background: 'var(--wine)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  padding: 16,
  borderRadius: 14,
  minHeight: 50,
}
export const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 20,
}
export const screenTitle: CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: 29,
  fontWeight: 500,
  letterSpacing: '-0.8px',
}
export function ScreenHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="screen-heading">
      <p className="eyebrow">{eyebrow}</p>
      <div className="heading-row">
        <h1>{title}</h1>
        {action}
      </div>
      <p className="screen-description">{description}</p>
    </header>
  )
}
export function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="small-primary" onClick={onClick}>
      <Icon name="plus" size={16} />
      {children}
    </button>
  )
}
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="search-field">
      <Icon name="search" size={19} />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
export function EmptyState({
  icon = 'heart',
  title,
  description,
  action,
}: {
  icon?: IconName
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function ProgressBar({
  value,
  color = 'var(--rose)',
  label,
}: {
  value: number
  color?: string
  label: string
}) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.max(0, Math.min(100, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  )
}
