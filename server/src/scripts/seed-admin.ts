import { admins } from '../lib/firestore.js'

const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL

if (!email) {
  console.error('Usage: npm run seed:admin -- someone@aadrila.com')
  process.exit(1)
}

if (!email.endsWith('@aadrila.com')) {
  console.error('Refusing to seed: email must be @aadrila.com')
  process.exit(1)
}

await admins.doc(email).set({
  email,
  addedBy: 'seed-script',
  addedAt: new Date().toISOString(),
})

console.log(`Seeded admin: ${email}`)
