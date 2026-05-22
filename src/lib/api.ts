export interface TemplateConfig {
  templateName: string
  mainColor: string
  fontFamily: string
  fields: {
    showTitle: boolean
    showPhone: boolean
    showPhoto: boolean
  }
}

export interface TemplateDoc extends TemplateConfig {
  version: number
  publishedAt: string
  publishedBy: string
}

export interface PushResult {
  email: string
  status: 'ok' | 'error'
  error?: string
}

export interface AuditUser {
  email: string
  appliedVersion: number | null
  appliedAt: string | null
  drift: boolean
  lastError: string | null
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok)
    throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  getCurrentTemplate: () =>
    fetch('/api/templates/current').then(json<{ current: TemplateDoc | null }>),

  publishTemplate: (body: TemplateConfig & { publishedBy: string }) =>
    fetch('/api/templates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(json<{ published: TemplateDoc }>),

  listUsers: () =>
    fetch('/api/users').then(json<{ count: number, users: Array<{ email: string }> }>),

  push: (body: { triggeredBy: string, dryRun?: boolean }) =>
    fetch('/api/push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(json<{ jobId: string, success: number, failed: number, results: PushResult[] }>),

  audit: () =>
    fetch('/api/audit').then(json<{ currentVersion: number | null, users: AuditUser[] }>),
}
