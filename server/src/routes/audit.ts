import type { FastifyInstance } from 'fastify'
import { pushJobs, templates, users as usersCol } from '../lib/firestore.js'

export async function auditRoutes(app: FastifyInstance) {
  app.get('/api/audit', async () => {
    const currentSnap = await templates.doc('current').get()
    const currentVersion = currentSnap.exists ? (currentSnap.data() as any).version : null

    const userDocs = await usersCol.get()
    const rows = userDocs.docs.map((d) => {
      const data = d.data() as any
      return {
        email: data.email,
        appliedVersion: data.appliedVersion ?? null,
        appliedAt: data.appliedAt ?? null,
        drift: currentVersion !== null && data.appliedVersion !== currentVersion,
        lastError: data.lastError ?? null,
      }
    })

    return { currentVersion, users: rows }
  })

  app.get('/api/push-jobs', async () => {
    const snap = await pushJobs.orderBy('startedAt', 'desc').limit(10).get()
    return { jobs: snap.docs.map((d) => d.data()) }
  })
}
