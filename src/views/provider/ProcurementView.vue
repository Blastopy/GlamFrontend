<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/api/client'
import inventoryApi from '@/api/inventory'
import procurementApi from '@/api/procurement'
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
const branches = ref([])
const suppliers = ref([])
const inventory = ref([])
const orders = ref([])
const branchId = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const supplierForm = reactive({ name: '', contact_name: '', phone: '', email: '', tax_pin: '' })
const orderForm = reactive({ supplier_id: '', expected_at: '', notes: '' })
const quantities = reactive({})
const costs = reactive({})
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0))
const selectedLines = computed(() => inventory.value
  .filter(item => Number(quantities[item.id] || 0) > 0)
  .map(item => ({ inventory_item_id: item.id, quantity_ordered: Number(quantities[item.id]), unit_cost: Number(costs[item.id] ?? item.cost_price) })))
const orderTotal = computed(() => selectedLines.value.reduce((sum, line) => sum + line.quantity_ordered * line.unit_cost, 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [branchRes, supplierRes] = await Promise.all([
      api.get('/business/branches'),
      procurementApi.suppliers(),
    ])
    branches.value = Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data.data || [])
    suppliers.value = supplierRes.data || []
    if (!branchId.value && branches.value.length) branchId.value = String((branches.value.find(b => b.is_default) || branches.value[0]).id)
    if (branchId.value) {
      const [stockRes, orderRes] = await Promise.all([
        inventoryApi.list({ branch_id: branchId.value }),
        procurementApi.orders({ branch_id: branchId.value }),
      ])
      inventory.value = stockRes.data.items || []
      orders.value = orderRes.data || []
      for (const item of inventory.value) if (costs[item.id] === undefined) costs[item.id] = Number(item.cost_price || 0)
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load procurement data.'
  } finally {
    loading.value = false
  }
}

async function addSupplier() {
  if (!supplierForm.name.trim()) return
  saving.value = true
  try {
    const { data } = await procurementApi.createSupplier({ ...supplierForm })
    suppliers.value.push(data)
    orderForm.supplier_id = String(data.id)
    Object.assign(supplierForm, { name: '', contact_name: '', phone: '', email: '', tax_pin: '' })
    notifications.success('Supplier added.')
  } catch (e) { error.value = e.response?.data?.message || 'Could not add supplier.' }
  finally { saving.value = false }
}

async function createOrder() {
  if (!branchId.value || !orderForm.supplier_id || !selectedLines.value.length) {
    error.value = 'Choose a supplier and add at least one inventory item.'
    return
  }
  saving.value = true
  try {
    await procurementApi.createOrder({
      branch_id: Number(branchId.value),
      supplier_id: Number(orderForm.supplier_id),
      expected_at: orderForm.expected_at || null,
      notes: orderForm.notes || null,
      items: selectedLines.value,
    })
    for (const key of Object.keys(quantities)) delete quantities[key]
    Object.assign(orderForm, { supplier_id: '', expected_at: '', notes: '' })
    notifications.success('Draft purchase order created.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not create purchase order.' }
  finally { saving.value = false }
}

async function submitOrder(order) {
  try {
    await procurementApi.submitOrder(order.id)
    notifications.success('Purchase order submitted.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not submit order.' }
}

async function receiveOrder(order) {
  const lines = order.items.filter(line => Number(line.quantity_ordered) > Number(line.quantity_received))
  const payload = []
  for (const line of lines) {
    const remaining = Number(line.quantity_ordered) - Number(line.quantity_received)
    const raw = window.prompt(`Quantity received for ${line.inventory_item?.name || 'item'} (remaining: ${remaining}):`, String(remaining))
    if (raw === null) return
    const quantity = Number(raw)
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > remaining) {
      error.value = 'Enter a quantity greater than zero and no more than the outstanding amount.'
      return
    }
    payload.push({ purchase_order_item_id: line.id, quantity_received: quantity })
  }
  if (!payload.length) return
  try {
    await procurementApi.receiveOrder(order.id, { items: payload })
    notifications.success('Goods received and branch stock updated.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not record goods received.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-clay-600">Business operations</p>
        <h1 class="mt-1 font-heading text-3xl text-ink">Suppliers & purchasing</h1>
        <p class="mt-2 text-sm text-ink-soft">Create purchase orders and record deliveries into branch stock.</p>
      </div>
      <label class="grid gap-1 text-sm">Receiving branch
        <select v-model="branchId" @change="load" class="rounded-xl border border-ink/15 bg-white px-3 py-2.5">
          <option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option>
        </select>
      </label>
    </header>
    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <div v-if="loading" class="rounded-2xl border border-ink/10 bg-white p-10 text-center text-ink-soft">Loading procurement…</div>
    <div v-else class="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <div class="space-y-6">
        <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <h2 class="font-heading text-xl">Add supplier</h2>
          <form class="mt-4 grid gap-3" @submit.prevent="addSupplier">
            <label class="grid gap-1 text-sm">Supplier name<input v-model="supplierForm.name" required class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1 text-sm">Contact person<input v-model="supplierForm.contact_name" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
              <label class="grid gap-1 text-sm">Phone<input v-model="supplierForm.phone" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1 text-sm">Email<input v-model="supplierForm.email" type="email" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
              <label class="grid gap-1 text-sm">KRA PIN<input v-model="supplierForm.tax_pin" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            </div>
            <button :disabled="saving" class="rounded-xl bg-ink px-4 py-3 font-semibold text-white disabled:opacity-40">Save supplier</button>
          </form>
          <div class="mt-5 border-t border-ink/10 pt-4">
            <h3 class="text-sm font-semibold">Registered suppliers ({{ suppliers.length }})</h3>
            <div class="mt-2 space-y-2">
              <div v-for="supplier in suppliers" :key="supplier.id" class="flex items-center justify-between gap-2 rounded-lg bg-paper p-3 text-sm">
                <span class="font-medium">{{ supplier.name }}</span><span class="text-ink-soft">{{ supplier.phone || supplier.email || 'No contact' }}</span>
              </div>
              <p v-if="!suppliers.length" class="text-sm text-ink-soft">No suppliers added yet.</p>
            </div>
          </div>
        </section>
        <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
          <h2 class="font-heading text-xl">Create purchase order</h2>
          <form class="mt-4 grid gap-3" @submit.prevent="createOrder">
            <label class="grid gap-1 text-sm">Supplier
              <select v-model="orderForm.supplier_id" required class="rounded-lg border border-ink/15 bg-white px-3 py-2">
                <option value="" disabled>Select supplier</option>
                <option v-for="supplier in suppliers" :key="supplier.id" :value="String(supplier.id)">{{ supplier.name }}</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">Expected delivery<input v-model="orderForm.expected_at" type="date" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <div class="max-h-72 space-y-2 overflow-y-auto">
              <div v-for="item in inventory" :key="item.id" class="grid grid-cols-[1fr_74px_100px] items-center gap-2 rounded-lg border border-ink/10 p-2">
                <div class="min-w-0"><p class="truncate text-sm font-semibold">{{ item.name }}</p><p class="text-xs text-ink-soft">Stock {{ item.stock_quantity }} {{ item.unit }}</p></div>
                <input v-model.number="quantities[item.id]" type="number" min="0" step="0.001" placeholder="Qty" aria-label="Quantity ordered" class="w-full rounded-lg border border-ink/15 px-2 py-2 text-sm" />
                <input v-model.number="costs[item.id]" type="number" min="0" step="0.01" aria-label="Unit cost in KES" class="w-full rounded-lg border border-ink/15 px-2 py-2 text-sm" />
              </div>
              <p v-if="!inventory.length" class="text-sm text-ink-soft">Create inventory items before making a purchase order.</p>
            </div>
            <label class="grid gap-1 text-sm">Notes<textarea v-model="orderForm.notes" rows="2" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <div class="flex items-center justify-between text-sm"><span class="text-ink-soft">Draft order total</span><strong>{{ money(orderTotal) }}</strong></div>
            <button :disabled="saving || !inventory.length || !suppliers.length" class="rounded-xl bg-clay-600 px-4 py-3 font-semibold text-white disabled:opacity-40">{{ saving ? 'Saving…' : 'Create draft order' }}</button>
          </form>
        </section>
      </div>
      <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <div class="flex items-center justify-between gap-2"><h2 class="font-heading text-xl">Purchase orders</h2><span class="text-sm text-ink-soft">{{ orders.length }} records</span></div>
        <div class="mt-4 space-y-3">
          <article v-for="order in orders" :key="order.id" class="rounded-xl border border-ink/10 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div><p class="font-semibold">{{ order.order_number }}</p><p class="text-sm text-ink-soft">{{ order.supplier?.name }} · {{ order.branch?.name }}</p></div>
              <span class="rounded-full bg-paper px-3 py-1 text-xs font-semibold capitalize">{{ order.status.replaceAll('_', ' ') }}</span>
            </div>
            <div class="mt-3 space-y-1 text-sm">
              <div v-for="line in order.items" :key="line.id" class="flex justify-between gap-3"><span>{{ line.inventory_item?.name }} · {{ line.quantity_received }}/{{ line.quantity_ordered }} received</span><span>{{ money(line.line_total) }}</span></div>
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
              <strong>{{ money(order.subtotal) }}</strong>
              <div class="flex gap-2">
                <button v-if="order.status === 'draft'" @click="submitOrder(order)" class="rounded-lg border border-ink/15 px-3 py-2 text-sm font-semibold">Submit order</button>
                <button v-if="['ordered','partially_received'].includes(order.status)" @click="receiveOrder(order)" class="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white">Record delivery</button>
              </div>
            </div>
          </article>
          <p v-if="!orders.length" class="py-10 text-center text-sm text-ink-soft">No purchase orders for this branch yet.</p>
        </div>
      </section>
    </div>
  </main>
</template>
