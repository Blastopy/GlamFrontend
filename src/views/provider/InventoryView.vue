<script setup>
import { onMounted, ref } from 'vue'
import api from '@/api/client'
import inventoryApi from '@/api/inventory'
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
const branches = ref([])
const branchId = ref('')
const items = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const form = ref({ name: '', sku: '', category: '', unit: 'piece', cost_price: 0, selling_price: 0, reorder_level: 0 })

const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data: business } = await api.get('/business/branches')
    branches.value = Array.isArray(business) ? business : (business.data || [])
    if (!branchId.value && branches.value.length) branchId.value = String((branches.value.find(b => b.is_default) || branches.value[0]).id)
    if (branchId.value) {
      const { data } = await inventoryApi.list({ branch_id: branchId.value })
      items.value = data.items || []
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load inventory.'
  } finally { loading.value = false }
}

async function createItem() {
  if (!form.value.name.trim()) { error.value = 'Enter an item name.'; return }
  saving.value = true
  try {
    await inventoryApi.create({ ...form.value })
    form.value = { name: '', sku: '', category: '', unit: 'piece', cost_price: 0, selling_price: 0, reorder_level: 0 }
    notifications.success('Inventory item created.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not create item.' }
  finally { saving.value = false }
}

async function adjust(item) {
  const raw = window.prompt('Enter stock change for ' + item.name + ' (use a negative number to remove stock):')
  if (raw === null) return
  const change = Number(raw)
  if (!Number.isFinite(change) || change === 0) { error.value = 'Enter a non-zero quantity.'; return }
  const notes = window.prompt('Reason for stock adjustment:')
  if (!notes?.trim()) return
  try {
    await inventoryApi.adjust(item.id, { branch_id: Number(branchId.value), quantity_change: change, notes: notes.trim() })
    notifications.success('Stock updated.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not update stock.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p class="text-sm font-medium text-clay-600">Business operations</p><h1 class="mt-1 font-heading text-3xl text-ink">Inventory</h1><p class="mt-2 text-sm text-ink-soft">Manage products, branch quantities and stock adjustments.</p></div>
      <label class="grid gap-1 text-sm">Branch
        <select v-model="branchId" @change="load" class="rounded-xl border border-ink/15 bg-white px-3 py-2.5">
          <option v-for="b in branches" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
        </select>
      </label>
    </header>
    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <div class="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section class="h-fit rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="font-heading text-xl">Add inventory item</h2>
        <form class="mt-4 grid gap-3" @submit.prevent="createItem">
          <label class="grid gap-1 text-sm">Item name<input v-model="form.name" required class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm">SKU<input v-model="form.sku" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <label class="grid gap-1 text-sm">Category<input v-model="form.category" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm">Unit<input v-model="form.unit" required class="rounded-lg border border-ink/15 px-3 py-2" placeholder="piece, bottle..." /></label>
            <label class="grid gap-1 text-sm">Reorder level<input v-model.number="form.reorder_level" type="number" min="0" step="0.001" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm">Cost (KES)<input v-model.number="form.cost_price" type="number" min="0" step="0.01" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <label class="grid gap-1 text-sm">Selling price (KES)<input v-model.number="form.selling_price" type="number" min="0" step="0.01" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          </div>
          <button :disabled="saving || !branches.length" class="rounded-xl bg-ink px-4 py-3 font-semibold text-white disabled:opacity-40">{{ saving ? 'Saving…' : 'Add item' }}</button>
        </form>
      </section>
      <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <div class="flex items-center justify-between"><h2 class="font-heading text-xl">Branch stock</h2><span class="text-sm text-ink-soft">{{ items.length }} items</span></div>
        <div v-if="loading" class="py-10 text-center text-ink-soft">Loading inventory…</div>
        <div v-else class="mt-4 space-y-3">
          <article v-for="item in items" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 p-3">
            <div class="min-w-0"><p class="font-semibold">{{ item.name }}</p><p class="text-xs text-ink-soft">{{ item.sku || 'No SKU' }} · {{ item.category || 'Uncategorised' }} · {{ money(item.selling_price) }}</p><p class="mt-1 text-sm">In stock: <strong>{{ item.stock_quantity }} {{ item.unit }}</strong></p></div>
            <div class="flex items-center gap-2"><span v-if="item.is_low_stock" class="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Low stock</span><button @click="adjust(item)" class="rounded-lg border border-ink/15 px-3 py-2 text-sm font-semibold">Adjust</button></div>
          </article>
          <p v-if="!items.length" class="py-8 text-center text-sm text-ink-soft">No inventory items yet.</p>
        </div>
      </section>
    </div>
  </main>
</template>
