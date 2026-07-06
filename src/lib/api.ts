import type { AppState, Category, NewCategory, NewPayer, NewPayment, Payer, Payment } from '../types'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`)
  return body as T
}

export const api = {
  getState: () => req<AppState>('/state'),

  addCategory: (c: NewCategory) =>
    req<Category>('/categories', { method: 'POST', body: JSON.stringify(c) }),
  updateCategory: (id: string, patch: Partial<NewCategory>) =>
    req<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteCategory: (id: string) =>
    req<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' }),

  addPayment: (p: NewPayment) =>
    req<Payment>('/payments', { method: 'POST', body: JSON.stringify(p) }),
  deletePayment: (id: string) =>
    req<{ ok: true }>(`/payments/${id}`, { method: 'DELETE' }),

  addPayer: (p: NewPayer) => req<Payer>('/payers', { method: 'POST', body: JSON.stringify(p) }),
}
