import type { FastifyInstance } from 'fastify'
import { directoryAs } from '../lib/google.js'

const ADMIN = process.env.ADMIN_EMAIL ?? 'akbar@aadrila.com'
const DOMAIN = process.env.DOMAIN ?? 'aadrila.com'

export async function usersRoutes(app: FastifyInstance) {
  app.get('/api/users', async () => {
    const dir = directoryAs(ADMIN)
    const { data } = await dir.users.list({ domain: DOMAIN, maxResults: 500 })
    const users = (data.users ?? []).map((u) => ({
      email: u.primaryEmail,
      fullName: u.name?.fullName ?? '',
      title: u.organizations?.[0]?.title ?? undefined,
      phone: u.phones?.[0]?.value ?? undefined,
      photoUrl: u.thumbnailPhotoUrl ?? undefined,
      suspended: u.suspended ?? false,
    }))
    return { users, count: users.length }
  })
}
