<script setup lang="ts">
import { computed, ref } from 'vue'
import UilCheckCircle from '~icons/uil/check-circle'
import UilExclamationTriangle from '~icons/uil/exclamation-triangle'
import UilRocket from '~icons/uil/rocket'
import UilSave from '~icons/uil/save'

const { installed } = useSignatures()

interface PublishedVersion {
  version: number
  templateName: string
  publishedAt: string
  publishedBy: string
}

const STORAGE_KEY = 'aadrila-published-version'

function loadPublished(): PublishedVersion | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  }
  catch {
    return null
  }
}

const published = ref<PublishedVersion | null>(loadPublished())
const isPushing = ref(false)
const lastPushResult = ref<{ success: number, failed: number } | null>(null)

const nextVersion = computed(() => (published.value?.version ?? 0) + 1)
const hasUnpublishedChanges = computed(
  () => !published.value || published.value.templateName !== installed.name,
)

function publish() {
  const v: PublishedVersion = {
    version: nextVersion.value,
    templateName: installed.name,
    publishedAt: new Date().toISOString(),
    publishedBy: 'akbar@aadrila.com',
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  published.value = v
}

async function pushToAll() {
  if (!published.value)
    return
  isPushing.value = true
  lastPushResult.value = null
  // TODO Phase 2b: POST /api/push  → server calls Gmail API for each user
  await new Promise(r => setTimeout(r, 1500))
  isPushing.value = false
  lastPushResult.value = { success: 23, failed: 0 }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <LayoutsDefault>
    <div class="flex flex-col gap-6">
      <UiAlert>
        <UilRocket class="w-4 h-4" />
        <div class="ml-2">
          <div class="font-medium mb-1">
            Admin publish &amp; push
          </div>
          <p class="text-sm text-muted-foreground">
            Customize the signature in the Basic / Social / Options / Addons / Templates tabs, then
            come back here to publish a new version and push it to every
            <code class="px-1 py-0.5 bg-muted rounded text-xs">@aadrila.com</code> mailbox via the
            Gmail API.
          </p>
        </div>
      </UiAlert>

      <section class="border rounded-md p-5">
        <h2 class="text-base font-semibold mb-3 flex items-center gap-2">
          <UilSave class="w-4 h-4" /> Current configuration
        </h2>
        <dl class="text-sm grid grid-cols-[140px_1fr] gap-y-2">
          <dt class="text-muted-foreground">
            Template
          </dt>
          <dd class="font-mono">
            {{ installed.name }}
          </dd>
          <dt class="text-muted-foreground">
            Last published
          </dt>
          <dd>
            <span v-if="published">
              v{{ published.version }} ({{ published.templateName }})
              <span class="text-muted-foreground">
                by {{ published.publishedBy }} · {{ formatDate(published.publishedAt) }}</span>
            </span>
            <span
              v-else
              class="text-muted-foreground italic"
            > Never published </span>
          </dd>
          <dt class="text-muted-foreground">
            Status
          </dt>
          <dd>
            <span
              v-if="hasUnpublishedChanges"
              class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm"
            >
              <UilExclamationTriangle class="w-4 h-4" /> Unpublished changes
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm"
            >
              <UilCheckCircle class="w-4 h-4" /> Up to date
            </span>
          </dd>
        </dl>
        <div class="mt-5 flex gap-2">
          <UiButton
            :disabled="!hasUnpublishedChanges"
            @click="publish"
          >
            Publish as v{{ nextVersion }}
          </UiButton>
        </div>
      </section>

      <section class="border rounded-md p-5">
        <h2 class="text-base font-semibold mb-3 flex items-center gap-2">
          <UilRocket class="w-4 h-4" /> Push to domain
        </h2>
        <p class="text-sm text-muted-foreground mb-4">
          Sends the published signature to every user in
          <code class="px-1 py-0.5 bg-muted rounded text-xs">aadrila.com</code> via the Gmail API.
          Each user's signature is rendered with their own Workspace Directory data (name, title,
          phone). Users do not need to do anything.
        </p>
        <div class="flex items-center gap-3">
          <UiButton
            variant="default"
            :disabled="!published || isPushing"
            @click="pushToAll"
          >
            <span v-if="isPushing">Pushing…</span>
            <span v-else>Push to all 23 users</span>
          </UiButton>
          <span
            v-if="!published"
            class="text-sm text-muted-foreground"
          >
            Publish a version first.
          </span>
        </div>

        <div
          v-if="lastPushResult"
          class="mt-5 text-sm border rounded-md p-3"
        >
          <div class="font-medium mb-1">
            Last push result
          </div>
          <div class="text-emerald-600 dark:text-emerald-400">
            ✅ {{ lastPushResult.success }} succeeded
          </div>
          <div
            v-if="lastPushResult.failed"
            class="text-red-600 dark:text-red-400"
          >
            ❌ {{ lastPushResult.failed }} failed
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            (Stubbed — real Gmail API push wires up in Phase 2b.)
          </p>
        </div>
      </section>

      <section class="border rounded-md p-5">
        <h2 class="text-base font-semibold mb-3">
          Audit (preview)
        </h2>
        <p class="text-sm text-muted-foreground">
          Phase 2b will list every
          <code class="px-1 py-0.5 bg-muted rounded text-xs">@aadrila.com</code> user with the
          template version currently on their Gmail account, flagging anyone drifted from the
          published version. Backed by Firestore
          <code class="px-1 py-0.5 bg-muted rounded text-xs">users/</code> and
          <code class="px-1 py-0.5 bg-muted rounded text-xs">pushJobs/</code> collections.
        </p>
      </section>
    </div>
  </LayoutsDefault>
</template>
