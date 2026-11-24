// Shared data shapes. These mirror the Postgres tables (see db/schema.sql).

export interface Payer {
  id: string
  name: string
  short_name: string
  color: string
  tint: string
}

export interface Category {
  id: string
  name: string
  vendor: string
  contact: string
  budget: number
  quote: number
  sort_order: number
}

export interface Payment {
  id: string
  category_id: string
  date: string // YYYY-MM-DD
  item: string
  paid_by: string
  amount: number
}

/** The signed-in Keycloak user (GET /api/me). */
export interface Me {
  sub: string
  username: string
  email: string
  name: string
  /** false only in local development with AUTH_DISABLED=true */
  authEnabled: boolean
}

export interface AppState {
  categories: Category[]
  payments: Payment[]
  payers: Payer[]
}

// Payloads for creating rows (server assigns id / defaults).
export type NewCategory = Omit<Category, 'id' | 'sort_order'> & { sort_order?: number }
export type NewPayment = Omit<Payment, 'id'>
export type NewPayer = Omit<Payer, 'id'>
