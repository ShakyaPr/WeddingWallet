import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { csrf } from 'hono/csrf'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Pool } from './db.js'
import { transaction, recordChange, type Snapshot } from './changes.js'
import { verifyAccess, type AccessConfig } from './access.js'
import { DEV_USER, type Auth, type AuthEnv } from './auth.js'

export interface AppConfig {
  /** Directory holding the built SPA (`vite build` output). */
  staticRoot: string
  access: AccessConfig
  /** Keycloak login. `null` only when AUTH_DISABLED=true (local development). */
  auth: Auth | null
  /** Public URL of the app (APP_URL); used for the CSRF origin check. */
  appUrl?: URL
}

const num = (v: unknown, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const str = (v: unknown, fallback = '') =>
  typeof v === 'string' ? v : v == null ? fallback : String(v)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Postgres error codes for bad input / constraint violations → client errors. */
function statusFor(err: unknown): 400 | 409 | 500 {
  const code = (err as { code?: unknown })?.code
  if (code === '23505') return 409 // unique_violation (e.g. duplicate payer name)
  if (typeof code === 'string' && (code.startsWith('22') || code.startsWith('23'))) return 400
  return 500
}

function onError(err: Error, c: Context) {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  const status = statusFor(err)
  if (status === 500) console.error('API error:', err)
  // Return errors as JSON so the frontend can show a real message.
  return c.json({ error: err.message || 'Internal error' }, status)
}

function fail(status: 400 | 404 | 409, message: string): never {
  throw new HTTPException(status, { message })
}

async function readBody(c: Context): Promise<Record<string, unknown>> {
  const body: unknown = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body))
    fail(400, 'A JSON object is required')
  return body as Record<string, unknown>
}

function money(value: unknown, field: string, positive = false): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '')
    fail(400, `${field} must be a number`)
  const n = Number(value)
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    (positive && n === 0) ||
    n >= 1e12 ||
    Math.abs(n * 100 - Math.round(n * 100)) > 0.001
  )
    fail(
      400,
      `${field} must be ${positive ? 'positive' : 'nonnegative'}, with at most two decimal places`
    )
  return n
}

function paymentValues(b: Record<string, unknown>, partial: boolean): Snapshot {
  const patch: Snapshot = {}
  if (!partial || b.category_id !== undefined) {
    if (!UUID_RE.test(str(b.category_id).trim())) fail(400, 'A valid category_id is required')
    patch.category_id = str(b.category_id).trim()
  }
  if (!partial || b.amount !== undefined) patch.amount = money(b.amount, 'amount', true)
  if (!partial || b.paid_by !== undefined) {
    if (!str(b.paid_by).trim()) fail(400, 'paid_by is required')
    patch.paid_by = str(b.paid_by).trim()
  }
  if (!partial || b.item !== undefined) patch.item = str(b.item).trim() || 'Payment'
  if (!partial || b.date !== undefined) {
    const date = str(b.date)
    const parsed = new Date(`${date}T00:00:00Z`)
    if (
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ||
      date.startsWith('0000') ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    )
      fail(400, 'A valid date (YYYY-MM-DD) is required')
    patch.date = date
  }
  return patch
}

function createApi(pool: Pool, cfg: AppConfig) {
  const api = new Hono<AuthEnv>()
  api.onError(onError)

  // Health check for Dokploy / Docker Swarm. Registered before the Access
  // check because the probe runs inside the container without a login.
  api.get('/health', async (c) => {
    try {
      await pool.query('select 1')
      return c.json({ ok: true, db: 'up' })
    } catch (err) {
      return c.json({ ok: false, db: 'down', error: (err as Error).message }, 503)
    }
  })

  // Optional Cloudflare Access JWT verification (no-op unless CF_ACCESS_* are set).
  api.use('*', async (c, next) => {
    try {
      await verifyAccess(c.req.raw, cfg.access)
    } catch (err) {
      return c.json({ error: 'Unauthorized: ' + (err as Error).message }, 401)
    }
    await next()
  })

  // Block cross-site form posts (the session is a cookie). The SPA sends JSON,
  // which browsers can't send cross-site without CORS, so it is unaffected.
  api.use('*', csrf(cfg.appUrl ? { origin: cfg.appUrl.origin } : undefined))

  // Every route below requires a signed-in Keycloak user.
  if (cfg.auth) {
    api.use('*', cfg.auth.requireApiUser())
  } else {
    api.use('*', async (c, next) => {
      c.set('user', DEV_USER)
      await next()
    })
  }

  // Who am I? (name / email shown in the app, plus whether logout is available)
  api.get('/me', (c) => c.json({ ...c.get('user'), authEnabled: Boolean(cfg.auth) }))

  // Reject malformed ids up front instead of letting Postgres throw.
  api.use('/:table/:id', async (c, next) => {
    const id = c.req.param('id')
    if (c.req.param('table') === 'history' ? !/^[1-9][0-9]{0,18}$/.test(id) : !UUID_RE.test(id))
      return c.json({ error: 'Not found' }, 404)
    await next()
  })

  // ---- Read everything in one shot (SPA hydration) ------------------------
  api.get('/state', async (c) => {
    const [categories, payments, payers] = await Promise.all([
      pool.query('select * from categories order by sort_order asc, created_at asc'),
      pool.query('select * from payments order by date desc, created_at desc'),
      pool.query('select * from payers order by created_at asc'),
    ])
    return c.json({
      categories: categories.rows,
      payments: payments.rows,
      payers: payers.rows,
    })
  })

  // ---- Categories ---------------------------------------------------------
  api.post('/categories', async (c) => {
    const b = await readBody(c)
    if (!str(b.name).trim()) fail(400, 'name is required')
    const budget = money(b.budget ?? 0, 'budget')
    const quote = money(b.quote ?? 0, 'quote')
    const row = await transaction(pool, async (client) => {
      const { rows } = await client.query(
        `insert into categories (name, vendor, contact, budget, quote, sort_order)
         values ($1,$2,$3,$4,$5,$6) returning *`,
        [
          str(b.name).trim(),
          str(b.vendor).trim() || 'To be decided',
          str(b.contact).trim(),
          budget,
          quote,
          num(b.sort_order, 999),
        ]
      )
      await recordChange(client, c.get('user'), 'category', 'created', null, rows[0])
      return rows[0]
    })
    return c.json(row, 201)
  })

  api.patch('/categories/:id', async (c) => {
    const b = await readBody(c)
    const patch: Snapshot = {}
    if (b.name !== undefined) {
      patch.name = str(b.name).trim()
      if (!patch.name) fail(400, 'name is required')
    }
    if (b.vendor !== undefined) patch.vendor = str(b.vendor).trim() || 'To be decided'
    if (b.contact !== undefined) patch.contact = str(b.contact).trim()
    if (b.budget !== undefined) patch.budget = money(b.budget, 'budget')
    if (b.quote !== undefined) patch.quote = money(b.quote, 'quote')
    if (b.sort_order !== undefined) patch.sort_order = num(b.sort_order)
    const cols = Object.keys(patch)
    if (!cols.length) fail(400, 'nothing to update')
    const row = await transaction(pool, async (client) => {
      const { rows: before } = await client.query(
        'select * from categories where id=$1 for update',
        [c.req.param('id')]
      )
      if (!before[0]) fail(404, 'Budget item not found')
      const sets = cols.map((col, i) => `${col}=$${i + 2}`).join(', ')
      const { rows } = await client.query(`update categories set ${sets} where id=$1 returning *`, [
        c.req.param('id'),
        ...Object.values(patch),
      ])
      await recordChange(client, c.get('user'), 'category', 'updated', before[0], rows[0])
      return rows[0]
    })
    return c.json(row)
  })

  api.delete('/categories/:id', async (c) => {
    const activityId = await transaction(pool, async (client) => {
      const { rows } = await client.query('select * from categories where id=$1 for update', [
        c.req.param('id'),
      ])
      if (!rows[0]) fail(404, 'Budget item not found')
      const { rows: payments } = await client.query(
        'select * from payments where category_id=$1 for update',
        [c.req.param('id')]
      )
      const deletedPayments: Snapshot[] = []
      for (const payment of payments) {
        const deletionId = await recordChange(
          client,
          c.get('user'),
          'payment',
          'deleted',
          payment,
          null
        )
        deletedPayments.push({ ...payment, _deletion_activity_id: deletionId })
      }
      await client.query('delete from categories where id=$1', [c.req.param('id')])
      return recordChange(
        client,
        c.get('user'),
        'category',
        'deleted',
        { ...rows[0], _payments: deletedPayments },
        null
      )
    })
    return c.json({ ok: true, activity_id: activityId })
  })

  // ---- Payments -----------------------------------------------------------
  api.post('/payments', async (c) => {
    const b = await readBody(c)
    const patch = paymentValues(
      { ...b, date: b.date ?? new Date().toISOString().slice(0, 10), item: b.item ?? 'Payment' },
      false
    )
    const row = await transaction(pool, async (client) => {
      const { rows } = await client.query(
        'insert into payments (category_id,date,item,paid_by,amount) values ($1,$2,$3,$4,$5) returning *',
        [patch.category_id, patch.date, patch.item, patch.paid_by, patch.amount]
      )
      await recordChange(client, c.get('user'), 'payment', 'created', null, rows[0])
      return rows[0]
    })
    return c.json(row, 201)
  })

  api.patch('/payments/:id', async (c) => {
    const patch = paymentValues(await readBody(c), true)
    const cols = Object.keys(patch)
    if (!cols.length) fail(400, 'nothing to update')
    const row = await transaction(pool, async (client) => {
      const { rows: before } = await client.query('select * from payments where id=$1 for update', [
        c.req.param('id'),
      ])
      if (!before[0]) fail(404, 'Payment not found')
      const sets = cols.map((col, i) => `${col}=$${i + 2}`).join(', ')
      const { rows } = await client.query(`update payments set ${sets} where id=$1 returning *`, [
        c.req.param('id'),
        ...Object.values(patch),
      ])
      await recordChange(client, c.get('user'), 'payment', 'updated', before[0], rows[0])
      return rows[0]
    })
    return c.json(row)
  })

  api.delete('/payments/:id', async (c) => {
    const activityId = await transaction(pool, async (client) => {
      const { rows } = await client.query('delete from payments where id=$1 returning *', [
        c.req.param('id'),
      ])
      if (!rows[0]) fail(404, 'Payment not found')
      return recordChange(client, c.get('user'), 'payment', 'deleted', rows[0], null)
    })
    return c.json({ ok: true, activity_id: activityId })
  })

  // ---- Payers -------------------------------------------------------------
  api.post('/payers', async (c) => {
    const b = await readBody(c)
    const name = str(b.name).trim()
    if (!name) fail(400, 'name is required')
    const row = await transaction(pool, async (client) => {
      const { rows } = await client.query(
        'insert into payers (name,short_name,color,tint) values ($1,$2,$3,$4) returning *',
        [
          name,
          str(b.short_name).trim() || name.split(/[@\s]/)[0] || 'Other',
          str(b.color).trim() || '#8FA1B3',
          str(b.tint).trim() || '#EEF1F4',
        ]
      )
      await recordChange(client, c.get('user'), 'person', 'created', null, rows[0])
      return rows[0]
    })
    return c.json(row, 201)
  })

  // ---- Persistent change history -----------------------------------------
  api.get('/history', async (c) => {
    const rawLimit = c.req.query('limit') ?? '50'
    const before = c.req.query('before')
    if (!/^[0-9]+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100)
      fail(400, 'limit must be an integer from 1 to 100')
    if (
      before !== undefined &&
      (!/^[1-9][0-9]{0,18}$/.test(before) || BigInt(before) > 9223372036854775807n)
    )
      fail(400, 'Invalid history cursor')
    const limit = Number(rawLimit)
    const { rows } = await pool.query(
      'select * from activity_log where ($1::bigint is null or id < $1) order by id desc limit $2',
      [before ?? null, limit + 1]
    )
    const entries = rows.slice(0, limit)
    return c.json({
      entries,
      nextCursor: rows.length > limit ? String(entries[entries.length - 1].id) : null,
    })
  })

  api.post('/history/:id/restore', async (c) => {
    const id = c.req.param('id')
    if (!/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n)
      fail(400, 'Invalid history id')
    await transaction(pool, async (client) => {
      const { rows } = await client.query('select * from activity_log where id=$1 for update', [id])
      const entry = rows[0]
      if (!entry) fail(404, 'History entry not found')
      if (entry.action !== 'deleted' || !['category', 'payment'].includes(entry.entity_type))
        fail(400, 'Only deleted budget items and payments can be restored')
      const { rowCount } = await client.query('select 1 from activity_log where restores_id=$1', [
        id,
      ])
      if (rowCount) fail(409, 'This deletion has already been undone')
      const before = entry.before_data as Snapshot
      if (entry.entity_type === 'category') {
        const { rows: restored } = await client.query(
          'insert into categories (id,name,vendor,contact,budget,quote,sort_order,created_at) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *',
          [
            before.id,
            before.name,
            before.vendor,
            before.contact,
            before.budget,
            before.quote,
            before.sort_order,
            before.created_at,
          ]
        )
        await recordChange(client, c.get('user'), 'category', 'restored', null, restored[0], id)
        for (const payment of (before._payments || []) as Snapshot[]) {
          const { rows: restoredPayment } = await client.query(
            'insert into payments (id,category_id,date,item,paid_by,amount,created_at) values ($1,$2,$3,$4,$5,$6,$7) returning *',
            [
              payment.id,
              payment.category_id,
              payment.date,
              payment.item,
              payment.paid_by,
              payment.amount,
              payment.created_at,
            ]
          )
          await recordChange(
            client,
            c.get('user'),
            'payment',
            'restored',
            null,
            restoredPayment[0],
            typeof payment._deletion_activity_id === 'string' ? payment._deletion_activity_id : null
          )
        }
      } else {
        const parent = await client.query('select id from categories where id=$1 for key share', [
          before.category_id,
        ])
        if (!parent.rowCount) fail(409, 'Restore the budget item before restoring this payment')
        const { rows: restored } = await client.query(
          'insert into payments (id,category_id,date,item,paid_by,amount,created_at) values ($1,$2,$3,$4,$5,$6,$7) returning *',
          [
            before.id,
            before.category_id,
            before.date,
            before.item,
            before.paid_by,
            before.amount,
            before.created_at,
          ]
        )
        await recordChange(client, c.get('user'), 'payment', 'restored', null, restored[0], id)
      }
    })
    return c.json({ ok: true })
  })

  api.all('*', (c) => c.json({ error: 'Not found' }, 404))
  return api
}

export function createApp(pool: Pool, cfg: AppConfig) {
  const app = new Hono()

  app.route('/api', createApi(pool, cfg))

  // ---- Login / logout with Keycloak ---------------------------------------
  if (cfg.auth) {
    app.route('/auth', cfg.auth.routes())
    // Signed-out visitors opening a page go straight to the Keycloak login.
    // (JS/CSS/images stay public: they contain no data.)
    app.use('*', cfg.auth.requirePageUser())
  } else {
    app.all('/auth/*', (c) => c.redirect('/', 303))
  }

  // ---- The React SPA (built by `vite build` into cfg.staticRoot) ----------
  // Vite puts content-hashed files under /assets, so they can be cached
  // forever; index.html must always be revalidated so new deploys show up.
  app.use(
    '*',
    serveStatic({
      root: cfg.staticRoot,
      onFound: (path, c) => {
        c.header(
          'Cache-Control',
          path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
        )
      },
    })
  )
  // Any other path → index.html (client-side app shell).
  app.get(
    '*',
    serveStatic({
      path: `${cfg.staticRoot}/index.html`,
      onFound: (_path, c) => {
        c.header('Cache-Control', 'no-cache')
      },
    })
  )

  return app
}
