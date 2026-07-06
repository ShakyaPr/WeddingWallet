import type { Derived } from './lib/compute'
import type { AppState } from './types'

export type Tab = 'dashboard' | 'budget' | 'payments' | 'vendors' | 'people'
export type DashLayout = 'cards' | 'progress' | 'charts'

/** Actions the screens can trigger; implemented in App. */
export interface Handlers {
  openPayment: (categoryId?: string) => void
  openCategory: () => void
  openPerson: () => void
  openDetail: (categoryId: string) => void
  deletePayment: (id: string) => void
  deleteCategory: (id: string) => void
}

export interface ScreenProps {
  state: AppState
  d: Derived
  h: Handlers
}
