<script setup>
import { computed, onMounted, ref } from 'vue'
import teamApi from '@/api/team'
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
const members = ref([])
const roles = ref({})
const permissions = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const email = ref('')
const role = ref('receptionist')
const customPermissions = ref([])
const editing = ref(null)

const roleOptions = computed(() => Object.keys(roles.value).map(value => ({ value, label: value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) })))
const permissionLabels = {
  'bookings.view': 'View appointments',
  'bookings.manage': 'Manage appointments',
  'pos.access': 'Use point of sale',
  'inventory.view': 'View inventory',
  'inventory.manage': 'Manage stock and transfers',
  'purchasing.manage': 'Manage suppliers and purchasing',
  'reports.view': 'View inventory reports',
  'catalogue.manage': 'Manage services and catalogue',
  'clients.view': 'View client book',
  'branches.view': 'View branches',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [team, roleData] = await Promise.all([teamApi.list(), teamApi.roles()])
    members.value = team.data
    roles.value = roleData.data.roles
    permissions.value = roleData.data.permissions
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load staff. Only the business owner can manage the team.'
  } finally { loading.value = false }
}

function startEdit(member) {
  editing.value = member
  role.value = member.role
  customPermissions.value = member.permissions || [...(roles.value[member.role] || [])]
}
function cancelEdit() { editing.value = null; customPermissions.value = [] }

async function addStaff() {
  error.value = ''
  saving.value = true
  try {
    await teamApi.add({ email: email.value.trim(), role: role.value })
    email.value = ''
    notifications.success('Staff member added.')
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not add this staff member.'
  } finally { saving.value = false }
}

async function saveEdit() {
  if (!editing.value) return
  saving.value = true
  try {
    await teamApi.update(editing.value.id, { role: role.value, permissions: customPermissions.value })
    notifications.success('Staff permissions updated.')
    cancelEdit()
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not update staff permissions.'
  } finally { saving.value = false }
}

async function toggleStatus(member) {
  try {
    await teamApi.update(member.id, { status: member.status === 'active' ? 'inactive' : 'active' })
    notifications.success(member.status === 'active' ? 'Staff access suspended.' : 'Staff access restored.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not update staff status.' }
}

async function removeStaff(member) {
  if (!window.confirm(`Revoke access for ${member.user?.name || member.user?.email}?`)) return
  try {
    await teamApi.remove(member.id)
    notifications.success('Staff access revoked.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not revoke staff access.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6">
      <p class="text-sm font-medium text-clay-600">Business settings</p>
      <h1 class="mt-1 font-heading text-3xl text-ink">Staff & permissions</h1>
      <p class="mt-2 text-sm text-ink-soft">Add existing Flairplace accounts and control what each employee can access.</p>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <section class="mb-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h2 class="font-heading text-xl text-ink">Add staff member</h2>
      <p class="mt-1 text-sm text-ink-soft">The employee must already have a Flairplace account and a verified email address.</p>
      <form class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="addStaff">
        <label class="grid gap-1 text-sm">Account email
          <input v-model="email" type="email" required placeholder="employee@example.com" class="rounded-lg border border-ink/15 px-3 py-2.5" />
        </label>
        <label class="grid gap-1 text-sm">Role
          <select v-model="role" class="rounded-lg border border-ink/15 px-3 py-2.5">
            <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <button :disabled="saving" class="self-end rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Adding…' : 'Add staff' }}</button>
      </form>
    </section>

    <section class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div class="border-b border-ink/10 p-5">
        <h2 class="font-heading text-xl text-ink">Team members</h2>
        <p class="mt-1 text-sm text-ink-soft">{{ members.length }} staff account(s)</p>
      </div>
      <div v-if="loading" class="p-8 text-center text-sm text-ink-soft">Loading team…</div>
      <div v-else-if="!members.length" class="p-8 text-center text-sm text-ink-soft">No staff members have been added yet.</div>
      <div v-else class="divide-y divide-ink/10">
        <article v-for="member in members" :key="member.id" class="p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-ink">{{ member.user?.name || 'Staff member' }}</p>
              <p class="text-sm text-ink-soft">{{ member.user?.email }}</p>
              <p class="mt-1 text-xs capitalize text-ink-soft">{{ member.role.replaceAll('_', ' ') }} · {{ member.status }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium" @click="startEdit(member)">Permissions</button>
              <button class="rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium" @click="toggleStatus(member)">{{ member.status === 'active' ? 'Suspend' : 'Activate' }}</button>
              <button class="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700" @click="removeStaff(member)">Revoke</button>
            </div>
          </div>
          <div v-if="editing?.id === member.id" class="mt-4 rounded-xl bg-paper p-4">
            <label class="mb-3 grid max-w-sm gap-1 text-sm">Role
              <select v-model="role" class="rounded-lg border border-ink/15 bg-white px-3 py-2">
                <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <p class="mb-2 text-sm font-semibold">Allowed actions</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <label v-for="permission in permissions" :key="permission" class="flex items-center gap-2 text-sm">
                <input v-model="customPermissions" type="checkbox" :value="permission" />
                {{ permissionLabels[permission] || permission }}
              </label>
            </div>
            <div class="mt-4 flex gap-2">
              <button :disabled="saving" class="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="saveEdit">Save permissions</button>
              <button class="rounded-lg border border-ink/15 px-4 py-2 text-sm" @click="cancelEdit">Cancel</button>
            </div>
          </div>
        </article>
      </div>
    </section>
    <p class="mt-4 text-xs text-ink-soft">Business owners retain full access. Staff permissions are enforced by the API, not just hidden in the dashboard.</p>
  </main>
</template>
