import { createHash, randomBytes } from 'node:crypto'
import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { decodeJwt } from 'jose'
import * as oidc from 'openid-client'
import type { Pool } from './db.js'

// ============================================================================
//  Login with Keycloak (OpenID Connect, Authorization Code flow + PKCE).
//
//  The Node server is the OIDC client ("backend for frontend"):
//    • the browser is sent to Keycloak to sign in, then back to /auth/callback
//    • the server exchanges the code for tokens and keeps them in Postgres
//    • the browser only ever holds an opaque, HttpOnly session cookie
//
//  Keycloak stays the source of truth: whenever the access token expires
//  (5 min by default) the server refreshes it. If the user was disabled,
//  deleted, logged out in Keycloak, or lost the required role, the refresh
//  fails and the session is deleted on the spot.
// ============================================================================

export interface AuthConfig {
  /** Public base URL of this app, e.g. https://wallet.example.com */
  appUrl: URL
  /** Keycloak realm issuer, e.g. https://auth.example.com/realms/weddingwallet */
  issuer: URL
  clientId: string
  clientSecret: string
  /** Optional realm role or client role that users must have. */
  requiredRole?: string
}

export interface User {
  sub: string
  username: string
  email: string
  name: string
}

export type AuthEnv = { Variables: { user: User } }

const LOGIN_TTL_S = 10 * 60 // time allowed to complete the Keycloak login
const COOKIE_MAX_AGE_S = 30 * 24 * 3600 // Keycloak's session limits apply on top of this
const FALLBACK_SESSION_S = 30 * 24 * 3600 // if Keycloak doesn't report a refresh lifetime
const REFRESH_SKEW_MS = 15_000

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** Keycloak (or our role check) refused the session — the user must sign in again. */
class SessionRejected extends Error {}

/** Only allow same-site relative paths as post-login targets (no open redirects). */
function safeReturnTo(v: string | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || v.startsWith('/auth/')) return '/'
  return v
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
}

/** A small standalone page for login problems (styled like the app). */
function messagePage(c: Context, status: 400 | 403 | 503, title: string, message: string, link: { href: string; label: string }) {
  return c.html(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · WeddingWallet</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F6EFEC;font-family:system-ui,-apple-system,sans-serif;color:#3A2C2E;padding:16px;box-sizing:border-box}
.card{max-width:380px;width:100%;background:#fff;border:1px solid #F1E7E4;border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 8px 20px rgba(58,44,46,.05)}
h1{font-family:'Playfair Display',Georgia,serif;font-size:21px;font-weight:600;margin:0 0 10px}p{font-size:14px;color:#9A868A;line-height:1.5;margin:0 0 20px;word-break:break-word}
a{display:inline-block;background:#7E4451;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:14px}</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></div></body></html>`,
    status,
  )
}

export class Auth {
  private config?: oidc.Configuration
  private configLoading?: Promise<oidc.Configuration>
  private refreshing = new Map<string, Promise<User | null>>()
  private readonly secure: boolean
  private readonly sessionCookie: string
  private readonly loginCookie: string

  constructor(
    private readonly pool: Pool,
    private readonly cfg: AuthConfig,
  ) {
    this.secure = cfg.appUrl.protocol === 'https:'
    // `__Host-` cookies can only be set over HTTPS, for this exact host, on path /.
    this.sessionCookie = this.secure ? '__Host-ww_session' : 'ww_session'
    this.loginCookie = this.secure ? '__Host-ww_login' : 'ww_login'
  }

  private get redirectUri() {
    return new URL('/auth/callback', this.cfg.appUrl).href
  }

  /** Keycloak's OIDC discovery document, fetched once and cached. Retries on failure. */
  async getConfig(): Promise<oidc.Configuration> {
    if (this.config) return this.config
    this.configLoading ??= oidc
      .discovery(
        this.cfg.issuer,
        this.cfg.clientId,
        this.cfg.clientSecret,
        undefined,
        // Plain-http Keycloak is only acceptable for local development.
        this.cfg.issuer.protocol === 'http:' ? { execute: [oidc.allowInsecureRequests] } : undefined,
      )
      .then((config) => (this.config = config))
      .finally(() => (this.configLoading = undefined))
    return this.configLoading
  }

  private hasRequiredRole(accessToken: string): boolean {
    const role = this.cfg.requiredRole
    if (!role) return true
    // Keycloak puts roles in the access token: realm roles under
    // realm_access, client roles under resource_access.<client-id>. The token
    // came straight from Keycloak's token endpoint over TLS, so decoding
    // (without re-verifying the signature) is sufficient here.
    const claims = decodeJwt(accessToken) as {
      realm_access?: { roles?: string[] }
      resource_access?: Record<string, { roles?: string[] }>
    }
    return Boolean(
      claims.realm_access?.roles?.includes(role) ||
        claims.resource_access?.[this.cfg.clientId]?.roles?.includes(role),
    )
  }

  private static lifetimes(tokens: oidc.TokenEndpointResponse) {
    const now = Date.now()
    const accessS = Number(tokens.expires_in) || 300
    // Keycloak-specific: how long the refresh token (≈ the SSO session) stays valid.
    const refreshS = Number((tokens as { refresh_expires_in?: unknown }).refresh_expires_in) || FALLBACK_SESSION_S
    return { accessExpiresAt: new Date(now + accessS * 1000), expiresAt: new Date(now + refreshS * 1000) }
  }

  private static userFromClaims(claims: oidc.IDToken | undefined, fallback?: User): User {
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const username = str(claims?.preferred_username) || fallback?.username || ''
    const email = str(claims?.email) || fallback?.email || ''
    const name =
      str(claims?.name) ||
      [str(claims?.given_name), str(claims?.family_name)].filter(Boolean).join(' ') ||
      fallback?.name ||
      username ||
      email
    return { sub: str(claims?.sub) || fallback?.sub || '', username, email, name }
  }

  // ---- Sessions --------------------------------------------------------------

  /** Returns the signed-in user, or null. Throws if Keycloak can't be reached. */
  async currentUser(c: Context): Promise<User | null> {
    const token = getCookie(c, this.sessionCookie)
    if (!token) return null
    const id = sha256(token)
    const { rows } = await this.pool.query(
      `select id, sub, username, email, name, refresh_token, access_expires_at
         from sessions where id = $1 and expires_at > now()`,
      [id],
    )
    const s = rows[0]
    if (!s) return null
    const user: User = { sub: s.sub, username: s.username, email: s.email, name: s.name }
    if (new Date(s.access_expires_at).getTime() - REFRESH_SKEW_MS > Date.now()) return user

    // Time to re-check with Keycloak. Share one refresh between parallel requests.
    let pending = this.refreshing.get(id)
    if (!pending) {
      pending = this.refresh(id, s.refresh_token, user).finally(() => this.refreshing.delete(id))
      this.refreshing.set(id, pending)
    }
    return pending
  }

  private async refresh(id: string, refreshToken: string | null, user: User): Promise<User | null> {
    const config = await this.getConfig()
    try {
      if (!refreshToken) throw new SessionRejected('no refresh token')
      const tokens = await oidc.refreshTokenGrant(config, refreshToken)
      if (!this.hasRequiredRole(tokens.access_token)) throw new SessionRejected('required role removed')
      const updated = Auth.userFromClaims(tokens.claims(), user)
      const { accessExpiresAt, expiresAt } = Auth.lifetimes(tokens)
      await this.pool.query(
        `update sessions
            set refresh_token = coalesce($2, refresh_token), id_token = coalesce($3, id_token),
                username = $4, email = $5, name = $6, access_expires_at = $7, expires_at = $8
          where id = $1`,
        [id, tokens.refresh_token ?? null, tokens.id_token ?? null, updated.username, updated.email, updated.name, accessExpiresAt, expiresAt],
      )
      return updated
    } catch (err) {
      // Keycloak answered "no" (session ended, user disabled/deleted, role
      // removed…) → end our session too. Network problems and Keycloak 5xx
      // errors are re-thrown so the user gets "try again" instead of a logout.
      const rejected =
        err instanceof SessionRejected || (err instanceof oidc.ResponseBodyError && err.status < 500)
      if (rejected) {
        await this.pool.query('delete from sessions where id = $1', [id])
        const reason =
          err instanceof oidc.ResponseBodyError ? `${err.error}${err.error_description ? ` (${err.error_description})` : ''}` : (err as Error).message
        console.log(`Session ended for ${user.username || user.sub}: ${reason}`)
        return null
      }
      throw err
    }
  }

  // ---- Middleware --------------------------------------------------------------

  /** For /api/*: 401 JSON (the SPA then redirects to /auth/login). */
  requireApiUser(): MiddlewareHandler<AuthEnv> {
    return async (c, next) => {
      let user: User | null
      try {
        user = await this.currentUser(c)
      } catch (err) {
        console.error('Auth check failed:', (err as Error).message)
        return c.json({ error: 'The login server is unreachable. Please try again in a moment.' }, 503)
      }
      if (!user) return c.json({ error: 'Your session has ended. Please sign in again.', login: true }, 401)
      c.set('user', user)
      await next()
    }
  }

  /** For page loads: send signed-out visitors straight to Keycloak. */
  requirePageUser(): MiddlewareHandler {
    return async (c, next) => {
      const path = c.req.path
      const isPage = c.req.method === 'GET' && !/\.[a-z0-9]+$/i.test(path) // not /assets/x.js, /favicon.svg…
      if (!isPage) return next()
      let user: User | null = null
      try {
        user = await this.currentUser(c)
      } catch {
        // Keycloak unreachable: let the page load; its API calls will show the error.
        return next()
      }
      if (!user) {
        const returnTo = path + (new URL(c.req.url).search || '')
        return c.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
      }
      await next()
    }
  }

  // ---- /auth routes ------------------------------------------------------------

  routes() {
    const r = new Hono()
    const cookieBase = { httpOnly: true, secure: this.secure, sameSite: 'Lax' as const, path: '/' }

    r.onError((err, c) => {
      if (err instanceof HTTPException) return err.getResponse() // e.g. 403 from the CSRF check
      console.error('Login error:', err)
      return messagePage(c, 503, 'Sign-in problem', 'We could not complete sign-in with the login server. Please try again.', {
        href: '/auth/login',
        label: 'Try again',
      })
    })

    r.get('/login', async (c) => {
      const config = await this.getConfig()
      const state = oidc.randomState()
      const nonce = oidc.randomNonce()
      const verifier = oidc.randomPKCECodeVerifier()
      const returnTo = safeReturnTo(c.req.query('returnTo'))
      setCookie(
        c,
        this.loginCookie,
        Buffer.from(JSON.stringify({ state, nonce, verifier, returnTo })).toString('base64url'),
        { ...cookieBase, maxAge: LOGIN_TTL_S },
      )
      const url = oidc.buildAuthorizationUrl(config, {
        redirect_uri: this.redirectUri,
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
        code_challenge_method: 'S256',
      })
      return c.redirect(url.href)
    })

    r.get('/callback', async (c) => {
      const raw = getCookie(c, this.loginCookie)
      deleteCookie(c, this.loginCookie, cookieBase)

      const kcError = c.req.query('error')
      if (kcError) {
        return messagePage(c, 400, 'Sign-in cancelled', c.req.query('error_description') || kcError, {
          href: '/auth/login',
          label: 'Try again',
        })
      }

      let tx: { state: string; nonce: string; verifier: string; returnTo: string } | null = null
      try {
        tx = raw ? JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) : null
      } catch {
        tx = null
      }
      if (!tx?.state || !tx.verifier) {
        // Expired, or a second tab overwrote the attempt. If already signed in, just continue.
        if (await this.currentUser(c).catch(() => null)) return c.redirect('/')
        return messagePage(c, 400, 'Sign-in expired', 'That sign-in attempt timed out. Please start again.', {
          href: '/auth/login',
          label: 'Sign in',
        })
      }

      const config = await this.getConfig()
      // Rebuild the callback URL from APP_URL: behind Traefik the server sees
      // http://<container>/…, but redirect_uri must match what Keycloak saw.
      const currentUrl = new URL(`/auth/callback${new URL(c.req.url).search}`, this.cfg.appUrl)
      let tokens: Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>
      try {
        tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
          pkceCodeVerifier: tx.verifier,
          expectedState: tx.state,
          expectedNonce: tx.nonce,
        })
      } catch (err) {
        console.error('Code exchange failed:', (err as Error).message)
        return messagePage(c, 400, 'Sign-in failed', 'Your sign-in could not be verified. Please try again.', {
          href: `/auth/login?returnTo=${encodeURIComponent(tx.returnTo)}`,
          label: 'Try again',
        })
      }

      if (!this.hasRequiredRole(tokens.access_token)) {
        // They are signed in to Keycloak, so offer a Keycloak logout to switch accounts.
        const switchUrl = oidc.buildEndSessionUrl(config, {
          client_id: this.cfg.clientId,
          post_logout_redirect_uri: new URL('/', this.cfg.appUrl).href,
        })
        return messagePage(
          c,
          403,
          'No access',
          `Your account is not allowed to use WeddingWallet. Ask the admin to give you the "${this.cfg.requiredRole}" role in Keycloak.`,
          { href: switchUrl.href, label: 'Sign in as someone else' },
        )
      }

      const user = Auth.userFromClaims(tokens.claims())
      const { accessExpiresAt, expiresAt } = Auth.lifetimes(tokens)
      const sessionToken = randomBytes(32).toString('base64url')
      const previous = getCookie(c, this.sessionCookie)

      await this.pool.query(
        `insert into sessions (id, sub, username, email, name, id_token, refresh_token, access_expires_at, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [sha256(sessionToken), user.sub, user.username, user.email, user.name, tokens.id_token ?? '', tokens.refresh_token ?? null, accessExpiresAt, expiresAt],
      )
      // Housekeeping: drop the replaced session and any expired ones.
      await this.pool.query('delete from sessions where id = $1 or expires_at < now()', [previous ? sha256(previous) : ''])

      setCookie(c, this.sessionCookie, sessionToken, { ...cookieBase, maxAge: COOKIE_MAX_AGE_S })
      console.log(`Signed in: ${user.username || user.email || user.sub}`)
      return c.redirect(safeReturnTo(tx.returnTo))
    })

    // POST only (from a same-origin form), so other sites can't log you out.
    r.post('/logout', csrf({ origin: this.cfg.appUrl.origin }), async (c) => {
      const token = getCookie(c, this.sessionCookie)
      let idToken = ''
      if (token) {
        const { rows } = await this.pool.query('delete from sessions where id = $1 returning id_token', [sha256(token)])
        idToken = rows[0]?.id_token ?? ''
      }
      deleteCookie(c, this.sessionCookie, cookieBase)

      // Also end the Keycloak session, then come back to the app (→ login page).
      try {
        const config = await this.getConfig()
        const url = oidc.buildEndSessionUrl(config, {
          post_logout_redirect_uri: new URL('/', this.cfg.appUrl).href,
          ...(idToken ? { id_token_hint: idToken } : { client_id: this.cfg.clientId }),
        })
        return c.redirect(url.href, 303)
      } catch {
        return c.redirect('/', 303)
      }
    })

    return r
  }
}

/** Stand-in used only when AUTH_DISABLED=true (local development). */
export const DEV_USER: User = { sub: 'local-dev', username: 'dev', email: 'dev@localhost', name: 'Local Dev' }
