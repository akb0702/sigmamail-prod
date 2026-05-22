#!/usr/bin/env bash
# Deploys the Aadrila Signature Manager to Cloud Run.
#
# Prerequisites (one-time):
#   - gcloud CLI installed and authenticated:   gcloud auth login
#   - Default project set:                       gcloud config set project aadrila-sigmasign
#   - server/sa-key.json present at repo root
#   - .env at repo root with VITE_GOOGLE_CLIENT_ID=...   (or pass --client-id)
#
# Usage:
#   ./deploy.sh                              # full deploy with defaults
#   ./deploy.sh --region=us-central1         # override region
#   ./deploy.sh --client-id=<id>             # override OAuth Client ID
#   ./deploy.sh --skip-secret                # skip Secret Manager step (key already uploaded)
#   ./deploy.sh --skip-build                 # skip Cloud Build (reuse :latest)

set -euo pipefail

# ---- defaults ----
PROJECT_ID="${PROJECT_ID:-aadrila-sigmasign}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-signatures}"
SA_EMAIL="${SA_EMAIL:-signature-pusher@${PROJECT_ID}.iam.gserviceaccount.com}"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
ADMIN_EMAIL="${ADMIN_EMAIL:-akbar@aadrila.com}"
DOMAIN="${DOMAIN:-aadrila.com}"
SECRET_NAME="sa-key"

SKIP_SECRET=0
SKIP_BUILD=0
CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"

# ---- arg parse ----
for arg in "$@"; do
  case "$arg" in
    --region=*)        REGION="${arg#*=}" ;;
    --client-id=*)     CLIENT_ID="${arg#*=}" ;;
    --project=*)       PROJECT_ID="${arg#*=}"
                       SA_EMAIL="${SA_EMAIL:-signature-pusher@${PROJECT_ID}.iam.gserviceaccount.com}" ;;
    --sa-email=*)      SA_EMAIL="${arg#*=}" ;;
    --skip-secret)     SKIP_SECRET=1 ;;
    --skip-build)      SKIP_BUILD=1 ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | head -n -1 | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

# ---- helpers ----
say()  { printf "\033[1;36m▸\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; exit 1; }

# ---- prereqs ----
say "Checking prerequisites..."

command -v gcloud >/dev/null || die "gcloud not found. Install: https://cloud.google.com/sdk/docs/install"

gcloud auth print-access-token >/dev/null 2>&1 || die "Not authenticated. Run: gcloud auth login"

CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
  say "Switching gcloud project from '$CURRENT_PROJECT' to '$PROJECT_ID'"
  gcloud config set project "$PROJECT_ID" >/dev/null
fi

# Load .env if present
if [[ -z "$CLIENT_ID" && -f .env ]]; then
  CLIENT_ID="$(grep -E '^VITE_GOOGLE_CLIENT_ID=' .env | cut -d= -f2- | tr -d '"' || true)"
fi

[[ -n "$CLIENT_ID" ]] || die "OAuth Client ID missing. Set VITE_GOOGLE_CLIENT_ID in .env or pass --client-id=..."

if [[ "$SKIP_SECRET" -eq 0 ]]; then
  [[ -f server/sa-key.json ]] || die "server/sa-key.json not found. Download from GCP Console (see server/GCP_SETUP.md step 3)."
fi

ok "Prereqs OK · project=$PROJECT_ID · region=$REGION · service=$SERVICE_NAME"

# ---- 1. Enable required APIs (idempotent) ----
say "Ensuring required APIs are enabled..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  >/dev/null
ok "APIs enabled"

# ---- 2. Upload sa-key.json to Secret Manager ----
if [[ "$SKIP_SECRET" -eq 0 ]]; then
  if gcloud secrets describe "$SECRET_NAME" >/dev/null 2>&1; then
    say "Adding new version of secret '$SECRET_NAME'..."
    gcloud secrets versions add "$SECRET_NAME" --data-file=server/sa-key.json >/dev/null
  else
    say "Creating secret '$SECRET_NAME'..."
    gcloud secrets create "$SECRET_NAME" \
      --replication-policy=automatic \
      --data-file=server/sa-key.json >/dev/null
  fi

  gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None >/dev/null
  ok "Secret '$SECRET_NAME' ready"
else
  say "Skipping secret step (--skip-secret)"
fi

# ---- 3. Build the image via Cloud Build ----
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  say "Building image via Cloud Build (this can take ~3–5 min on the first run)..."

  # Write a temporary cloudbuild.yaml so we can pass the build-arg.
  CB_YAML="$(mktemp)"
  trap 'rm -f "$CB_YAML"' EXIT
  cat > "$CB_YAML" <<EOF
steps:
- name: gcr.io/cloud-builders/docker
  args:
    - build
    - '--build-arg'
    - 'VITE_GOOGLE_CLIENT_ID=${CLIENT_ID}'
    - '-t'
    - '${IMAGE}'
    - '.'
images:
- '${IMAGE}'
options:
  logging: CLOUD_LOGGING_ONLY
EOF

  gcloud builds submit --config="$CB_YAML" .
  ok "Image built: $IMAGE"
else
  say "Skipping build (--skip-build) — reusing existing $IMAGE"
fi

# ---- 4. Deploy to Cloud Run ----
say "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --service-account="$SA_EMAIL" \
  --update-secrets="/secrets/sa-key.json=${SECRET_NAME}:latest" \
  --set-env-vars="SA_KEY_PATH=/secrets/sa-key.json,OAUTH_CLIENT_ID=${CLIENT_ID},ADMIN_EMAIL=${ADMIN_EMAIL},DOMAIN=${DOMAIN},GCP_PROJECT_ID=${PROJECT_ID}" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3 \
  --cpu=1 \
  --memory=512Mi \
  --quiet

URL="$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')"

# ---- 5. Smoke test ----
say "Smoke testing $URL ..."
HEALTH="$(curl -sS "$URL/health" || true)"
if [[ "$HEALTH" == *'"status":"ok"'* ]]; then
  ok "/health returned $HEALTH"
else
  printf "\033[1;33m⚠\033[0m  /health did not return ok (got: %s). Check 'gcloud run services logs read %s --region=%s'\n" "$HEALTH" "$SERVICE_NAME" "$REGION"
fi

echo
ok "Deployed!"
echo
echo "    Dashboard:   $URL/publish"
echo "    Health:      $URL/health"
echo
echo "Next steps:"
echo "  • Add '$URL' to OAuth Web Client's Authorized JavaScript origins:"
echo "    https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "  • If first deploy, seed an admin so you can sign in:"
echo "    (cd server && npm run seed:admin -- $ADMIN_EMAIL)"
echo "  • Optional: map signatures.aadrila.com to this service via"
echo "    'gcloud beta run domain-mappings create --service=$SERVICE_NAME --domain=signatures.aadrila.com --region=$REGION'"
