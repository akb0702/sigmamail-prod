# Phase 1: GCP + Workspace Setup (manual steps)

GCP project: **`aadrila-sigmasign`**
Test target: **`akbar@aadrila.com`**

You must do these steps by hand in the consoles — they cannot be scripted by Claude.

---

## 1. Enable APIs

Go to https://console.cloud.google.com/apis/library?project=aadrila-sigmasign and enable:

- **Gmail API**
- **Admin SDK API**

(Search each by name → click Enable.)

---

## 2. Create the service account

1. Open https://console.cloud.google.com/iam-admin/serviceaccounts?project=aadrila-sigmasign
2. Click **Create Service Account**
3. Name: `signature-pusher`
4. ID: `signature-pusher` (autofills)
5. Description: `Pushes signatures to Gmail via domain-wide delegation`
6. Click **Create and Continue** → skip role assignment → **Done**

---

## 3. Generate a JSON key

1. Click the new `signature-pusher@aadrila-sigmasign.iam.gserviceaccount.com` row
2. Tab: **Keys** → **Add Key** → **Create new key** → **JSON** → Create
3. A file downloads (e.g. `aadrila-sigmasign-xxxx.json`) — **save it as `server/sa-key.json`** in this repo
4. It is gitignored — do not commit it

---

## 4. Note the Client ID for delegation

1. Still on the service account page, tab: **Details**
2. Expand **Advanced settings**
3. Copy the **OAuth 2 Client ID** (a long number like `109876543210987654321`)

---

## 5. Authorize domain-wide delegation in Workspace Admin

1. Go to https://admin.google.com → **Security** → **Access and data control** → **API controls**
2. Click **Manage Domain Wide Delegation** (bottom of page)
3. Click **Add new**
4. Paste the **Client ID** from step 4
5. **OAuth scopes** (paste comma-separated):
   ```
   https://www.googleapis.com/auth/gmail.settings.basic,https://www.googleapis.com/auth/admin.directory.user.readonly
   ```
6. Click **Authorize**

---

## 6. Verify

You should now have:

- [ ] `server/sa-key.json` in the repo (gitignored)
- [ ] Gmail API + Admin SDK enabled on `aadrila-sigmasign`
- [ ] Service account exists with DWD enabled
- [ ] Client ID authorized in Workspace Admin with the two scopes

When all four boxes are checked, run the prove-out script (see `server/README.md`).
