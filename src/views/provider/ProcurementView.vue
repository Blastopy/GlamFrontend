<script setup>
import { onMounted, ref } from 'vue'
import api from '@/api/client'
import inventoryApi from '@/api/inventory'
import procurementApi from '@/api/procurement'
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
const branches = ref([])
const branchId = ref('')
const suppliers = ref([])
const inventory = ref([])
const orders = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const supplierForm = ref({ name: '', contact_name: '', phone: '', email: '', tax_number: '' })
const orderForm = ref({ supplier_id: '', inventory_item_id: '', quantity_ordered: 1, unit_cost: 0, expected_at: '', notes: '' })
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/business/branches')
    branches.value = Array.isArray(data) ? data : (data.data || [])
    if (!branchId.value && branches.value.length) branchId.value = String((branches.value.find(b => b.is_default) || branches.value[0]).id)
    const [supplierRes, inventoryRes, orderRes] = await Promise.all([
      procurementApi.suppliers(),
      branchId.value ? inventoryApi.list({ branch_id: branchId.value }) : Promise.resolve({ data: { items: [] } }),
      procurementApi.purchaseOrders(branchId.value ? { branch_id: branchId.value } : {}),
    ])
    suppliers.value = supplierRes.data || []
    inventory.value = inventoryRes.data.items || []
    orders.value = orderRes.data || []
    if (!orderForm.value.supplier_id && suppliers.value.length) orderForm.value.supplier_id = String(suppliers.value[0].id)
    if (!orderForm.value.inventory_item_id && inventory.value.length) orderForm.value.inventory_item_id = String(inventory.value[0].id)
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load procurement data.'
  } finally { loading.value = false }
}

async function createSupplier() {
  if (!supplierForm.value.name.trim()) return
  saving.value = true
  try {
    await procurementApi.createSupplier({ ...supplierForm.value })
    supplierForm.value = { name: '', contact_name: '', phone: '', email: '', tax_number: '' }
    notifications.success('Supplier added.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not add supplier.' }
  finally { saving.value = false }
}

async function createOrder() {
  if (!branchId.value || !orderForm.value.supplier_id || !orderForm.value.inventory_item_id) {
    error.value = 'Select a branch, supplier and inventory item.'
    return
  }
  saving.value = true
  try {
    await procurementApi.createPurchaseOrder({
      branch_id: Number(branchId.value),
      supplier_id: Number(orderForm.value.supplier_id),
      expected_at: orderForm.value.expected_at || null,
      notes: orderForm.value.notes || null,
      items: [{
        inventory_item_id: Number(orderForm.value.inventory_item_id),
        quantity_ordered: Number(orderForm.value.quantity_ordered),
        unit_cost: Number(orderForm.value.unit_cost),
      }],
    })
    notifications.success('Purchase order created.')
    orderForm.value.quantity_ordered = 1
    orderForm.value.notes = ''
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not create purchase order.' }
  finally { saving.value = false }
}

async function receiveOrder(order) {
  const lines = []
  for (const line of order.items || []) {
    const remaining = Number(line.quantity_ordered) - Number(line.quantity_received)
    if (remaining <= 0) continue
    const raw = window.prompt(`Receive quantity for ${line.inventory_item?.name || 'item'} (remaining: ${remaining}):`, String(remaining))
    if (raw === null) return
    const quantity = Number(raw)
    if (!Number.isFinite(quantity) || quantity <= 0) { error.value = 'Enter a valid positive quantity.'; return }
    lines.push({ purchase_order_item_id: line.id, quantity_received: quantity })
  }
  if (!lines.length) return
  try {
    await procurementApi.receive(order.id, { items: lines })
    notifications.success('Goods received and branch stock updated.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not receive goods.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-clay-600">Business operations</p>
        <h1 class="mt-1 font-heading text-3xl text-ink">Procurement</h1>
        <p class="mt-2 text-sm text-ink-soft">Manage suppliers, order stock and record goods received at each branch.</p>
      </div>
      <label class="grid gap-1 text-sm">Receiving branch
        <select v-model="branchId" @change="load" class="rounded-xl border border-ink/15 bg-white px-3 py-2.5">
          <option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option>
        </select>
      </label>
    </header>
    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="font-heading text-xl">Add supplier</h2>
        <form class="mt-4 grid gap-3" @submit.prevent="createSupplier">
          <label class="grid gap-1 text-sm">Supplier name<input v-model="supplierForm.name" required class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm">Contact person<input v-model="supplierForm.contact_name" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <label class="grid gap-1 text-sm">Phone<input v-model="supplierForm.phone" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm">Email<input v-model="supplierForm.email" type="email" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <label class="grid gap-1 text-sm">KRA PIN / Tax no.<input v-model="supplierForm.tax_number" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          </div>
          <button :disabled="saving" class="rounded-xl bg-ink px-4 py-3 font-semibold text-white disabled:opacity-40">{{ saving ? 'Saving…' : 'Save supplier' }}</button>
        </form>
        <div class="mt-5 border-t border-ink/10 pt-4">
          <h3 class="font-semibold">Suppliers ({{ suppliers.length }})</h3>
          <div class="mt-2 space-y-2">
            <div v-for="supplier in suppliers" :key="supplier.id" class="flex justify-between gap-3 rounded-lg bg-paper p-3 text-sm">
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
            <select v-model="orderForm.supplier_id" required class="rounded-lg border border-ink/15 px-3 py-2">
              <option value="" disabled>Select supplier</option><option v-for="s in suppliers" :key="s.id" :value="String(s.id)">{{ s.name }}</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm">Inventory item
            <select v-model="orderForm.inventory_item_id" required class="rounded-lg border border-ink/15 px-3 py-2">
              <option value="" disabled>Select item</option><option v-for="item in inventory" :key="item.id" :value="String(item.id)">{{ item.name }} ({{ item.unit }})</option>
            </select>
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm">Quantity<input v-model.number="orderForm.quantity_ordered" type="number" min="0.001" step="0.001" required class="rounded-lg border border-ink/15 px-3 py-2" /></label>
            <label class="grid gap-1 text-sm">Unit cost (KES)<input v-model.number="orderForm.unit_cost" type="number" min="0" step="0.01" required class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          </div>
          <label class="grid gap-1 text-sm">Expected delivery date<input v-model="orderForm.expected_at" type="date" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          <label class="grid gap-1 text-sm">Notes<textarea v-model="orderForm.notes" rows="2" class="rounded-lg border border-ink/15 px-3 py-2"></textarea></label>
          <button :disabled="saving || !suppliers.length || !inventory.length" class="rounded-xl bg-clay-600 px-4 py-3 font-semibold text-white disabled:opacity-40">{{ saving ? 'Saving…' : 'Create purchase order' }}</button>
        </form>
      </section>
    </div>

    <section class="mt-6 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div class="flex items-center justify-between"><h2 class="font-heading text-xl">Purchase orders</h2><span class="text-sm text-ink-soft">{{ orders.length }} orders</span></div>
      <div v-if="loading" class="py-8 text-center text-ink-soft">Loading procurement…</div>
      <div v-else class="mt-4 space-y-3">
        <article v-for="order in orders" :key="order.id" class="rounded-xl border border-ink/10 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div><p class="font-semibold">{{ order.order_number }} · {{ order.supplier?.name }}</p><p class="text-xs text-ink-soft">{{ order.branch?.name }} · {{ new Date(order.created_at).toLocaleDateString() }} · {{ money(order.subtotal) }}</p></div>
            <div class="flex items-center gap-2"><span class="rounded-full bg-paper px-3 py-1 text-xs font-semibold capitalize">{{ order.status.replace('_', ' ') }}</span><button v-if="order.status !== 'received'" @click="receiveOrder(order)" class="rounded-lg border border-ink/15 px-3 py-2 text-sm font-semibold">Receive goods</button></div>
          </div>
          <div class="mt-3 space-y-1 text-sm">
            <p v-for="line in order.items" :key="line.id" class="text-ink-soft">{{ line.inventory_item?.name }}: {{ line.quantity_received }} / {{ line.quantity_ordered }} received · {{ money(line.unit_cost) }} each</p>
          </div>
        </article>
        <p v-if="!orders.length" class="py-8 text-center text-sm text-ink-soft">No purchase orders for this branch yet.</p>
      </div>
    </section>
  </main>
</template>
