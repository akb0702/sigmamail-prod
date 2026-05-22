import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { adminRoutes } from './routes/admins.js'
import { auditRoutes } from './routes/audit.js'
import { pushRoutes } from './routes/push.js'
import { renderRoutes } from './routes/render.js'
import { templatesRoutes } from './routes/templates.js'
import { usersRoutes } from './routes/users.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

app.get('/health', async () => ({ status: 'ok' }))

await app.register(adminRoutes)
await app.register(usersRoutes)
await app.register(templatesRoutes)
await app.register(pushRoutes)
await app.register(renderRoutes)
await app.register(auditRoutes)

// Serve the built SPA from /app/dist in production. Skipped in local dev,
// where Vite handles the frontend on a separate port.
const STATIC_DIR = process.env.STATIC_DIR ?? resolve(process.cwd(), 'public')
if (existsSync(STATIC_DIR)) {
  await app.register(fastifyStatic, { root: STATIC_DIR })
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || req.url === '/health') {
      return reply.code(404).send({ error: 'not found' })
    }
    return reply.sendFile('index.html')
  })
  app.log.info(`Serving static SPA from ${STATIC_DIR}`)
}

const PORT = Number(process.env.PORT ?? 8080)
app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
