import type { CSSProperties, ReactNode } from 'react'

export const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#B49398',
}

const inputStyle: CSSProperties = {
  width: '100%',
  margin: '6px 0 15px',
  padding: '12px 13px',
  borderRadius: 13,
  border: '1px solid #EADBD8',
  background: '#fff',
  fontSize: 14,
  color: '#3A2C2E',
}

export function Label({ children }: { children: ReactNode }) {
  return <label style={labelStyle}>{children}</label>
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>
export function TextInput(props: InputProps) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
export function Select({ children, ...props }: SelectProps) {
  return (
    <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>
      {children}
    </select>
  )
}

export const primaryBtn: CSSProperties = {
  width: '100%',
  marginTop: 8,
  border: 'none',
  background: 'linear-gradient(135deg,#A05C6A,#7E4451)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  padding: 15,
  borderRadius: 15,
}

export const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #F1E7E4',
  borderRadius: 20,
  boxShadow: '0 8px 20px rgba(58,44,46,0.05)',
}

export const screenTitle: CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 22,
  fontWeight: 600,
}
