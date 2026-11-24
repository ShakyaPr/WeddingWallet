import type {
  ActivityEntry,
  DeleteResult,
  HistoryPage,
  AppState,
  Category,
  Me,
  NewCategory,
  NewPayer,
  NewPayment,
  Payer,
  Payment,
} from '../types'

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
  history: (before?: string) =>
    req<HistoryPage>(
      '/history?limit=100' + (before ? '&before=' + encodeURIComponent(before) : '')
    ),
  restore: (activityId: string) =>
    req<{ ok: true }>(`/history/${activityId}/restore`, { method: 'POST', body: '{}' }),
  me: () => req<Me>('/me'),
  getState: () => req<AppState>('/state'),

  addCategory: (c: NewCategory) =>
    req<Category>('/categories', { method: 'POST', body: JSON.stringify(c) }),
  updateCategory: (id: string, patch: Partial<NewCategory>) =>
    req<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteCategory: (id: string) => req<DeleteResult>(`/categories/${id}`, { method: 'DELETE' }),

  addPayment: (p: NewPayment) =>
    req<Payment>('/payments', { method: 'POST', body: JSON.stringify(p) }),
  updatePayment: (id: string, patch: Partial<NewPayment>) =>
    req<Payment>(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deletePayment: (id: string) => req<DeleteResult>(`/payments/${id}`, { method: 'DELETE' }),

  addPayer: (p: NewPayer) => req<Payer>('/payers', { method: 'POST', body: JSON.stringify(p) }),
}

export async function allHistory(): Promise<ActivityEntry[]> {
  const entries: ActivityEntry[] = []
  let before: string | undefined
  do {
    const page = await api.history(before)
    entries.push(...page.entries)
    before = page.nextCursor || undefined
  } while (before)
  return entries
}
