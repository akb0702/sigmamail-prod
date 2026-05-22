<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UilCheckCircle from '~icons/uil/check-circle'
import UilExclamationTriangle from '~icons/uil/exclamation-triangle'
import UilRocket from '~icons/uil/rocket'
import UilSave from '~icons/uil/save'

import type { AuditUser, TemplateDoc } from '@/lib/api'

import { api } from '@/lib/api'

const { installed } = useSignatures()

const ADMIN_EMAIL = 'akbar@aadrila.com'

const published = ref<TemplateDoc | null>(null)
const userCount = ref<number | null>(null)
const auditRows = ref<AuditUser[]>([])
const currentAuditVersion = ref<number | null>(null)

const isPushing = ref(false)
const isPublishing = ref(false)
const lastPushResult = ref<{ success: number, failed: number } | null>(null)
const apiError = ref<string | null>(null)

const nextVersion = computed(() => (published.value?.version ?? 0) + 1)
const hasUnpublishedChanges = computed(
  () => !published.value || published.value.templateName !== installed.name,
)
const driftCount = computed(() => auditRows.value.filter(r => r.drift).length)

function buildConfig() {
  const opts = installed.tools.options
  return {
    templateName: installed.name,
    mainColor: opts.mainColor,
    fontFamily: opts.fontFamily,
    fields: {
      showTitle: true,
      showPhone: true,
      showPhoto: !!opts.avatar,
    },
  }
}

async function refreshState() {
  apiError.value = null
  try {
    const [cur, users, audit] = await Promise.all([
      api.getCurrentTemplate(),
      api.listUsers().catch(() => ({ count: null as number | null, users: [] })),
      api.audit().catch(() => ({ currentVersion: null, users: [] as AuditUser[] })),
    ])
    published.value = cur.current
    userCount.value = users.count
    auditRows.value = audit.users
    currentAuditVersion.value = audit.currentVersion
  }
  catch (e: any) {
    apiError.value = `Backend unavailable: ${e?.message ?? e}. Is server/ running on :8080?`
  }
}

async function publish() {
  isPublishing.value = true
  apiError.value = null
  try {
    const { published: doc } = await api.publishTemplate({
      ...buildConfig(),
      publishedBy: ADMIN_EMAIL,
    })
    published.value = doc
  }
  catch (e: any) {
    apiError.value = `Publish failed: ${e?.message ?? e}`
  }
  finally {
    isPublishing.value = false
  }
}

async function pushToAll(dryRun: boolean) {
  if (!published.value)
    return
  isPushing.value = true
  lastPushResult.value = null
  apiError.value = null
  try {
    const res = await api.push({ triggeredBy: ADMIN_EMAIL, dryRun })
    lastPushResult.value = { success: res.success, failed: res.failed }
    await refreshState()
  }
  catch (e: any) {
    apiError.value = `Push failed: ${e?.message ?? e}`
  }
  finally {
    isPushing.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

onMounted(refreshState)
</script>

<template>
  <LayoutsDefault>
    <div class="flex flex-col gap-6">
      <UiAlert
        v-if="apiError"
        variant="destructive"
      >
        <UilExclamationTriangle class="w-4 h-4" />
        <div class="ml-2 text-sm">
          {{ apiError }}
        </div>
      </UiAlert>

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
                by {{ published.publishedBy }} · {{ formatDate(published.publishedAt) }}
              </span>
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
            :disabled="!hasUnpublishedChanges || isPublishing"
            @click="publish"
          >
            <span v-if="isPublishing">Publishing…</span>
            <span v-else>Publish as v{{ nextVersion }}</span>
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
          Each user's signature is rendered with their own Workspace Directory data.
        </p>
        <div class="flex items-center gap-3">
          <UiButton
            variant="default"
            :disabled="!published || isPushing"
            @click="pushToAll(false)"
          >
            <span v-if="isPushing">Pushing…</span>
            <span v-else>
              Push to all<span v-if="userCount !== null"> {{ userCount }}</span> users
            </span>
          </UiButton>
          <UiButton
            variant="outline"
            :disabled="!published || isPushing"
            @click="pushToAll(true)"
          >
            Dry run
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
        </div>
      </section>

      <section class="border rounded-md p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">
            Audit
          </h2>
          <span class="text-xs text-muted-foreground">
            Current v{{ currentAuditVersion ?? '—' }} ·
            <span
              v-if="driftCount"
              class="text-amber-600 dark:text-amber-400"
            >
              {{ driftCount }} drifted
            </span>
            <span
              v-else
              class="text-emerald-600 dark:text-emerald-400"
            > All in sync </span>
          </span>
        </div>
        <div
          v-if="!auditRows.length"
          class="text-sm text-muted-foreground italic"
        >
          No push history yet. Push the published template to populate the audit log.
        </div>
        <table
          v-else
          class="w-full text-sm"
        >
          <thead class="text-xs text-muted-foreground border-b">
            <tr>
              <th class="text-left py-2">
                User
              </th>
              <th class="text-left py-2">
                Version
              </th>
              <th class="text-left py-2">
                Last applied
              </th>
              <th class="text-left py-2">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in auditRows"
              :key="row.email"
              class="border-b last:border-b-0"
            >
              <td class="py-2 font-mono text-xs">
                {{ row.email }}
              </td>
              <td class="py-2">
                <span v-if="row.appliedVersion !== null">v{{ row.appliedVersion }}</span>
                <span
                  v-else
                  class="text-muted-foreground"
                >—</span>
              </td>
              <td class="py-2 text-muted-foreground">
                {{ row.appliedAt ? formatDate(row.appliedAt) : '—' }}
              </td>
              <td class="py-2">
                <span
                  v-if="row.lastError"
                  class="text-red-600 dark:text-red-400"
                >
                  {{ row.lastError }}
                </span>
                <span
                  v-else-if="row.drift"
                  class="text-amber-600 dark:text-amber-400"
                >
                  Drifted
                </span>
                <span
                  v-else
                  class="text-emerald-600 dark:text-emerald-400"
                > In sync </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </LayoutsDefault>
</template>
