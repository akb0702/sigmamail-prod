# Aadrila Signature Server

Phase 1 prove-out: confirms domain-wide delegation works by pushing a test signature to your Gmail.

## Setup

1. Complete every step in [`GCP_SETUP.md`](./GCP_SETUP.md).
2. Make sure `server/sa-key.json` exists (the downloaded service account key).
3. Install deps:
   ```bash
   cd server
   npm install
   ```

## Run

**List domain users** (sanity-check Directory API + DWD):
```bash
npm run list:users
```
Expected: a list of `@aadrila.com` users.

**Push test signature to your Gmail:**
```bash
npm run push:test
```
Then open Gmail → ⚙️ → See all settings → Signature. The test signature should be there.

## Override targets

```bash
TARGET_EMAIL=someone@aadrila.com npm run push:test
ADMIN_EMAIL=someone@aadrila.com npm run list:users
```

## Troubleshooting

| Error | Likely cause |
|---|---|
| `unauthorized_client` | Client ID not authorized in Workspace Admin (step 5 of GCP_SETUP) |
| `Not Authorized to access this resource/api` | Scopes in Admin Console don't match scopes in code |
| `invalid_grant: Invalid JWT Signature` | `sa-key.json` is wrong/corrupt — re-download |
| `Domain not found` for `list:users` | Domain mismatch — set `DOMAIN=aadrila.com` |
| `Mail service not enabled` | Test user doesn't have Gmail license |

Once both scripts work, we move to Phase 2 (Firestore + multi-template render + dashboard).
