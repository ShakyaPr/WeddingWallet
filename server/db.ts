import { readFile } from 'node:fs/promises'
import pg from 'pg'

// ---- Type parsing -----------------------------------------------------------
// node-postgres returns `numeric` as a string (to avoid precision loss) and
// `date` as a JS Date at local midnight. The frontend expects plain numbers
// and 'YYYY-MM-DD' strings (src/types.ts), so parse them that way globally.
// Amounts are numeric(14,2), which a JS number represents exactly enough.
const NUMERIC_OID = 1700
const DATE_OID = 1082
pg.types.setTypeParser(NUMERIC_OID, (v) => Number(v))
pg.types.setTypeParser(DATE_OID, (v) => v)

export type Pool = pg.Pool

export function createPool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
  // An idle client can error out if the DB restarts; log it instead of
  // letting the unhandled 'error' event crash the process. The pool will
  // open a fresh connection for the next query.
  pool.on('error', (err) => console.error('Postgres pool error:', err.message))
  return pool
}

const sqlFile = (name: string) => readFile(new URL(`../db/${name}`, import.meta.url), 'utf8')

/** Wait for Postgres to accept connections (it may still be starting up). */
async function waitForDb(pool: pg.Pool, attempts = 30, delayMs = 2_000) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('select 1')
      return
    } catch (err) {
      if (i >= attempts) throw err
      console.log(`Waiting for Postgres (${i}/${attempts}): ${(err as Error).message}`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

/**
 * Create the tables if they don't exist (db/schema.sql is idempotent) and,
 * when `seed` is true, load db/seed.sql into a completely empty database.
 * Runs inside one transaction guarded by an advisory lock, so several
 * replicas starting at once can't race each other.
 */
export async function migrate(pool: pg.Pool, { seed }: { seed: boolean }) {
  await waitForDb(pool)
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1))', ['weddingwallet:migrate'])
    await client.query(await sqlFile('schema.sql'))

    if (seed) {
      const { rows } = await client.query<{ empty: boolean }>(
        `select not exists (select 1 from payers)
            and not exists (select 1 from categories)
            and not exists (select 1 from payments) as empty`,
      )
      if (rows[0]?.empty) {
        await client.query(await sqlFile('seed.sql'))
        console.log('Database was empty — loaded db/seed.sql')
      }
    }

    await client.query('commit')
    console.log('Database schema is up to date')
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
