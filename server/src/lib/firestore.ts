import { Firestore } from '@google-cloud/firestore'
import { resolve } from 'node:path'

const KEY_PATH = resolve(process.cwd(), 'sa-key.json')
const PROJECT_ID = process.env.GCP_PROJECT_ID ?? 'aadrila-sigmasign'

export const db = new Firestore({
  projectId: PROJECT_ID,
  keyFilename: KEY_PATH,
})

export const templates = db.collection('templates')
export const pushJobs = db.collection('pushJobs')
export const users = db.collection('users')
export const admins = db.collection('admins')
