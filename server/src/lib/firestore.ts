import { Firestore } from '@google-cloud/firestore'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const KEY_PATH = process.env.SA_KEY_PATH ?? resolve(process.cwd(), 'sa-key.json')
const PROJECT_ID = process.env.GCP_PROJECT_ID ?? 'aadrila-sigmasign'

export const db = new Firestore({
  projectId: PROJECT_ID,
  // In Cloud Run, when the instance's attached service account has datastore
  // access, omit keyFilename so ADC is used. Locally, fall back to the file.
  ...(existsSync(KEY_PATH) ? { keyFilename: KEY_PATH } : {}),
})

export const templates = db.collection('templates')
export const pushJobs = db.collection('pushJobs')
export const users = db.collection('users')
export const admins = db.collection('admins')
