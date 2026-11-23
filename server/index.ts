import { existsSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { createPool, migrate } from './db.js'
import { createApp } from './app.js'
import { accessEnabled } from './access.js'

// Local development: read ./.env if there is one. In Docker / Dokploy the
// variables come from the container environment and there is no .env file.
if (existsSync('.env')) process.loadEnvFile('.env')

const env = process.env
const DATABASE_URL = env.DATABASE_URL?.trim()
if (!DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Example: postgresql://user:password@host:5432/weddingwallet\n' +
      'In Dokploy, copy the database\'s "Internal Connection URL" into the app\'s Environment tab.',
  )
  process.exit(1)
}

const port = Number(env.PORT) || 3000
const access = { teamDomain: env.CF_ACCESS_TEAM_DOMAIN, aud: env.CF_ACCESS_AUD }

const pool = createPool(DATABASE_URL)
try {
  await migrate(pool, { seed: env.SEED_DATA === 'true' })
} catch (err) {
  console.error('Could not prepare the database:', (err as Error).message)
  process.exit(1)
}

const app = createApp(pool, { staticRoot: env.STATIC_ROOT || './dist', access })

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`WeddingWallet listening on http://0.0.0.0:${info.port}`)
  console.log(`Cloudflare Access JWT check: ${accessEnabled(access) ? 'ON' : 'off'}`)
})

// Docker / Swarm sends SIGTERM on redeploy: stop accepting requests, let
// in-flight ones finish, then close the DB pool.
let shuttingDown = false
function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received, shutting down…`)
  server.close(() => {
    pool.end().finally(() => process.exit(0))
  })
  setTimeout(() => process.exit(0), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
