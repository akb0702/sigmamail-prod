# Deploy to Cloud Run

Deploys the Vue SPA + Fastify API as a single Cloud Run service. Frontend is served from the same origin as the API, so no CORS/cookie headaches.

GCP project: **`aadrila-sigmasign`**
Recommended URL: **`https://signatures.aadrila.com`**

---

## 0. Prerequisites

You already completed [`server/GCP_SETUP.md`](./server/GCP_SETUP.md) phases 1–3:

- Service account `signature-pusher` exists with DWD authorized
- Firestore native-mode database exists with `roles/datastore.user` granted
- OAuth Web Client ID exists

Install once on your laptop:

```bash
gcloud auth login
gcloud config set project aadrila-sigmasign
gcloud auth configure-docker
```

---

## 1. Upload the service account key to Secret Manager

The container should never have `sa-key.json` baked in. Mount it from Secret Manager instead.

```bash
gcloud services enable secretmanager.googleapis.com

gcloud secrets create sa-key \
  --replication-policy=automatic \
  --data-file=server/sa-key.json

# Grant the Cloud Run runtime SA permission to read it
gcloud secrets add-iam-policy-binding sa-key \
  --member="serviceAccount:signature-pusher@aadrila-sigmasign.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

> When you rotate the key later: `gcloud secrets versions add sa-key --data-file=server/sa-key.json` and redeploy.

---

## 2. Build the image

The frontend Client ID is baked in at build time, so pass it as a build-arg:

```bash
gcloud builds submit \
  --tag gcr.io/aadrila-sigmasign/signatures:latest \
  --substitutions=_OAUTH_CLIENT_ID=123456789-xyz.apps.googleusercontent.com \
  --config=- <<'EOF'
steps:
- name: gcr.io/cloud-builders/docker
  args: ['build',
         '--build-arg', 'VITE_GOOGLE_CLIENT_ID=$_OAUTH_CLIENT_ID',
         '-t', 'gcr.io/aadrila-sigmasign/signatures:latest',
         '.']
images: ['gcr.io/aadrila-sigmasign/signatures:latest']
EOF
```

(Or just `docker build --build-arg VITE_GOOGLE_CLIENT_ID=... -t gcr.io/aadrila-sigmasign/signatures:latest . && docker push gcr.io/...` if you'd rather build locally.)

---

## 3. Deploy the Cloud Run service

```bash
gcloud run deploy signatures \
  --image=gcr.io/aadrila-sigmasign/signatures:latest \
  --region=asia-south1 \
  --platform=managed \
  --service-account=signature-pusher@aadrila-sigmasign.iam.gserviceaccount.com \
  --update-secrets=/secrets/sa-key.json=sa-key:latest \
  --set-env-vars=SA_KEY_PATH=/secrets/sa-key.json,OAUTH_CLIENT_ID=123456789-xyz.apps.googleusercontent.com,ADMIN_EMAIL=akbar@aadrila.com,DOMAIN=aadrila.com,GCP_PROJECT_ID=aadrila-sigmasign \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3 \
  --cpu=1 --memory=512Mi
```

> `--allow-unauthenticated` exposes the URL publicly — the OAuth gate on the API is what actually protects `/api/push` and friends. The static frontend has no secrets in it.

After the first deploy, Cloud Run prints a URL like `https://signatures-xxxxx-as.a.run.app`. Open it — you should see the sign-in screen.

---

## 4. Map your custom domain

```bash
gcloud beta run domain-mappings create \
  --service=signatures \
  --domain=signatures.aadrila.com \
  --region=asia-south1
```

It prints a list of DNS records — add them in your DNS provider for `aadrila.com`. Propagation takes a few minutes.

**Important:** once `signatures.aadrila.com` is live, go back to https://console.cloud.google.com/apis/credentials → your OAuth Web Client → add `https://signatures.aadrila.com` to **Authorized JavaScript origins**.

---

## 5. Redeploys

```bash
# rebuild and push image
docker build --build-arg VITE_GOOGLE_CLIENT_ID=... -t gcr.io/aadrila-sigmasign/signatures:latest .
docker push gcr.io/aadrila-sigmasign/signatures:latest

# roll out
gcloud run services update signatures --image=gcr.io/aadrila-sigmasign/signatures:latest --region=asia-south1
```

Or wire up a Cloud Build trigger on the `master` branch for auto-deploy on merge.

---

## Smoke test

```bash
SERVICE_URL=https://signatures.aadrila.com  # or the *.run.app URL

curl -s $SERVICE_URL/health                   # → {"status":"ok"}
curl -s $SERVICE_URL/api/me                   # → {"admin":null}
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST $SERVICE_URL/api/push                # → 401 (missing bearer)
```

Then visit `$SERVICE_URL/publish` in a browser, sign in with a seeded admin, and publish + dry-run + push.

---

## Cost note

With `--min-instances=0` and a small team, this stays inside the Cloud Run free tier (2M requests, 360k GB-s, 180k vCPU-s per month). Firestore is also generously free at this scale. Realistic monthly cost: **\$0**, possibly **\$1–2** if your team grows past a few hundred members.
