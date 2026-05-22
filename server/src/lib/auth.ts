import type { FastifyReply, FastifyRequest } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { admins } from './firestore.js'

const CLIENT_ID = process.env.OAUTH_CLIENT_ID
const DOMAIN = process.env.DOMAIN ?? 'aadrila.com'

if (!CLIENT_ID) {
  console.warn('[auth] OAUTH_CLIENT_ID not set — protected routes will reject all requests')
}

const oauth = new OAuth2Client(CLIENT_ID)

export interface AuthContext {
  email: string
  name?: string
  picture?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AuthContext
  }
}

async function verifyIdToken(idToken: string): Promise<AuthContext | null> {
  if (!CLIENT_ID) return null
  try {
    const ticket = await oauth.verifyIdToken({ idToken, audience: CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload.email_verified) return null
    if (payload.hd !== DOMAIN) return null
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    }
  } catch {
    return null
  }
}

async function isAdmin(email: string): Promise<boolean> {
  const doc = await admins.doc(email).get()
  return doc.exists
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'missing bearer token' })
  }
  const ctx = await verifyIdToken(header.slice(7))
  if (!ctx) {
    return reply.code(401).send({ error: 'invalid or unverified token' })
  }
  if (!(await isAdmin(ctx.email))) {
    return reply.code(403).send({ error: 'not an admin' })
  }
  req.admin = ctx
}

export async function optionalAdmin(req: FastifyRequest) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return
  const ctx = await verifyIdToken(header.slice(7))
  if (ctx && (await isAdmin(ctx.email))) {
    req.admin = ctx
  }
}
