import { directoryAs } from '../lib/google.js'

const ADMIN = process.env.ADMIN_EMAIL ?? 'akbar@aadrila.com'
const DOMAIN = process.env.DOMAIN ?? 'aadrila.com'

async function main() {
  const dir = directoryAs(ADMIN)
  const { data } = await dir.users.list({ domain: DOMAIN, maxResults: 500 })
  const users = data.users ?? []
  console.log(`Found ${users.length} users in ${DOMAIN}:`)
  for (const u of users) {
    console.log(`  - ${u.primaryEmail}  (${u.name?.fullName ?? '?'})`)
  }
}

main().catch((err) => {
  console.error('List failed:', err?.response?.data ?? err)
  process.exit(1)
})
