import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../lib/auth.js'
import { templates } from '../lib/firestore.js'
import { directoryAs } from '../lib/google.js'
import { renderSignature } from '../lib/render.js'
import type { DirectoryUser, TemplateConfig } from '../lib/render.js'

const ADMIN = process.env.ADMIN_EMAIL ?? 'akbar@aadrila.com'
const DOMAIN = process.env.DOMAIN ?? 'aadrila.com'

const SAMPLE_USER: DirectoryUser = {
  email: 'sample@aadrila.com',
  fullName: 'Sample User',
  title: 'Product Designer',
  phone: '+91 98765 43210',
  photoUrl: 'https://www.gravatar.com/avatar/?d=mp&s=144',
}

async function fetchDirectoryUser(email: string): Promise<DirectoryUser | null> {
  try {
    const dir = directoryAs(ADMIN)
    const { data } = await dir.users.get({ userKey: email })
    return {
      email: data.primaryEmail ?? email,
      fullName: data.name?.fullName ?? email,
      title: data.organizations?.[0]?.title ?? undefined,
      phone: data.phones?.[0]?.value ?? undefined,
      photoUrl: data.thumbnailPhotoUrl ?? undefined,
    }
  } catch {
    return null
  }
}

export async function renderRoutes(app: FastifyInstance) {
  app.post<{
    Body: { config: TemplateConfig; userEmail?: string }
  }>('/api/render/preview', { preHandler: requireAdmin }, async (req) => {
    let user: DirectoryUser = SAMPLE_USER
    if (req.body.userEmail?.endsWith(`@${DOMAIN}`)) {
      const fetched = await fetchDirectoryUser(req.body.userEmail)
      if (fetched) user = fetched
    }
    const html = renderSignature(user, req.body.config)
    return { html, user }
  })

  app.get('/api/render/current', { preHandler: requireAdmin }, async (req, reply) => {
    const snap = await templates.doc('current').get()
    if (!snap.exists) return reply.code(404).send({ error: 'no current template' })
    const config = snap.data() as TemplateConfig
    const user = (await fetchDirectoryUser(req.admin!.email)) ?? SAMPLE_USER
    return { html: renderSignature(user, config), user }
  })
}
