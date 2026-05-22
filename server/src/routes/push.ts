import type { FastifyInstance } from 'fastify'
import pLimit from 'p-limit'
import { pushJobs, templates, users as usersCol } from '../lib/firestore.js'
import { directoryAs, gmailFor } from '../lib/google.js'
import { renderSignature } from '../lib/render.js'
import type { DirectoryUser, TemplateConfig } from '../lib/render.js'

const ADMIN = process.env.ADMIN_EMAIL ?? 'akbar@aadrila.com'
const DOMAIN = process.env.DOMAIN ?? 'aadrila.com'

interface TemplateDoc extends TemplateConfig {
  version: number
  publishedAt: string
  publishedBy: string
}

interface PushBody {
  dryRun?: boolean
  triggeredBy: string
}

interface PushResult {
  email: string
  status: 'ok' | 'error'
  error?: string
}

export async function pushRoutes(app: FastifyInstance) {
  app.post<{ Body: PushBody }>('/api/push', async (req) => {
    const { dryRun = false, triggeredBy } = req.body

    const currentSnap = await templates.doc('current').get()
    if (!currentSnap.exists) {
      return { error: 'No template published yet. POST /api/templates first.' }
    }
    const template = currentSnap.data() as TemplateDoc

    const dir = directoryAs(ADMIN)
    const { data } = await dir.users.list({ domain: DOMAIN, maxResults: 500 })
    const targets: DirectoryUser[] = (data.users ?? [])
      .filter((u) => !u.suspended && u.primaryEmail)
      .map((u) => ({
        email: u.primaryEmail!,
        fullName: u.name?.fullName ?? '',
        title: u.organizations?.[0]?.title ?? undefined,
        phone: u.phones?.[0]?.value ?? undefined,
        photoUrl: u.thumbnailPhotoUrl ?? undefined,
      }))

    const jobId = `job-${Date.now()}`
    const limit = pLimit(3)
    const results: PushResult[] = []

    await Promise.all(
      targets.map((user) =>
        limit(async () => {
          const html = renderSignature(user, template)
          if (dryRun) {
            results.push({ email: user.email, status: 'ok' })
            return
          }
          try {
            const gmail = gmailFor(user.email)
            const list = await gmail.users.settings.sendAs.list({ userId: 'me' })
            const primary = list.data.sendAs?.find((a) => a.isPrimary)
            if (!primary?.sendAsEmail) throw new Error('no primary sendAs')
            await gmail.users.settings.sendAs.update({
              userId: 'me',
              sendAsEmail: primary.sendAsEmail,
              requestBody: { signature: html },
            })
            await usersCol.doc(user.email).set(
              {
                email: user.email,
                appliedVersion: template.version,
                appliedAt: new Date().toISOString(),
                lastError: null,
              },
              { merge: true },
            )
            results.push({ email: user.email, status: 'ok' })
          } catch (err: any) {
            const message = err?.response?.data?.error?.message ?? err?.message ?? 'unknown'
            await usersCol.doc(user.email).set(
              {
                email: user.email,
                lastError: message,
                lastErrorAt: new Date().toISOString(),
              },
              { merge: true },
            )
            results.push({ email: user.email, status: 'error', error: message })
          }
        }),
      ),
    )

    const success = results.filter((r) => r.status === 'ok').length
    const failed = results.length - success

    await pushJobs.doc(jobId).set({
      id: jobId,
      version: template.version,
      triggeredBy,
      dryRun,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      success,
      failed,
      results,
    })

    return { jobId, success, failed, results }
  })
}
