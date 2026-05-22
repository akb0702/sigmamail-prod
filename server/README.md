# Aadrila Signature Server

Backend API for the Aadrila Signature Manager. Powers `/publish` in the Vue frontend.

## Setup

1. Complete every step in [`GCP_SETUP.md`](./GCP_SETUP.md) (Phase 1 + Phase 2).
2. `server/sa-key.json` must exist (downloaded service account key).
3. Install deps:
   ```bash
   cd server
   npm install
   ```

## Run

```bash
npm run dev     # Fastify on http://localhost:8080 with watch
# in another terminal, at repo root:
bun run dev     # Vite on http://localhost:5173 (proxies /api → :8080)
```

Open http://localhost:5173/publish.

## Standalone scripts (Phase 1 validation)

```bash
npm run list:users   # prints all aadrila.com users via Directory API
npm run push:test    # pushes a hardcoded test signature to akbar@aadrila.com
```

## HTTP API

Protected routes require `Authorization: Bearer <google-id-token>` from a `@aadrila.com` user whose email appears in the Firestore `admins/` collection. The frontend obtains this token via Google Identity Services.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET`  | `/health` | — | Liveness probe |
| `GET`  | `/api/me` | optional | Current admin context (or `{admin:null}` if not signed in) |
| `GET`  | `/api/admins` | required | List admins |
| `POST` | `/api/admins` | required | Add admin (`{email}`) |
| `DELETE` | `/api/admins/:email` | required | Remove admin (can't remove yourself) |
| `GET`  | `/api/users` | required | List Workspace Directory users |
| `GET`  | `/api/templates/current` | — | Currently-published template |
| `GET`  | `/api/templates` | — | History of published versions |
| `POST` | `/api/templates` | required | Publish a new template version |
| `POST` | `/api/push` | required | Render + push current template to every user (`{ dryRun: true }` to skip Gmail call) |
| `GET`  | `/api/audit` | required | Per-user applied version + drift flag |
| `GET`  | `/api/push-jobs` | required | Last 10 push job records |

## Seeding the first admin

The dashboard rejects any sign-in from an email that isn't in Firestore `admins/`. Bootstrap yourself once:

```bash
npm run seed:admin -- akbar@aadrila.com
```

After that, you can manage admins from the dashboard (or via `/api/admins`).

## Firestore data model

```
admins/
  alice@aadrila.com : { email, addedBy, addedAt }

templates/
  current           : { version, templateName, mainColor, fontFamily, fields, publishedAt, publishedBy }
  v1, v2, …         : (same shape) version history

users/
  alice@aadrila.com : { appliedVersion, appliedAt, lastError, lastErrorAt }

pushJobs/
  job-<ts>          : { id, version, triggeredBy, dryRun, startedAt, finishedAt, success, failed, results[] }
```

## Env vars

| Var | Default | Notes |
|---|---|---|
| `PORT` | `8080` | API port |
| `OAUTH_CLIENT_ID` | _(none — protected routes will 401)_ | Google OAuth Web Client ID; same value as frontend `VITE_GOOGLE_CLIENT_ID` |
| `ADMIN_EMAIL` | `akbar@aadrila.com` | User the service account impersonates for Directory calls |
| `DOMAIN` | `aadrila.com` | Workspace domain to list users for |
| `GCP_PROJECT_ID` | `aadrila-sigmasign` | Used for Firestore |

## Not yet wired

- `juice` for CSS inlining (current renderer hand-inlines and is enough for the simple template)
- Cloud Run deployment manifest
- Backend renders the actual Vue templates SSR-style (currently uses its own minimal template)
