import { existsSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { createPool, migrate } from './db.js'
import { createApp } from './app.js'
import { accessEnabled } from './access.js'
import { Auth, type AuthConfig } from './auth.js'

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

// ---- Keycloak login config (fail closed: refuse to start without it) --------
const authDisabled = env.AUTH_DISABLED === 'true'
if (authDisabled && env.NODE_ENV === 'production') {
  // The Docker image sets NODE_ENV=production, so this can't slip into Dokploy.
  console.error('AUTH_DISABLED=true is only allowed in local development. Remove it and configure Keycloak (see DEPLOYMENT.md).')
  process.exit(1)
}
function readUrl(name: string): URL | undefined {
  const v = env[name]?.trim().replace(/\/+$/, '')
  if (!v) return undefined
  try {
    return new URL(v)
  } catch {
    console.error(`${name} is not a valid URL: ${v}`)
    process.exit(1)
  }
}
const appUrl = readUrl('APP_URL')
const issuer = readUrl('OIDC_ISSUER')
const clientId = env.OIDC_CLIENT_ID?.trim()
const clientSecret = env.OIDC_CLIENT_SECRET?.trim()

let authConfig: AuthConfig | null = null
if (!authDisabled) {
  const missing = Object.entries({ APP_URL: appUrl, OIDC_ISSUER: issuer, OIDC_CLIENT_ID: clientId, OIDC_CLIENT_SECRET: clientSecret })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) {
    console.error(
      `Keycloak login is not configured. Missing: ${missing.join(', ')}.\n` +
        'Set them in the Environment tab (see DEPLOYMENT.md), or AUTH_DISABLED=true for local development only.',
    )
    process.exit(1)
  }
  authConfig = {
    appUrl: appUrl!,
    issuer: issuer!,
    clientId: clientId!,
    clientSecret: clientSecret!,
    requiredRole: env.OIDC_REQUIRED_ROLE?.trim() || undefined,
  }
}

const pool = createPool(DATABASE_URL)
try {
  await migrate(pool, { seed: env.SEED_DATA === 'true' })
} catch (err) {
  console.error('Could not prepare the database:', (err as Error).message)
  process.exit(1)
}

const auth = authConfig ? new Auth(pool, authConfig) : null
// Check the Keycloak connection early, so a wrong OIDC_ISSUER shows up in the
// logs right away. Not fatal: the app keeps retrying on the next login.
auth
  ?.getConfig()
  .then(() => console.log(`Keycloak login: ON (issuer ${authConfig!.issuer.href}, client ${authConfig!.clientId})`))
  .catch((err) => console.error(`Keycloak login: cannot reach ${authConfig!.issuer.href} yet — ${(err as Error).message}`))
if (!auth) console.warn('⚠️  AUTH_DISABLED=true — anyone can use this app. Never set this in production.')

const app = createApp(pool, { staticRoot: env.STATIC_ROOT || './dist', access, auth, appUrl })

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
