import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, Me, NewCategory, NewPayer, NewPayment } from './types'
import type { DashLayout, Handlers, Tab } from './viewtypes'
import { derive } from './lib/compute'
import { api } from './lib/api'

import Icon, { type IconName } from './components/Icon'

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
import ExportSheet from './components/ExportSheet'
import HistorySheet from './components/HistorySheet'
import AccountSheet, { initialsOf } from './components/AccountSheet'

type ModalState =
  | { type: 'payment'; categoryId?: string }
  | { type: 'editPayment'; paymentId: string; returnCategoryId?: string }
  | { type: 'exports' }
  | { type: 'history' }
  | { type: 'category' }
  | { type: 'editCategory'; categoryId: string }
  | { type: 'person' }
  | { type: 'detail'; categoryId: string }
  | { type: 'account' }
  | null

const COUPLE = 'Piyumi & Shakya'

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dashLayout, setDashLayout] = useState<DashLayout>('cards')
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)
  const [budgetFilter, setBudgetFilter] = useState('All items')
  const [toast, setToast] = useState<{ message: string; activityId?: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  function dismissToast() {
    clearTimeout(toastTimer.current)
    setToast(null)
  }
  function showToast(message: string, activityId?: string) {
    clearTimeout(toastTimer.current)
    setToast({ message, activityId })
    toastTimer.current = setTimeout(() => setToast(null), 15000)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  function reviewQuotes() {
    setBudgetFilter('Awaiting quote')
    setTab('budget')
  }
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [tab])

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
    api.me().then(setMe, () => {})
  }, [])

  const d = useMemo(() => (state ? derive(state) : null), [state])

  // ---- mutations ----------------------------------------------------------
  async function run<T>(fn: () => Promise<T>, after?: (result: T) => void) {
    setSaving(true)
    try {
      const result = await fn()
      await load()
      setModal(null)
      after?.(result)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const submitPayment = (p: NewPayment) =>
    run(
      () => api.addPayment(p),
      () => setTab('payments')
    )
  const updatePayment = (id: string, p: NewPayment) =>
    run(
      () => api.updatePayment(id, p),
      () => {
        if (modal?.type === 'editPayment' && modal.returnCategoryId)
          setModal({ type: 'detail', categoryId: modal.returnCategoryId })
        showToast('Payment updated. Changes saved in history.')
      }
    )
  const addCategory = (c: NewCategory) => run(() => api.addCategory(c))
  const updateCategory = (id: string, patch: NewCategory) =>
    run(() => api.updateCategory(id, patch))
  const addPerson = (p: NewPayer) => run(() => api.addPayer(p))

  async function deletePayment(id: string) {
    if (!confirm('Delete this payment?')) return
    await run(
      () => api.deletePayment(id),
      (result) => showToast('Payment deleted.', result.activity_id)
    )
  }
  async function deleteCategory(id: string) {
    if (!confirm('Delete this budget item and all its payments?')) return
    await run(
      () => api.deleteCategory(id),
      (result) => showToast('Budget item and its payments deleted.', result.activity_id)
    )
  }

  const h: Handlers = {
    openPayment: (categoryId) => setModal({ type: 'payment', categoryId }),
    openEditPayment: (paymentId) =>
      setModal({
        type: 'editPayment',
        paymentId,
        returnCategoryId: modal?.type === 'detail' ? modal.categoryId : undefined,
      }),
    openExports: () => setModal({ type: 'exports' }),
    openHistory: () => setModal({ type: 'history' }),
    openCategory: () => setModal({ type: 'category' }),
    openEditCategory: (categoryId) => setModal({ type: 'editCategory', categoryId }),
    openPerson: () => setModal({ type: 'person' }),
    openDetail: (categoryId) => setModal({ type: 'detail', categoryId }),
    deletePayment,
    deleteCategory,
  }

  async function undoDelete() {
    if (!toast?.activityId) return
    clearTimeout(toastTimer.current)
    await run(
      () => api.restore(toast.activityId!),
      () => showToast('Restored successfully.')
    )
  }

  const editedPayment =
    modal?.type === 'editPayment'
      ? state?.payments.find((p) => p.id === modal.paymentId)
      : undefined

  const navDefs: { k: Tab; l: string; icon: IconName }[] = [
    { k: 'dashboard', l: 'Home', icon: 'home' },
    { k: 'budget', l: 'Budget', icon: 'budget' },
    { k: 'payments', l: 'Payments', icon: 'payments' },
    { k: 'vendors', l: 'Vendors', icon: 'vendors' },
    { k: 'people', l: 'People', icon: 'people' },
  ]
  const showFab = tab !== 'vendors' && tab !== 'people'
  const detailCat =
    modal?.type === 'detail' ? d?.cats.find((c) => c.id === modal.categoryId) : undefined
  const editCat =
    modal?.type === 'editCategory'
      ? state?.categories.find((c) => c.id === modal.categoryId)
      : undefined

  return (
    <div className="wb-frame-wrap">
      <div className="wb-frame">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <div>
              <div className="brand-name">
                WeddingWallet<span>·</span>
              </div>
              <div className="couple-name">{COUPLE}</div>
            </div>
          </div>
          <button
            className="account-button"
            onClick={() => me && setModal({ type: 'account' })}
            disabled={!me}
            aria-label={me ? `Account: ${me.name || me.username}` : 'Account'}
          >
            {me ? initialsOf(me) : 'P&S'}
          </button>
        </header>

        <main
          ref={scrollRef}
          className={`wb-scroll ${showFab ? 'with-fab' : ''}`}
          id="main-content"
          tabIndex={-1}
        >
          {!state && !loadError && <Loading />}
          {loadError && <LoadError message={loadError} onRetry={load} />}
          {state && d && (
            <>
              {tab === 'dashboard' && (
                <Dashboard
                  state={state}
                  d={d}
                  h={h}
                  layout={dashLayout}
                  setLayout={setDashLayout}
                  onNavigate={setTab}
                  onReviewQuotes={reviewQuotes}
                />
              )}
              {tab === 'budget' && (
                <Budget state={state} d={d} h={h} initialFilter={budgetFilter} />
              )}
              {tab === 'payments' && <Payments state={state} d={d} h={h} />}
              {tab === 'vendors' && <Vendors state={state} d={d} h={h} />}
              {tab === 'people' && <People state={state} d={d} h={h} />}
            </>
          )}
        </main>

        {state && showFab && (
          <button
            className="payment-fab"
            onClick={() => h.openPayment()}
            aria-label="Record payment"
          >
            <Icon name="plus" size={21} />
            <span>Record payment</span>
          </button>
        )}

        <nav className="bottom-nav" aria-label="Main navigation">
          {navDefs.map((n) => (
            <button
              key={n.k}
              onClick={() => {
                if (n.k === 'budget') setBudgetFilter('All items')
                setTab(n.k)
              }}
              className={`nav-item ${tab === n.k ? 'active' : ''}`}
              aria-current={tab === n.k ? 'page' : undefined}
            >
              <span className="nav-icon">
                <Icon name={n.icon} size={21} />
              </span>
              <span>{n.l}</span>
            </button>
          ))}
        </nav>

        {toast && (
          <div
            className="undo-toast"
            onMouseEnter={() => clearTimeout(toastTimer.current)}
            onFocusCapture={() => clearTimeout(toastTimer.current)}
          >
            <p role="status">{toast.message}</p>
            {toast.activityId && (
              <button disabled={saving} onClick={undoDelete}>
                {saving ? 'Restoring…' : 'Undo'}
              </button>
            )}
            <button
              className="toast-dismiss"
              onClick={dismissToast}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        {/* Modal / sheet */}
        {modal?.type === 'account' && me && (
          <Modal key={modal.type} onClose={() => setModal(null)}>
            <AccountSheet me={me} onExport={h.openExports} onHistory={h.openHistory} />
          </Modal>
        )}
        {modal && modal.type !== 'account' && state && (
          <Modal key={modal.type} onClose={() => setModal(null)}>
            {modal.type === 'exports' && d && <ExportSheet state={state} d={d} />}
            {modal.type === 'history' && <HistorySheet state={state} />}
            {modal.type === 'editPayment' && editedPayment && (
              <PaymentForm
                key={editedPayment.id}
                categories={state.categories}
                payers={state.payers}
                initial={editedPayment}
                saving={saving}
                onSubmit={(p) => updatePayment(editedPayment.id, p)}
              />
            )}
            {modal.type === 'payment' && (
              <PaymentForm
                categories={state.categories}
                payers={state.payers}
                initialCategoryId={modal.categoryId}
                saving={saving}
                onSubmit={submitPayment}
              />
            )}
            {modal.type === 'category' && <CategoryForm saving={saving} onSubmit={addCategory} />}
            {modal.type === 'editCategory' && editCat && (
              <CategoryForm
                saving={saving}
                title="Edit budget item"
                submitLabel="Save changes"
                initial={{
                  name: editCat.name,
                  vendor: editCat.vendor,
                  budget: editCat.budget,
                  quote: editCat.quote,
                  contact: editCat.contact,
                }}
                onSubmit={(c) => updateCategory(editCat.id, c)}
              />
            )}
            {modal.type === 'person' && <PersonForm saving={saving} onSubmit={addPerson} />}
            {modal.type === 'detail' && detailCat && (
              <CategoryDetail
                cat={detailCat}
                payers={state.payers}
                onAddPayment={(id) => setModal({ type: 'payment', categoryId: id })}
                onEditPayment={h.openEditPayment}
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60%',
        gap: 14,
        color: '#B49398',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '3px solid #EADBD8',
          borderTopColor: '#A05C6A',
          animation: 'wbSpin 0.8s linear infinite',
        }}
      />
      <div style={{ fontSize: 13, fontWeight: 600 }}>Loading your budget…</div>
    </div>
  )
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        marginTop: 40,
        background: '#fff',
        border: '1px solid #F1E7E4',
        borderRadius: 20,
        padding: 22,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Couldn't load data
      </div>
      <div style={{ fontSize: 13, color: '#9A868A', marginBottom: 16, wordBreak: 'break-word' }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{
          border: 'none',
          background: '#7E4451',
          color: '#fff',
          fontSize: 13.5,
          fontWeight: 700,
          padding: '11px 22px',
          borderRadius: 14,
        }}
      >
        Try again
      </button>
    </div>
  )
}
