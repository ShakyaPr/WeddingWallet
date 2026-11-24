import type { AppState, Category, Me, NewCategory, NewPayer, NewPayment, Payer, Payment } from '../types'

/** Send the browser to Keycloak, coming back to the current screen afterwards. */
export function goToLogin() {
  const here = window.location.pathname + window.location.search
  window.location.assign('/auth/login?returnTo=' + encodeURIComponent(here))
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...init,
  })
  const text = await res.text()
  let body: { error?: string; login?: boolean } | null = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // Not JSON, e.g. a proxy error page.
  }
  if (res.status === 401 && body?.login) {
    // Session ended (signed out, expired, or user disabled in Keycloak).
    goToLogin()
    return new Promise<T>(() => {}) // the page is navigating away
  }
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`)
  return body as T
}

export const api = {
  me: () => req<Me>('/me'),
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
