import type { FastifyInstance } from 'fastify'
import { templates } from '../lib/firestore.js'
import type { TemplateConfig } from '../lib/render.js'

interface TemplateDoc extends TemplateConfig {
  version: number
  publishedAt: string
  publishedBy: string
}

export async function templatesRoutes(app: FastifyInstance) {
  app.get('/api/templates/current', async () => {
    const snap = await templates.doc('current').get()
    if (!snap.exists) return { current: null }
    return { current: snap.data() as TemplateDoc }
  })

  app.get('/api/templates', async () => {
    const snap = await templates.where('version', '>', 0).orderBy('version', 'desc').limit(20).get()
    return { versions: snap.docs.map((d) => d.data() as TemplateDoc) }
  })

  app.post<{ Body: TemplateConfig & { publishedBy: string } }>('/api/templates', async (req) => {
    const body = req.body
    const currentSnap = await templates.doc('current').get()
    const nextVersion = currentSnap.exists ? (currentSnap.data() as TemplateDoc).version + 1 : 1

    const doc: TemplateDoc = {
      version: nextVersion,
      templateName: body.templateName,
      mainColor: body.mainColor,
      fontFamily: body.fontFamily,
      fields: body.fields,
      publishedAt: new Date().toISOString(),
      publishedBy: body.publishedBy,
    }

    const batch = templates.firestore.batch()
    batch.set(templates.doc(`v${nextVersion}`), doc)
    batch.set(templates.doc('current'), doc)
    await batch.commit()

    return { published: doc }
  })
}
