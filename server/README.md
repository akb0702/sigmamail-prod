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

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/api/users` | List Workspace Directory users |
| `GET`  | `/api/templates/current` | Currently-published template |
| `GET`  | `/api/templates` | History of published versions |
| `POST` | `/api/templates` | Publish a new template version |
| `POST` | `/api/push` | Render + push current template to every user (`{ dryRun: true }` to skip Gmail call) |
| `GET`  | `/api/audit` | Per-user applied version + drift flag |
| `GET`  | `/api/push-jobs` | Last 10 push job records |

## Firestore data model

```
templates/
  current        : { version, templateName, mainColor, fontFamily, fields, publishedAt, publishedBy }
  v1, v2, …      : (same shape) version history

users/
  alice@aadrila.com: { appliedVersion, appliedAt, lastError, lastErrorAt }

pushJobs/
  job-<ts>       : { id, version, triggeredBy, dryRun, startedAt, finishedAt, success, failed, results[] }
```

## Env vars

| Var | Default | Notes |
|---|---|---|
| `PORT` | `8080` | API port |
| `ADMIN_EMAIL` | `akbar@aadrila.com` | User the service account impersonates for Directory calls |
| `DOMAIN` | `aadrila.com` | Workspace domain to list users for |
| `GCP_PROJECT_ID` | `aadrila-sigmasign` | Used for Firestore |

## Not yet wired (Phase 2c)

- OAuth-gated admin allowlist (any caller can hit `/api/push` right now — local-only)
- CSS inlining via `juice` (the current renderer already inlines styles by hand)
- Cloud Run deployment manifest
