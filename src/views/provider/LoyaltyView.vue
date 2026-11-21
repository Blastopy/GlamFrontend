<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import loyaltyApi from '@/api/loyalty'

const settings = reactive({ is_enabled: false, spend_per_point: 100, point_value: 1, minimum_redemption_points: 100 })
const customers = ref([])
const selected = ref(null)
const history = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)
const totalPoints = computed(() => customers.value.reduce((sum, c) => sum + Number(c.points_balance || 0), 0))
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [config, list] = await Promise.all([loyaltyApi.settings(), loyaltyApi.customers()])
    Object.assign(settings, config.data)
    customers.value = list.data.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load loyalty rewards.'
  } finally { loading.value = false }
}

async function save() {
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    const { data } = await loyaltyApi.updateSettings({
      is_enabled: settings.is_enabled,
      spend_per_point: Number(settings.spend_per_point),
      point_value: Number(settings.point_value),
      minimum_redemption_points: Number(settings.minimum_redemption_points),
    })
    Object.assign(settings, data)
    saved.value = true
  } catch (e) {
    error.value = e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Could not save loyalty settings.'
  } finally { saving.value = false }
}

async function showHistory(customer) {
  selected.value = customer
  error.value = ''
  try {
    const { data } = await loyaltyApi.history(customer.id)
    history.value = data.transactions.data || []
    selected.value = { ...customer, points_balance: data.points_balance }
  } catch (e) { error.value = e.response?.data?.message || 'Could not load customer history.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6">
      <p class="text-sm font-medium text-clay-600">Customer retention</p>
      <h1 class="mt-1 font-heading text-3xl text-ink">Loyalty rewards</h1>
      <p class="mt-2 text-sm text-ink-soft">Reward repeat customers with points earned on fully paid POS sales.</p>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <p v-if="saved" class="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">Loyalty settings saved.</p>

    <section class="mb-6 grid gap-3 sm:grid-cols-3">
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Customers with loyalty accounts</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ customers.length }}</p></article>
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Points balance in listed accounts</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ totalPoints.toLocaleString() }}</p></article>
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Program status</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ settings.is_enabled ? 'Active' : 'Disabled' }}</p></article>
    </section>

    <form @submit.prevent="save" class="mb-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 class="font-heading text-xl text-ink">Program settings</h2><p class="mt-1 text-sm text-ink-soft">Changes apply to future eligible sales.</p></div>
        <label class="flex items-center gap-2 text-sm font-semibold text-ink"><input v-model="settings.is_enabled" type="checkbox" class="rounded" /> Enable loyalty</label>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="grid gap-1 text-sm">Spend required per point (KES)<input v-model.number="settings.spend_per_point" type="number" min="0.01" step="0.01" required class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Value per point (KES)<input v-model.number="settings.point_value" type="number" min="0.01" step="0.01" required class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Minimum points to redeem<input v-model.number="settings.minimum_redemption_points" type="number" min="1" step="1" required class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
      </div>
      <p class="mt-3 text-xs text-ink-soft">Example: at KES 100 per point, a fully paid KES 1,000 sale earns 10 points. Redemption is not enabled in this phase.</p>
      <div class="mt-4 flex justify-end"><button :disabled="saving" type="submit" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save settings' }}</button></div>
    </form>

    <section class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Customer points</h2><p class="mt-1 text-xs text-ink-soft">Balances are calculated from the loyalty transaction ledger.</p></div>
      <p v-if="loading" class="p-8 text-center text-sm text-ink-soft">Loading customers…</p>
      <p v-else-if="!customers.length" class="p-8 text-center text-sm text-ink-soft">No business customers yet. Add customers to POS sales to start earning points.</p>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[620px] text-left text-sm">
        <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Customer</th><th class="px-4 py-3">Phone</th><th class="px-4 py-3">Points balance</th><th class="px-4 py-3"></th></tr></thead>
        <tbody class="divide-y divide-ink/10"><tr v-for="customer in customers" :key="customer.id">
          <td class="px-4 py-3 font-semibold text-ink">{{ customer.name }}</td><td class="px-4 py-3">{{ customer.phone || '—' }}</td><td class="px-4 py-3 font-semibold">{{ Number(customer.points_balance || 0).toLocaleString() }}</td>
          <td class="px-4 py-3 text-right"><button type="button" @click="showHistory(customer)" class="text-xs font-semibold text-clay-700 hover:underline">View history</button></td>
        </tr></tbody>
      </table></div>
    </section>

    <section v-if="selected" class="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-5">
        <div><h2 class="font-heading text-xl text-ink">{{ selected.name }} — rewards history</h2><p class="mt-1 text-sm text-ink-soft">{{ selected.phone || 'No phone number' }} · {{ Number(selected.points_balance || 0).toLocaleString() }} points</p></div>
        <button type="button" @click="selected = null; history = []" class="rounded-lg border border-ink/15 px-3 py-2 text-sm">Close</button>
      </div>
      <p v-if="!history.length" class="p-6 text-sm text-ink-soft">No loyalty transactions recorded.</p>
      <div v-else class="divide-y divide-ink/10">
        <div v-for="entry in history" :key="entry.id" class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
          <div><p class="font-semibold text-ink">{{ entry.description || entry.type }}</p><p class="text-xs text-ink-soft">{{ new Date(entry.created_at).toLocaleString() }}</p></div>
          <span :class="Number(entry.points) < 0 ? 'font-semibold text-red-700' : 'font-semibold text-green-700'">{{ Number(entry.points) > 0 ? '+' : '' }}{{ entry.points }} points</span>
        </div>
      </div>
    </section>
  </main>
</template>
