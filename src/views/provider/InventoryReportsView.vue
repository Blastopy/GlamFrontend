<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api/client'
import reportsApi from '@/api/inventory-reports'

const branches = ref([])
const branchId = ref('')
const from = ref('')
const to = ref('')
const report = ref({ currency: 'KES', stock_value: 0, stock_line_count: 0, low_stock_count: 0, low_stock_items: [], movement_totals: [], recent_movements: [] })
const loading = ref(false)
const error = ref('')
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: report.value.currency || 'KES' }).format(Number(value || 0))
const hasFilters = computed(() => Boolean(from.value || to.value))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (branchId.value) params.branch_id = Number(branchId.value)
    if (from.value) params.from = from.value
    if (to.value) params.to = to.value
    const { data } = await reportsApi.summary(params)
    report.value = data
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load inventory reports.'
  } finally { loading.value = false }
}

async function loadBranches() {
  try {
    const { data } = await api.get('/business/branches')
    branches.value = Array.isArray(data) ? data : (data.data || [])
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load branches.'
  }
}

function resetFilters() {
  from.value = ''
  to.value = ''
  branchId.value = ''
  load()
}

watch([branchId, from, to], load)
onMounted(async () => { await loadBranches(); await load() })
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6">
      <p class="text-sm font-medium text-clay-600">Business operations</p>
      <h1 class="mt-1 font-heading text-3xl text-ink">Inventory reports</h1>
      <p class="mt-2 text-sm text-ink-soft">Monitor stock value, low-stock items and inventory movements across branches.</p>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <section class="mb-6 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:grid-cols-4">
      <label class="grid gap-1 text-sm">Branch
        <select v-model="branchId" class="rounded-lg border border-ink/15 px-3 py-2.5">
          <option value="">All branches</option>
          <option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">From
        <input v-model="from" type="date" class="rounded-lg border border-ink/15 px-3 py-2.5" />
      </label>
      <label class="grid gap-1 text-sm">To
        <input v-model="to" type="date" :min="from || undefined" class="rounded-lg border border-ink/15 px-3 py-2.5" />
      </label>
      <div class="flex items-end">
        <button type="button" @click="resetFilters" class="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm font-semibold">Clear filters</button>
      </div>
    </section>

    <p v-if="loading" class="rounded-xl border border-ink/10 bg-white p-6 text-center text-sm text-ink-soft">Loading report…</p>
    <template v-else>
      <section class="mb-6 grid gap-3 sm:grid-cols-3">
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Stock value</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ money(report.stock_value) }}</p>
          <p class="mt-1 text-xs text-ink-soft">Current stock at weighted-average cost</p>
        </article>
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Stock lines</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ Number(report.stock_line_count || 0).toLocaleString() }}</p>
          <p class="mt-1 text-xs text-ink-soft">Item and branch balances</p>
        </article>
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Low-stock alerts</p>
          <p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ Number(report.low_stock_count || 0).toLocaleString() }}</p>
          <p class="mt-1 text-xs text-ink-soft">At or below reorder level</p>
        </article>
      </section>

      <section class="mb-6 grid gap-6 lg:grid-cols-2">
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 class="font-heading text-xl text-ink">Reorder alerts</h2>
          <div v-if="!report.low_stock_items?.length" class="py-6 text-center text-sm text-ink-soft">No low-stock items for this selection.</div>
          <div v-else class="mt-3 divide-y divide-ink/10">
            <div v-for="item in report.low_stock_items" :key="item.branch_id + '-' + item.inventory_item_id" class="flex items-center justify-between gap-3 py-3">
              <div><p class="font-semibold text-ink">{{ item.item_name }}</p><p class="text-xs text-ink-soft">{{ item.branch_name }} · Reorder at {{ item.reorder_level }} {{ item.unit }}</p></div>
              <p class="shrink-0 text-sm font-semibold text-red-700">{{ item.quantity_on_hand }} {{ item.unit }}</p>
            </div>
          </div>
        </article>
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 class="font-heading text-xl text-ink">Movement summary</h2>
          <div v-if="!report.movement_totals?.length" class="py-6 text-center text-sm text-ink-soft">No stock movements in this period.</div>
          <div v-else class="mt-3 divide-y divide-ink/10">
            <div v-for="row in report.movement_totals" :key="row.movement_type" class="flex items-center justify-between gap-3 py-3">
              <div><p class="font-semibold capitalize text-ink">{{ String(row.movement_type).replaceAll('_', ' ') }}</p><p class="text-xs text-ink-soft">{{ row.movement_count }} movements</p></div>
              <p class="text-sm font-semibold text-ink">{{ Number(row.net_quantity || 0).toLocaleString() }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Recent stock movements</h2><p class="mt-1 text-xs text-ink-soft">Latest 100 movements matching the selected filters</p></div>
        <div v-if="!report.recent_movements?.length" class="p-8 text-center text-sm text-ink-soft">No movements found.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[680px] text-left text-sm">
            <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Date</th><th class="px-4 py-3">Item</th><th class="px-4 py-3">Branch</th><th class="px-4 py-3">Type</th><th class="px-4 py-3 text-right">Change</th><th class="px-4 py-3">User</th></tr></thead>
            <tbody class="divide-y divide-ink/10">
              <tr v-for="move in report.recent_movements" :key="move.id">
                <td class="whitespace-nowrap px-4 py-3">{{ new Date(move.created_at).toLocaleString() }}</td>
                <td class="px-4 py-3 font-medium">{{ move.item?.name || 'Inventory item' }}</td>
                <td class="px-4 py-3">{{ move.branch?.name || '—' }}</td>
                <td class="px-4 py-3 capitalize">{{ String(move.movement_type).replaceAll('_', ' ') }}</td>
                <td class="px-4 py-3 text-right font-semibold" :class="Number(move.quantity_change) < 0 ? 'text-red-700' : 'text-green-700'">{{ Number(move.quantity_change) > 0 ? '+' : '' }}{{ move.quantity_change }}</td>
                <td class="px-4 py-3">{{ move.user?.name || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>
