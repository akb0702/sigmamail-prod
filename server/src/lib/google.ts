import { google } from 'googleapis'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const KEY_PATH = resolve(process.cwd(), 'sa-key.json')

function loadKey() {
  const raw = readFileSync(KEY_PATH, 'utf8')
  return JSON.parse(raw) as { client_email: string; private_key: string }
}

export function authAs(userEmail: string, scopes: string[]) {
  const key = loadKey()
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes,
    subject: userEmail,
  })
}

export function gmailFor(userEmail: string) {
  const auth = authAs(userEmail, ['https://www.googleapis.com/auth/gmail.settings.basic'])
  return google.gmail({ version: 'v1', auth })
}

export function directoryAs(adminEmail: string) {
  const auth = authAs(adminEmail, ['https://www.googleapis.com/auth/admin.directory.user.readonly'])
  return google.admin({ version: 'directory_v1', auth })
}
