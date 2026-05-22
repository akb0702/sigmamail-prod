import type { FastifyInstance } from 'fastify'
import { admins } from '../lib/firestore.js'
import { optionalAdmin, requireAdmin } from '../lib/auth.js'

export async function adminRoutes(app: FastifyInstance) {
  app.get('/api/me', { preHandler: optionalAdmin }, async (req) => {
    if (!req.admin) return { admin: null }
    return { admin: req.admin }
  })

  app.get('/api/admins', { preHandler: requireAdmin }, async () => {
    const snap = await admins.get()
    return { admins: snap.docs.map((d) => d.data()) }
  })

  app.post<{ Body: { email: string } }>(
    '/api/admins',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { email } = req.body
      if (!email || !email.endsWith('@aadrila.com')) {
        return reply.code(400).send({ error: 'email must be @aadrila.com' })
      }
      await admins.doc(email).set({
        email,
        addedBy: req.admin!.email,
        addedAt: new Date().toISOString(),
      })
      return { added: email }
    },
  )

  app.delete<{ Params: { email: string } }>(
    '/api/admins/:email',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { email } = req.params
      if (email === req.admin!.email) {
        return reply.code(400).send({ error: 'cannot remove yourself' })
      }
      await admins.doc(email).delete()
      return { removed: email }
    },
  )
}
