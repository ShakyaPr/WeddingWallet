import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { serve } from '@hono/node-server'
import { Hono, type MiddlewareHandler } from 'hono'
import { testDatabase } from './database.js'
import { createApp } from '../server/app.js'
import { migrate } from '../server/db.js'
import type { Auth, AuthEnv } from '../server/auth.js'

let db: Awaited<ReturnType<typeof testDatabase>>
let server: ReturnType<typeof serve>
let base: string
const actor = {
  sub: 'test-user-id',
  name: 'Test Partner',
  username: 'partner',
  email: 'partner@example.test',
}
const auth = {
  requireApiUser: (): MiddlewareHandler<AuthEnv> => async (c, next) => {
    if (c.req.header('X-Test-Session') !== 'signed-in')
      return c.json({ error: 'Sign in required' }, 401)
    c.set('user', actor)
    await next()
  },
  routes: () => new Hono(),
  requirePageUser: (): MiddlewareHandler => async (_c, next) => {
    await next()
  },
} as unknown as Auth

before(async () => {
  db = await testDatabase()
  server = serve({
    fetch: createApp(db.pool, { staticRoot: './dist', auth, access: {} }).fetch,
    port: 0,
    hostname: '127.0.0.1',
  })
  if (!server.listening) await once(server, 'listening')
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
  if (db) await db.close()
})
async function request(path: string, method = 'GET', body?: unknown, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Test-Session': 'signed-in' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await response.json()) as any
  assert.equal(response.status, expected, JSON.stringify(json))
  return json
}
const newCategory = (name = 'Flowers') =>
  request('/categories', 'POST', { name, vendor: 'Florist', budget: 500, quote: 600 }, 201)
const newPayment = (id: string, amount = 123.45) =>
  request(
    '/payments',
    'POST',
    { category_id: id, paid_by: 'Amma', item: 'Advance', amount, date: '2026-11-24' },
    201
  )

// These requests go over HTTP into the real Hono routes and an isolated Postgres.
test('payment edits preserve identity and record authenticated before/after values, without no-op noise', async () => {
  const category = await newCategory()
  const payment = await newPayment(category.id)
  const updated = await request(`/payments/${payment.id}`, 'PATCH', {
    amount: 200.75,
    item: 'Corrected advance',
    paid_by: 'Thaththa',
    date: '2026-11-23',
    actor_name: 'Spoofed',
  })
  assert.equal(updated.id, payment.id)
  assert.equal(updated.created_at, payment.created_at)
  const history = await request('/history')
  const edit = history.entries.find(
    (e: any) => e.entity_id === payment.id && e.action === 'updated'
  )
  assert.equal(edit.before_data.amount, 123.45)
  assert.equal(edit.after_data.amount, 200.75)
  assert.equal(edit.after_data._category_name, 'Flowers')
  assert.equal(edit.actor_id, actor.sub)
  assert.equal(edit.actor_name, actor.name)
  await request(`/payments/${payment.id}`, 'PATCH', { amount: 200.75 })
  assert.equal((await request('/history')).entries.length, history.entries.length)
  const moved = await newCategory('Photography')
  await request(`/payments/${payment.id}`, 'PATCH', { category_id: moved.id })
  const move = (await request('/history')).entries[0]
  assert.equal(move.before_data._category_name, 'Flowers')
  assert.equal(move.after_data._category_name, 'Photography')
})

test('invalid edits reject bad money, impossible dates, empty patches and missing records without audit writes', async () => {
  const category = await newCategory('Validation')
  const payment = await newPayment(category.id)
  const before = (await request('/history')).entries.length
  for (const body of [
    { amount: 0 },
    { amount: -1 },
    { amount: 'NaN' },
    { amount: 0.001 },
    { amount: null },
    { amount: 1e12 },
    { date: '2026-02-30' },
    { date: 'bad' },
    { paid_by: '' },
    { category_id: 'bad' },
    {},
    null,
    [],
  ])
    await request(`/payments/${payment.id}`, 'PATCH', body, 400)
  await request(
    `/payments/${payment.id}`,
    'PATCH',
    { category_id: '00000000-0000-4000-8000-000000000001' },
    400
  )
  await request('/payments/00000000-0000-4000-8000-000000000001', 'PATCH', { amount: 5 }, 404)
  await request('/categories', 'POST', { name: 'Bad', budget: -1 }, 400)
  assert.equal((await request('/history')).entries.length, before)
})

test('deletion undo restores an item and its payments atomically, with persistent history', async () => {
  const category = await newCategory('Restore me')
  const p1 = await newPayment(category.id)
  const p2 = await newPayment(category.id, 10)
  const deleted = await request(`/categories/${category.id}`, 'DELETE')
  let state = await request('/state')
  assert(!state.categories.some((c: any) => c.id === category.id))
  assert(!state.payments.some((p: any) => p.category_id === category.id))
  const log = await request('/history')
  const event = log.entries.find((e: any) => e.id === deleted.activity_id)
  assert.equal(event.before_data._payments.length, 2)
  assert.equal(
    log.entries.filter((e: any) => [p1.id, p2.id].includes(e.entity_id) && e.action === 'deleted')
      .length,
    2
  )
  const responses = await Promise.all(
    [0, 1].map(() =>
      fetch(base + `/history/${deleted.activity_id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Test-Session': 'signed-in' },
        body: '{}',
      })
    )
  )
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409])
  state = await request('/state')
  assert.equal(state.payments.filter((p: any) => p.category_id === category.id).length, 2)
  assert(state.payments.some((p: any) => p.id === p1.id && p.amount === p1.amount))
  await migrate(db.pool, { seed: false })
  assert(
    (await request('/history')).entries.some(
      (e: any) => e.id === deleted.activity_id && e.action === 'deleted'
    )
  )
  const cascadeDeletion = log.entries.find(
    (e: any) => e.entity_id === p1.id && e.action === 'deleted'
  )
  const paymentDelete = await request(`/payments/${p1.id}`, 'DELETE')
  await request(`/history/${cascadeDeletion.id}/restore`, 'POST', undefined, 409)
  assert(!(await request('/state')).payments.some((p: any) => p.id === p1.id))
  await request(`/history/${paymentDelete.activity_id}/restore`, 'POST')
  assert((await request('/state')).payments.some((p: any) => p.id === p1.id))
})

test('payment undo waits for its parent and rejects non-deletion history', async () => {
  const category = await newCategory('Parent dependency')
  const payment = await newPayment(category.id)
  const created = (await request('/history')).entries[0]
  await request(`/history/${created.id}/restore`, 'POST', undefined, 400)
  await request('/history/9223372036854775807/restore', 'POST', undefined, 404)
  const removedPayment = await request(`/payments/${payment.id}`, 'DELETE')
  const removedCategory = await request(`/categories/${category.id}`, 'DELETE')
  await request(`/history/${removedPayment.activity_id}/restore`, 'POST', undefined, 409)
  await request(`/history/${removedCategory.activity_id}/restore`, 'POST')
  await request(`/history/${removedPayment.activity_id}/restore`, 'POST')
  assert((await request('/state')).payments.some((p: any) => p.id === payment.id))
})

test('history pages are stable, validated, and protected by the existing auth middleware', async () => {
  const payer = await request('/payers', 'POST', { name: 'History Person' }, 201)
  assert(
    (await request('/history')).entries.some(
      (e: any) => e.entity_id === payer.id && e.entity_type === 'person'
    )
  )
  const first = await request('/history?limit=2')
  const second = await request(`/history?limit=2&before=${first.nextCursor}`)
  assert.equal(first.entries.length, 2)
  assert(second.entries.every((entry: any) => BigInt(entry.id) < BigInt(first.nextCursor)))
  for (const query of [
    'limit=0',
    'limit=101',
    'limit=NaN',
    'before=-1',
    'before=9223372036854775808',
  ])
    await request('/history?' + query, 'GET', undefined, 400)
  for (const path of ['/history', '/state', '/payments/00000000-0000-4000-8000-000000000001']) {
    const response = await fetch(base + path, {
      method: path.includes('/payments/') ? 'PATCH' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(path.includes('/payments/') ? { body: '{"amount":1}' } : {}),
    })
    assert.equal(response.status, 401)
  }
})

test('an audit failure rolls back the payment change as well', async () => {
  const category = await newCategory('Atomic')
  const payment = await newPayment(category.id)
  await db.pool.query(
    `create function fail_audit_test() returns trigger language plpgsql as $$ begin raise exception 'test audit failure'; end $$; create trigger fail_audit_test before insert on activity_log for each row execute function fail_audit_test()`
  )
  try {
    await request(`/payments/${payment.id}`, 'PATCH', { amount: 999 }, 500)
    const state = await request('/state')
    assert.equal(state.payments.find((p: any) => p.id === payment.id).amount, payment.amount)
  } finally {
    await db.pool.query(
      'drop trigger fail_audit_test on activity_log; drop function fail_audit_test()'
    )
  }
})
