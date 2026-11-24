import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { csrf } from 'hono/csrf'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Pool } from './db.js'
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
  if (err instanceof HTTPException) return err.getResponse() // e.g. 403 from the CSRF check
  const status = statusFor(err)
  if (status === 500) console.error('API error:', err)
  // Return errors as JSON so the frontend can show a real message.
  return c.json({ error: err.message || 'Internal error' }, status)
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
    if (!UUID_RE.test(c.req.param('id'))) return c.json({ error: 'Not found' }, 404)
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
    const b = await c.req.json().catch(() => ({}))
    if (!str(b.name).trim()) return c.json({ error: 'name is required' }, 400)
    const { rows } = await pool.query(
      `insert into categories (name, vendor, contact, budget, quote, sort_order)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        str(b.name).trim(),
        str(b.vendor).trim() || 'To be decided',
        str(b.contact).trim(),
        num(b.budget),
        num(b.quote),
        num(b.sort_order, 999),
      ],
    )
    return c.json(rows[0], 201)
  })

  api.patch('/categories/:id', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    // Column names come only from this fixed list, never from the request.
    const patch: Record<string, unknown> = {}
    if (b.name !== undefined) patch.name = str(b.name).trim()
    if (b.vendor !== undefined) patch.vendor = str(b.vendor).trim() || 'To be decided'
    if (b.contact !== undefined) patch.contact = str(b.contact).trim()
    if (b.budget !== undefined) patch.budget = num(b.budget)
    if (b.quote !== undefined) patch.quote = num(b.quote)
    if (b.sort_order !== undefined) patch.sort_order = num(b.sort_order)

    const cols = Object.keys(patch)
    if (cols.length === 0) return c.json({ error: 'nothing to update' }, 400)
    if (patch.name === '') return c.json({ error: 'name is required' }, 400)

    const sets = cols.map((col, i) => `${col} = $${i + 2}`).join(', ')
    const { rows } = await pool.query(
      `update categories set ${sets} where id = $1 returning *`,
      [c.req.param('id'), ...Object.values(patch)],
    )
    if (!rows[0]) return c.json({ error: 'Not found' }, 404)
    return c.json(rows[0])
  })

  api.delete('/categories/:id', async (c) => {
    await pool.query('delete from categories where id = $1', [c.req.param('id')])
    return c.json({ ok: true })
  })

  // ---- Payments -----------------------------------------------------------
  api.post('/payments', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    if (!UUID_RE.test(str(b.category_id).trim())) return c.json({ error: 'category_id is required' }, 400)
    if (num(b.amount) <= 0) return c.json({ error: 'amount must be greater than 0' }, 400)
    if (!str(b.paid_by).trim()) return c.json({ error: 'paid_by is required' }, 400)
    const { rows } = await pool.query(
      `insert into payments (category_id, date, item, paid_by, amount)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [
        str(b.category_id).trim(),
        str(b.date) || new Date().toISOString().slice(0, 10),
        str(b.item).trim() || 'Payment',
        str(b.paid_by).trim(),
        num(b.amount),
      ],
    )
    return c.json(rows[0], 201)
  })

  api.delete('/payments/:id', async (c) => {
    await pool.query('delete from payments where id = $1', [c.req.param('id')])
    return c.json({ ok: true })
  })

  // ---- Payers -------------------------------------------------------------
  api.post('/payers', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const name = str(b.name).trim()
    if (!name) return c.json({ error: 'name is required' }, 400)
    const { rows } = await pool.query(
      `insert into payers (name, short_name, color, tint)
       values ($1, $2, $3, $4)
       returning *`,
      [
        name,
        str(b.short_name).trim() || name.split(/[@\s]/)[0] || 'Other',
        str(b.color).trim() || '#8FA1B3',
        str(b.tint).trim() || '#EEF1F4',
      ],
    )
    return c.json(rows[0], 201)
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
          path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        )
      },
    }),
  )
  // Any other path → index.html (client-side app shell).
  app.get(
    '*',
    serveStatic({
      path: `${cfg.staticRoot}/index.html`,
      onFound: (_path, c) => {
        c.header('Cache-Control', 'no-cache')
      },
    }),
  )

  return app
}
