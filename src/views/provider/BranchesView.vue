<script setup>
import { computed, onMounted, ref } from 'vue'
import businessApi from '@/api/business'
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
const branches = ref([])
const loading = ref(true)
const saving = ref(false)
const formOpen = ref(false)
const editingId = ref(null)
const error = ref('')
const hoursText = ref('')
const form = ref(emptyForm())

function emptyForm() {
  return {
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    timezone: 'Africa/Nairobi',
    currency: 'KES',
    is_active: true,
    is_default: false,
  }
}

const activeCount = computed(() => branches.value.filter((branch) => branch.is_active).length)

async function load() {
  loading.value = true
  try {
    const { data } = await businessApi.listBranches()
    branches.value = data
  } catch {
    // The shared API interceptor reports server/network errors.
  } finally {
    loading.value = false
  }
}

function newBranch() {
  editingId.value = null
  form.value = emptyForm()
  hoursText.value = ''
  error.value = ''
  formOpen.value = true
}

function editBranch(branch) {
  editingId.value = branch.id
  form.value = {
    name: branch.name || '',
    code: branch.code || '',
    address: branch.address || '',
    phone: branch.phone || '',
    email: branch.email || '',
    latitude: branch.latitude ?? '',
    longitude: branch.longitude ?? '',
    timezone: branch.timezone || 'Africa/Nairobi',
    currency: branch.currency || 'KES',
    is_active: Boolean(branch.is_active),
    is_default: Boolean(branch.is_default),
  }
  hoursText.value = branch.opening_hours ? JSON.stringify(branch.opening_hours, null, 2) : ''
  error.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingId.value = null
  error.value = ''
}

async function submit() {
  error.value = ''
  let openingHours
  if (hoursText.value.trim()) {
    try {
      openingHours = JSON.parse(hoursText.value)
      if (!openingHours || Array.isArray(openingHours) || typeof openingHours !== 'object') {
        throw new Error('Opening hours must be a JSON object.')
      }
    } catch (e) {
      error.value = e.message || 'Opening hours must be valid JSON.'
      return
    }
  }

  const payload = {
    ...form.value,
    code: form.value.code.trim() || null,
    address: form.value.address.trim() || null,
    phone: form.value.phone.trim() || null,
    email: form.value.email.trim() || null,
    latitude: form.value.latitude === '' ? null : Number(form.value.latitude),
    longitude: form.value.longitude === '' ? null : Number(form.value.longitude),
    opening_hours: openingHours ?? null,
  }

  saving.value = true
  try {
    if (editingId.value) {
      await businessApi.updateBranch(editingId.value, payload)
      notifications.success('Branch updated.')
    } else {
      await businessApi.createBranch(payload)
      notifications.success('Branch created.')
    }
    closeForm()
    await load()
  } catch (e) {
    const validation = e.response?.data?.errors
    if (validation) {
      error.value = Object.values(validation).flat().join(' ')
    } else {
      error.value = e.response?.data?.message || 'Could not save this branch.'
    }
  } finally {
    saving.value = false
  }
}

async function setDefault(branch) {
  try {
    await businessApi.updateBranch(branch.id, { is_default: true })
    notifications.success(`${branch.name} is now the default branch.`)
    await load()
  } catch {
    // Shared interceptor handles unexpected failures.
  }
}

async function toggleActive(branch) {
  if (branch.is_active && activeCount.value <= 1) {
    notifications.error('Keep at least one branch active.')
    return
  }
  try {
    await businessApi.updateBranch(branch.id, { is_active: !branch.is_active })
    notifications.success(branch.is_active ? 'Branch deactivated.' : 'Branch activated.')
    await load()
  } catch {
    // Shared interceptor handles unexpected failures.
  }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-clay-600">Business management</p>
        <h1 class="mt-1 font-heading text-2xl text-ink sm:text-3xl">Branches</h1>
        <p class="mt-2 max-w-2xl text-sm text-ink-soft">
          Manage your business locations, opening details and default location. Your existing provider profile remains connected.
        </p>
      </div>
      <button
        v-if="!formOpen"
        type="button"
        @click="newBranch"
        class="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink/90"
      >
        + Add branch
      </button>
    </header>

    <section v-if="formOpen" class="mb-6 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <h2 class="font-heading text-xl text-ink">{{ editingId ? 'Edit branch' : 'New branch' }}</h2>
      <form class="mt-4 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
        <label class="grid gap-1 text-sm">
          Branch name *
          <input v-model="form.name" required maxlength="255" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="e.g. Westlands" />
        </label>
        <label class="grid gap-1 text-sm">
          Branch code
          <input v-model="form.code" maxlength="32" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="e.g. WEST" />
        </label>
        <label class="grid gap-1 text-sm sm:col-span-2">
          Address
          <input v-model="form.address" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="Street, estate, town" />
        </label>
        <label class="grid gap-1 text-sm">
          Phone
          <input v-model="form.phone" class="rounded-lg border border-ink/15 px-3 py-2.5" />
        </label>
        <label class="grid gap-1 text-sm">
          Email
          <input v-model="form.email" type="email" class="rounded-lg border border-ink/15 px-3 py-2.5" />
        </label>
        <label class="grid gap-1 text-sm">
          Latitude
          <input v-model="form.latitude" type="number" step="any" class="rounded-lg border border-ink/15 px-3 py-2.5" />
        </label>
        <label class="grid gap-1 text-sm">
          Longitude
          <input v-model="form.longitude" type="number" step="any" class="rounded-lg border border-ink/15 px-3 py-2.5" />
        </label>
        <label class="grid gap-1 text-sm">
          Timezone
          <input v-model="form.timezone" class="rounded-lg border border-ink/15 px-3 py-2.5" />
        </label>
        <label class="grid gap-1 text-sm">
          Currency
          <input v-model="form.currency" maxlength="3" class="rounded-lg border border-ink/15 px-3 py-2.5" />
        </label>
        <label class="grid gap-1 text-sm sm:col-span-2">
          Opening hours (JSON)
          <textarea v-model="hoursText" rows="5" class="rounded-lg border border-ink/15 px-3 py-2.5 font-mono text-xs" placeholder='{"mon":["09:00","18:00"],"tue":["09:00","18:00"]}' />
          <span class="text-xs text-ink-soft">Enter a JSON object with the days and hours. Leave blank if not set.</span>
        </label>
        <div class="flex flex-wrap gap-4 sm:col-span-2">
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="form.is_active" type="checkbox" />
            Active branch
          </label>
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="form.is_default" type="checkbox" />
            Default branch
          </label>
        </div>
        <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{{ error }}</p>
        <div class="flex gap-2 sm:col-span-2">
          <button type="submit" :disabled="saving" class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {{ saving ? 'Saving…' : 'Save branch' }}
          </button>
          <button type="button" @click="closeForm" class="rounded-xl border border-ink/15 px-4 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    </section>

    <section v-if="loading" class="py-16 text-center text-sm text-ink-soft">Loading branches…</section>
    <section v-else-if="!branches.length" class="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
      <h2 class="font-heading text-lg text-ink">No branches yet</h2>
      <p class="mt-2 text-sm text-ink-soft">Add your first location to start managing multiple branches.</p>
      <button type="button" @click="newBranch" class="mt-4 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Add your first branch</button>
    </section>
    <section v-else class="grid gap-4 md:grid-cols-2">
      <article v-for="branch in branches" :key="branch.id" class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-heading text-lg text-ink">{{ branch.name }}</h2>
            <p v-if="branch.code" class="mt-1 text-xs text-ink-soft">Code: {{ branch.code }}</p>
          </div>
          <div class="flex flex-wrap justify-end gap-1">
            <span v-if="branch.is_default" class="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">Default</span>
            <span class="rounded-full px-2 py-1 text-xs font-medium" :class="branch.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'">
              {{ branch.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
        <p v-if="branch.address" class="mt-3 text-sm text-ink-soft">{{ branch.address }}</p>
        <div class="mt-2 space-y-1 text-sm text-ink-soft">
          <p v-if="branch.phone">{{ branch.phone }}</p>
          <p v-if="branch.email">{{ branch.email }}</p>
          <p>{{ branch.currency }} · {{ branch.timezone }}</p>
        </div>
        <div class="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
          <button type="button" @click="editBranch(branch)" class="rounded-lg border border-ink/15 px-3 py-2 text-sm">Edit</button>
          <button v-if="!branch.is_default && branch.is_active" type="button" @click="setDefault(branch)" class="rounded-lg border border-ink/15 px-3 py-2 text-sm">Make default</button>
          <button type="button" @click="toggleActive(branch)" class="rounded-lg border border-ink/15 px-3 py-2 text-sm" :disabled="branch.is_active && activeCount <= 1">
            {{ branch.is_active ? 'Deactivate' : 'Activate' }}
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
