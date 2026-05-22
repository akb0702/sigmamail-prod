# GCP + Workspace Setup

GCP project: **`aadrila-sigmasign`**
Test target: **`akbar@aadrila.com`**

You must do these steps by hand in the consoles — they cannot be scripted by Claude.

---

## Phase 1: Domain-Wide Delegation (Gmail signature push)

### 1. Enable APIs

Go to https://console.cloud.google.com/apis/library?project=aadrila-sigmasign and enable:

- **Gmail API**
- **Admin SDK API**

### 2. Create the service account

1. https://console.cloud.google.com/iam-admin/serviceaccounts?project=aadrila-sigmasign
2. **Create Service Account** → Name: `signature-pusher` → **Create and Continue** → skip roles → **Done**

### 3. Generate a JSON key

1. Click `signature-pusher@aadrila-sigmasign.iam.gserviceaccount.com`
2. **Keys** tab → **Add Key** → **Create new key** → **JSON** → Create
3. Save the downloaded file as `server/sa-key.json` (gitignored — never commit)

### 4. Note the Client ID for delegation

On the service account **Details** tab → **Advanced settings** → copy **OAuth 2 Client ID**.

### 5. Authorize domain-wide delegation in Workspace Admin

1. https://admin.google.com → **Security** → **Access and data control** → **API controls**
2. **Manage Domain Wide Delegation** → **Add new**
3. Paste the **Client ID** from step 4
4. **OAuth scopes** (comma-separated):
   ```
   https://www.googleapis.com/auth/gmail.settings.basic,https://www.googleapis.com/auth/admin.directory.user.readonly
   ```
5. **Authorize**

---

## Phase 2: Firestore (template & audit storage)

### 6. Enable Firestore

1. https://console.cloud.google.com/firestore?project=aadrila-sigmasign
2. **Create database** → **Native mode** → region close to your team → **Create**

### 7. Grant Firestore access to the service account

1. https://console.cloud.google.com/iam-admin/iam?project=aadrila-sigmasign
2. Find `signature-pusher@aadrila-sigmasign.iam.gserviceaccount.com` (click the pencil)
3. **Add another role** → **Cloud Datastore User** (covers Firestore read/write) → Save

---

## Phase 3: OAuth Web Client (admin sign-in)

### 8. Create an OAuth consent screen

If you haven't already:

1. https://console.cloud.google.com/apis/credentials/consent?project=aadrila-sigmasign
2. **User type**: Internal (restricts sign-in to your Workspace org) → Create
3. App name: `Aadrila Signature Manager` · support email: yours · save

### 9. Create the OAuth Client ID

1. https://console.cloud.google.com/apis/credentials?project=aadrila-sigmasign
2. **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `signatures-web`
5. **Authorized JavaScript origins**: add every origin you'll sign in from, e.g.
   - `http://localhost:5173` (dev)
   - `https://signatures.aadrila.com` (prod, once deployed)
6. **Authorized redirect URIs**: leave empty (we use Google Identity Services in implicit/credential mode)
7. Create → copy the **Client ID** (looks like `123456789-xyz.apps.googleusercontent.com`)

### 10. Wire the client ID into both apps

Create `.env` files from the `.env.example` templates:

```
# at repo root
VITE_GOOGLE_CLIENT_ID=123456789-xyz.apps.googleusercontent.com
```

```
# in server/
OAUTH_CLIENT_ID=123456789-xyz.apps.googleusercontent.com
```

### 11. Seed the first admin

The dashboard rejects sign-in from any email not in the Firestore `admins/` collection. Bootstrap yourself with:

```bash
cd server
npm run seed:admin -- akbar@aadrila.com
```

You can add more admins later via the dashboard or by re-running this script.

---

## Verify

You should have:

- [ ] `server/sa-key.json` (gitignored)
- [ ] Gmail API + Admin SDK + Firestore enabled
- [ ] Service account with DWD authorized in Workspace Admin
- [ ] Service account has `roles/datastore.user`
- [ ] OAuth Client ID created with `http://localhost:5173` (and any prod origin) authorized
- [ ] `.env` set on both repo root and `server/` with the same `*_GOOGLE_CLIENT_ID`
- [ ] At least one entry seeded in Firestore `admins/` collection

When all six are done, see `server/README.md` to run the API.
