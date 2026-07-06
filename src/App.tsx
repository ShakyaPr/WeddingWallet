import { useEffect, useMemo, useState } from 'react'
import type { AppState, NewCategory, NewPayer, NewPayment } from './types'
import type { DashLayout, Handlers, Tab } from './viewtypes'
import { derive } from './lib/compute'
import { api } from './lib/api'

import Dashboard from './screens/Dashboard'
import Budget from './screens/Budget'
import Payments from './screens/Payments'
import Vendors from './screens/Vendors'
import People from './screens/People'

import Modal from './components/Modal'
import PaymentForm from './components/PaymentForm'
import CategoryForm from './components/CategoryForm'
import PersonForm from './components/PersonForm'
import CategoryDetail from './components/CategoryDetail'

type ModalState =
  | { type: 'payment'; categoryId?: string }
  | { type: 'category' }
  | { type: 'editCategory'; categoryId: string }
  | { type: 'person' }
  | { type: 'detail'; categoryId: string }
  | null

const COUPLE = 'Piyumi & Shakya'

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dashLayout, setDashLayout] = useState<DashLayout>('cards')
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoadError(null)
    try {
      setState(await api.getState())
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const d = useMemo(() => (state ? derive(state) : null), [state])

  // ---- mutations ----------------------------------------------------------
  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setSaving(true)
    try {
      await fn()
      await load()
      setModal(null)
      after?.()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const submitPayment = (p: NewPayment) => run(() => api.addPayment(p), () => setTab('payments'))
  const addCategory = (c: NewCategory) => run(() => api.addCategory(c))
  const updateCategory = (id: string, patch: NewCategory) => run(() => api.updateCategory(id, patch))
  const addPerson = (p: NewPayer) => run(() => api.addPayer(p))

  async function deletePayment(id: string) {
    if (!confirm('Delete this payment?')) return
    await run(() => api.deletePayment(id))
  }
  async function deleteCategory(id: string) {
    if (!confirm('Delete this budget item and all its payments?')) return
    await run(() => api.deleteCategory(id))
  }

  const h: Handlers = {
    openPayment: (categoryId) => setModal({ type: 'payment', categoryId }),
    openCategory: () => setModal({ type: 'category' }),
    openEditCategory: (categoryId) => setModal({ type: 'editCategory', categoryId }),
    openPerson: () => setModal({ type: 'person' }),
    openDetail: (categoryId) => setModal({ type: 'detail', categoryId }),
    deletePayment,
    deleteCategory,
  }

  const navDefs: { k: Tab; l: string }[] = [
    { k: 'dashboard', l: 'Home' },
    { k: 'budget', l: 'Budget' },
    { k: 'payments', l: 'Log' },
    { k: 'vendors', l: 'Vendors' },
    { k: 'people', l: 'People' },
  ]
  const showFab = tab !== 'vendors' && tab !== 'people'
  const detailCat = modal?.type === 'detail' ? d?.cats.find((c) => c.id === modal.categoryId) : undefined
  const editCat = modal?.type === 'editCategory' ? state?.categories.find((c) => c.id === modal.categoryId) : undefined

  return (
    <div className="wb-frame-wrap">
      <div className="wb-frame">
        {/* Top bar */}
        <div style={{ flex: '0 0 auto', padding: '20px 22px 14px', background: '#FCFAF9', borderBottom: '1px solid #F1E7E4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1 }}>{COUPLE}</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2.4, textTransform: 'uppercase', color: '#B49398', marginTop: 6 }}>Wedding Budget</div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#C99BA4,#7E4451)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: 16, fontWeight: 600 }}>
              P<span style={{ opacity: 0.55 }}>&amp;</span>S
            </div>
          </div>
        </div>

        {/* Scroll area */}
        <div className="wb-scroll" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 18px 108px' }}>
          {!state && !loadError && <Loading />}
          {loadError && <LoadError message={loadError} onRetry={load} />}
          {state && d && (
            <>
              {tab === 'dashboard' && <Dashboard state={state} d={d} h={h} layout={dashLayout} setLayout={setDashLayout} />}
              {tab === 'budget' && <Budget state={state} d={d} h={h} />}
              {tab === 'payments' && <Payments state={state} d={d} h={h} />}
              {tab === 'vendors' && <Vendors state={state} d={d} h={h} />}
              {tab === 'people' && <People state={state} d={d} h={h} />}
            </>
          )}
        </div>

        {/* FAB */}
        {state && showFab && (
          <button
            onClick={() => h.openPayment()}
            aria-label="Record payment"
            style={{ position: 'absolute', right: 20, bottom: 90, width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#A05C6A,#7E4451)', color: '#fff', fontSize: 28, fontWeight: 300, lineHeight: 1, boxShadow: '0 12px 26px -6px rgba(126,68,81,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 3 }}
          >
            +
          </button>
        )}

        {/* Bottom nav */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, background: 'rgba(252,250,249,0.94)', backdropFilter: 'blur(12px)', borderTop: '1px solid #F1E7E4', display: 'flex', padding: '8px 6px 12px' }}>
          {navDefs.map((n) => {
            const on = tab === n.k
            return (
              <button key={n.k} onClick={() => setTab(n.k)} style={{ flex: 1, border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '4px 0' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: on ? '#A05C6A' : 'transparent' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2, color: on ? '#7E4451' : '#B4A0A3' }}>{n.l}</span>
              </button>
            )
          })}
        </div>

        {/* Modal / sheet */}
        {modal && state && (
          <Modal onClose={() => setModal(null)}>
            {modal.type === 'payment' && (
              <PaymentForm categories={state.categories} payers={state.payers} initialCategoryId={modal.categoryId} saving={saving} onSubmit={submitPayment} />
            )}
            {modal.type === 'category' && <CategoryForm saving={saving} onSubmit={addCategory} />}
            {modal.type === 'editCategory' && editCat && (
              <CategoryForm
                saving={saving}
                title="Edit budget item"
                submitLabel="Save changes"
                initial={{ name: editCat.name, vendor: editCat.vendor, budget: editCat.budget, quote: editCat.quote, contact: editCat.contact }}
                onSubmit={(c) => updateCategory(editCat.id, c)}
              />
            )}
            {modal.type === 'person' && <PersonForm saving={saving} onSubmit={addPerson} />}
            {modal.type === 'detail' && detailCat && (
              <CategoryDetail
                cat={detailCat}
                payers={state.payers}
                onAddPayment={(id) => setModal({ type: 'payment', categoryId: id })}
                onEdit={(id) => setModal({ type: 'editCategory', categoryId: id })}
                onDeletePayment={deletePayment}
                onDeleteCategory={deleteCategory}
              />
            )}
          </Modal>
        )}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 14, color: '#B49398' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #EADBD8', borderTopColor: '#A05C6A', animation: 'wbSpin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13, fontWeight: 600 }}>Loading your budget…</div>
    </div>
  )
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ marginTop: 40, background: '#fff', border: '1px solid #F1E7E4', borderRadius: 20, padding: 22, textAlign: 'center' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Couldn't load data</div>
      <div style={{ fontSize: 13, color: '#9A868A', marginBottom: 16, wordBreak: 'break-word' }}>{message}</div>
      <button onClick={onRetry} style={{ border: 'none', background: '#7E4451', color: '#fff', fontSize: 13.5, fontWeight: 700, padding: '11px 22px', borderRadius: 14 }}>
        Try again
      </button>
    </div>
  )
}
