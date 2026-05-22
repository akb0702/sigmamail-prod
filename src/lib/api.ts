import { getAuthHeaders, signOut } from './auth'

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

export interface MeResponse {
  admin: { email: string, name?: string, picture?: string } | null
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...init.headers,
    },
  })
  if (res.status === 401) {
    signOut()
    throw new Error('Sign-in required')
  }
  if (res.status === 403) {
    throw new Error('You are not authorized as an admin')
  }
  if (!res.ok)
    throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  me: () => request<MeResponse>('/api/me'),

  getCurrentTemplate: () => request<{ current: TemplateDoc | null }>('/api/templates/current'),

  publishTemplate: (body: TemplateConfig) =>
    request<{ published: TemplateDoc }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listUsers: () => request<{ count: number, users: Array<{ email: string }> }>('/api/users'),

  push: (body: { dryRun?: boolean }) =>
    request<{ jobId: string, success: number, failed: number, results: PushResult[] }>(
      '/api/push',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  audit: () => request<{ currentVersion: number | null, users: AuditUser[] }>('/api/audit'),
}
