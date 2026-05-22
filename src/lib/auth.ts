import { ref } from 'vue'

const TOKEN_KEY = 'aadrila-admin-id-token'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

declare global {
  interface Window {
    google?: any
  }
}

export interface AdminProfile {
  email: string
  name?: string
  picture?: string
}

export const idToken = ref<string | null>(localStorage.getItem(TOKEN_KEY))
export const admin = ref<AdminProfile | null>(null)
export const authError = ref<string | null>(null)

function decodeJwtPayload(token: string): any {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  }
  catch {
    return null
  }
}

function isExpired(token: string): boolean {
  const p = decodeJwtPayload(token)
  if (!p?.exp)
    return true
  return Date.now() / 1000 > p.exp - 30
}

export function getAuthHeaders(): Record<string, string> {
  return idToken.value ? { authorization: `Bearer ${idToken.value}` } : {}
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY)
  idToken.value = null
  admin.value = null
}

async function waitForGsi(timeoutMs = 5000): Promise<any> {
  const start = Date.now()
  while (!window.google?.accounts?.id) {
    if (Date.now() - start > timeoutMs)
      throw new Error('Google Identity Services failed to load')
    await new Promise(r => setTimeout(r, 100))
  }
  return window.google.accounts.id
}

function handleCredential(response: { credential: string }) {
  const token = response.credential
  if (!token)
    return
  localStorage.setItem(TOKEN_KEY, token)
  idToken.value = token
  const p = decodeJwtPayload(token)
  if (p)
    admin.value = { email: p.email, name: p.name, picture: p.picture }
}

export async function renderSignInButton(el: HTMLElement) {
  if (!CLIENT_ID) {
    authError.value = 'VITE_GOOGLE_CLIENT_ID is not set'
    return
  }
  const gsi = await waitForGsi()
  gsi.initialize({
    client_id: CLIENT_ID,
    callback: handleCredential,
    hd: 'aadrila.com',
  })
  gsi.renderButton(el, { type: 'standard', theme: 'outline', size: 'large' })
}

export function bootstrapAuth() {
  if (idToken.value && !isExpired(idToken.value)) {
    const p = decodeJwtPayload(idToken.value)
    if (p)
      admin.value = { email: p.email, name: p.name, picture: p.picture }
  }
  else if (idToken.value) {
    signOut()
  }
}
