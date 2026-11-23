import { createRemoteJWKSet, jwtVerify } from 'jose'

// Optional defense-in-depth for when the site sits behind Cloudflare Access
// (Google login): verify the Access JWT that Cloudflare injects on every
// proxied request as `Cf-Access-Jwt-Assertion`. This matters on a VPS,
// because anyone who learns the server's IP could otherwise skip Cloudflare
// and talk to Traefik directly.
//
// It only activates when BOTH env vars are set:
//   CF_ACCESS_TEAM_DOMAIN  e.g. "yourteam.cloudflareaccess.com"
//   CF_ACCESS_AUD          the Application Audience (AUD) tag from Access
// Leave them blank to skip verification.

export interface AccessConfig {
  teamDomain?: string
  aud?: string
}

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

export function accessEnabled(cfg: AccessConfig): boolean {
  return Boolean(cfg.teamDomain?.trim() && cfg.aud?.trim())
}

/** Returns the authenticated email, or null if the check is disabled. Throws on invalid token. */
export async function verifyAccess(req: Request, cfg: AccessConfig): Promise<string | null> {
  const teamDomain = cfg.teamDomain?.trim()
  const aud = cfg.aud?.trim()
  if (!teamDomain || !aud) return null // hardening disabled

  const token = req.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) throw new Error('Missing Cloudflare Access token')

  const { payload } = await jwtVerify(token, getJwks(teamDomain), {
    issuer: `https://${teamDomain}`,
    audience: aud,
  })
  return (payload.email as string) || 'authenticated'
}
