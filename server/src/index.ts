import cors from '@fastify/cors'
import Fastify from 'fastify'
import { adminRoutes } from './routes/admins.js'
import { auditRoutes } from './routes/audit.js'
import { pushRoutes } from './routes/push.js'
import { templatesRoutes } from './routes/templates.js'
import { usersRoutes } from './routes/users.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

app.get('/health', async () => ({ status: 'ok' }))

await app.register(adminRoutes)
await app.register(usersRoutes)
await app.register(templatesRoutes)
await app.register(pushRoutes)
await app.register(auditRoutes)

const PORT = Number(process.env.PORT ?? 8080)
app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
