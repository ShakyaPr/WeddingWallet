// Shared data shapes. These mirror the Supabase tables (see supabase/schema.sql).

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

export interface AppState {
  categories: Category[]
  payments: Payment[]
  payers: Payer[]
}

// Payloads for creating rows (server assigns id / defaults).
export type NewCategory = Omit<Category, 'id' | 'sort_order'> & { sort_order?: number }
export type NewPayment = Omit<Payment, 'id'>
export type NewPayer = Omit<Payer, 'id'>
