import type { PoolClient } from 'pg'
import type { Pool } from './db.js'
import type { User } from './auth.js'

export type Snapshot = Record<string, unknown>
export type Entity = 'category' | 'payment' | 'person'
export type Action = 'created' | 'updated' | 'deleted' | 'restored'

/** Keep each write and its audit trail in the same transaction. */
export async function transaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await work(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export async function recordChange(
  client: PoolClient,
  user: User,
  entity: Entity,
  action: Action,
  before: Snapshot | null,
  after: Snapshot | null,
  restoresId: string | null = null
): Promise<string | null> {
  if (action === 'updated' && JSON.stringify(before) === JSON.stringify(after)) return null
  before = before ? { ...before } : null
  after = after ? { ...after } : null
  if (entity === 'payment') {
    for (const snapshot of [before, after]) {
      if (!snapshot) continue
      const { rows } = await client.query('select name from categories where id=$1', [
        snapshot.category_id,
      ])
      if (rows[0]) snapshot._category_name = rows[0].name
    }
  }
  const row = after || before!
  const { rows } = await client.query(
    `insert into activity_log
      (entity_type, entity_id, entity_label, action, actor_id, actor_name, before_data, after_data, restores_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [
      entity,
      row.id,
      row.name || row.item || 'Payment',
      action,
      user.sub,
      user.name || user.username || user.email || 'Local user',
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      restoresId,
    ]
  )
  return String(rows[0].id)
}
