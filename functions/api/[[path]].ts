import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/cloudflare-pages'
import { getSupabase, type Env } from '../_lib/supabase'
import { verifyAccess } from '../_lib/access'

const app = new Hono<{ Bindings: Env }>().basePath('/api')

// Same-origin in production; cors kept permissive for local `wrangler pages dev`.
app.use('*', cors())

// Optional Access JWT verification (no-op unless CF_ACCESS_* env vars are set).
app.use('*', async (c, next) => {
  try {
    await verifyAccess(c.req.raw, c.env)
  } catch (err) {
    return c.json({ error: 'Unauthorized: ' + (err as Error).message }, 401)
  }
  await next()
})

const num = (v: unknown, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const str = (v: unknown, fallback = '') =>
  typeof v === 'string' ? v : v == null ? fallback : String(v)

// ---- Read everything in one shot (SPA hydration) --------------------------
app.get('/state', async (c) => {
  const db = getSupabase(c.env)
  const [categories, payments, payers] = await Promise.all([
    db.from('categories').select('*').order('sort_order', { ascending: true }),
    db.from('payments').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
    db.from('payers').select('*').order('created_at', { ascending: true }),
  ])
  const err = categories.error || payments.error || payers.error
  if (err) return c.json({ error: err.message }, 500)
  return c.json({
    categories: categories.data ?? [],
    payments: payments.data ?? [],
    payers: payers.data ?? [],
  })
})

// ---- Categories -----------------------------------------------------------
app.post('/categories', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (!str(b.name).trim()) return c.json({ error: 'name is required' }, 400)
  const db = getSupabase(c.env)
  const { data, error } = await db
    .from('categories')
    .insert({
      name: str(b.name).trim(),
      vendor: str(b.vendor).trim() || 'To be decided',
      contact: str(b.contact).trim(),
      budget: num(b.budget),
      quote: num(b.quote),
      sort_order: num(b.sort_order, 999),
    })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

app.patch('/categories/:id', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (b.name !== undefined) patch.name = str(b.name).trim()
  if (b.vendor !== undefined) patch.vendor = str(b.vendor).trim() || 'To be decided'
  if (b.contact !== undefined) patch.contact = str(b.contact).trim()
  if (b.budget !== undefined) patch.budget = num(b.budget)
  if (b.quote !== undefined) patch.quote = num(b.quote)
  if (b.sort_order !== undefined) patch.sort_order = num(b.sort_order)
  const db = getSupabase(c.env)
  const { data, error } = await db
    .from('categories')
    .update(patch)
    .eq('id', c.req.param('id'))
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

app.delete('/categories/:id', async (c) => {
  const db = getSupabase(c.env)
  const { error } = await db.from('categories').delete().eq('id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ---- Payments -------------------------------------------------------------
app.post('/payments', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (!str(b.category_id).trim()) return c.json({ error: 'category_id is required' }, 400)
  if (num(b.amount) <= 0) return c.json({ error: 'amount must be greater than 0' }, 400)
  if (!str(b.paid_by).trim()) return c.json({ error: 'paid_by is required' }, 400)
  const db = getSupabase(c.env)
  const { data, error } = await db
    .from('payments')
    .insert({
      category_id: str(b.category_id),
      date: str(b.date) || new Date().toISOString().slice(0, 10),
      item: str(b.item).trim() || 'Payment',
      paid_by: str(b.paid_by).trim(),
      amount: num(b.amount),
    })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

app.delete('/payments/:id', async (c) => {
  const db = getSupabase(c.env)
  const { error } = await db.from('payments').delete().eq('id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ---- Payers ---------------------------------------------------------------
app.post('/payers', async (c) => {
  const b = await c.req.json().catch(() => ({}))
  const name = str(b.name).trim()
  if (!name) return c.json({ error: 'name is required' }, 400)
  const db = getSupabase(c.env)
  const { data, error } = await db
    .from('payers')
    .insert({
      name,
      short_name: str(b.short_name).trim() || name.split(/[@\s]/)[0] || 'Other',
      color: str(b.color).trim() || '#8FA1B3',
      tint: str(b.tint).trim() || '#EEF1F4',
    })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

app.all('*', (c) => c.json({ error: 'Not found' }, 404))

export const onRequest = handle(app)
