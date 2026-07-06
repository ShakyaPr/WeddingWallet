import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Env } from './supabase'

// Optional defense-in-depth: verify the Cloudflare Access JWT that the edge
// injects on every request as `Cf-Access-Jwt-Assertion`. The whole Pages app
// is already gated by the Access application, so this is a second lock that
// also blocks anyone who somehow reaches the Function directly.
//
// It only activates when BOTH env vars are set:
//   CF_ACCESS_TEAM_DOMAIN  e.g. "yourteam.cloudflareaccess.com"
//   CF_ACCESS_AUD          the Application Audience (AUD) tag from Access
// Leave them blank to skip verification (edge Access still protects you).

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJwks(teamDomain: string) {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`
  let jwks = jwksCache.get(url)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url))
    jwksCache.set(url, jwks)
  }
  return jwks
}

/** Returns the authenticated email, or null if the check is disabled. Throws on invalid token. */
export async function verifyAccess(req: Request, env: Env): Promise<string | null> {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim()
  const aud = env.CF_ACCESS_AUD?.trim()
  if (!teamDomain || !aud) return null // hardening disabled

  const token =
    req.headers.get('Cf-Access-Jwt-Assertion') ||
    req.headers.get('cf-access-jwt-assertion')
  if (!token) throw new Error('Missing Cloudflare Access token')

  const { payload } = await jwtVerify(token, getJwks(teamDomain), {
    issuer: `https://${teamDomain}`,
    audience: aud,
  })
  return (payload.email as string) || 'authenticated'
}
