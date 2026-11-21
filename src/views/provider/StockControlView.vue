<script setup>
import { computed, onMounted, ref } from 'vue'
import businessApi from '@/api/business'
import inventoryApi from '@/api/inventory'
import inventoryControlApi from '@/api/inventory-control'
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
const branches = ref([])
const items = ref([])
const transfers = ref([])
const stocktakes = ref([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const transfer = ref({ from_branch_id: '', to_branch_id: '', inventory_item_id: '', quantity: 1, notes: '' })
const stocktake = ref({ branch_id: '', inventory_item_id: '', counted_quantity: 0, notes: '' })
const activeItems = computed(() => items.value.filter(item => item.is_active !== false))

async function load() {
  loading.value = true
  try {
    const [b,t,s] = await Promise.all([
      businessApi.listBranches(),
      inventoryControlApi.transfers(),
      inventoryControlApi.stocktakes(),
    ])
    branches.value = b.data.filter(x => x.is_active)
    transfers.value = t.data
    stocktakes.value = s.data
    if (!transfer.value.from_branch_id) transfer.value.from_branch_id = branches.value[0]?.id || ''
    if (!transfer.value.to_branch_id) transfer.value.to_branch_id = branches.value[1]?.id || ''
    if (!stocktake.value.branch_id) stocktake.value.branch_id = branches.value[0]?.id || ''
    if (branches.value[0]) {
      const inv = await inventoryApi.list({ branch_id: branches.value[0].id })
      items.value = inv.data.items || []
    }
  } catch {
    // Shared API interceptor handles network and server errors.
  } finally { loading.value = false }
}

async function createTransfer() {
  error.value = ''
  busy.value = true
  try {
    await inventoryControlApi.createTransfer({
      from_branch_id: Number(transfer.value.from_branch_id),
      to_branch_id: Number(transfer.value.to_branch_id),
      notes: transfer.value.notes || null,
      items: [{ inventory_item_id: Number(transfer.value.inventory_item_id), quantity: Number(transfer.value.quantity) }],
    })
    notifications.success('Transfer draft created.')
    transfer.value.quantity = 1
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not create transfer.' }
  finally { busy.value = false }
}

async function runTransfer(id, action) {
  busy.value = true
  try {
    if (action === 'dispatch') await inventoryControlApi.dispatchTransfer(id)
    else await inventoryControlApi.receiveTransfer(id)
    notifications.success(action === 'dispatch' ? 'Transfer dispatched.' : 'Transfer received.')
    await load()
  } catch (e) { notifications.error(e.response?.data?.message || 'Transfer action failed.') }
  finally { busy.value = false }
}

async function createStocktake() {
  error.value = ''
  busy.value = true
  try {
    await inventoryControlApi.createStocktake({
      branch_id: Number(stocktake.value.branch_id),
      notes: stocktake.value.notes || null,
      items: [{ inventory_item_id: Number(stocktake.value.inventory_item_id), counted_quantity: Number(stocktake.value.counted_quantity) }],
    })
    notifications.success('Stocktake draft created.')
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not create stocktake.' }
  finally { busy.value = false }
}

async function finalizeStocktake(id) {
  busy.value = true
  try {
    await inventoryControlApi.finalizeStocktake(id)
    notifications.success('Stocktake finalized and stock reconciled.')
    await load()
  } catch (e) { notifications.error(e.response?.data?.message || 'Could not finalize stocktake.') }
  finally { busy.value = false }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6">
      <p class="text-sm font-medium text-clay-600">Inventory management</p>
      <h1 class="mt-1 font-heading text-2xl text-ink sm:text-3xl">Stock control</h1>
      <p class="mt-2 max-w-2xl text-sm text-ink-soft">Move stock between branches and reconcile physical counts. Every completed action is recorded in the inventory movement ledger.</p>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <section v-if="loading" class="py-12 text-center text-sm text-ink-soft">Loading stock control…</section>
    <template v-else>
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 class="font-heading text-xl text-ink">Create stock transfer</h2>
          <form class="mt-4 grid gap-3" @submit.prevent="createTransfer">
            <label class="grid gap-1 text-sm">From branch
              <select v-model="transfer.from_branch_id" required class="rounded-lg border border-ink/15 px-3 py-2.5">
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">To branch
              <select v-model="transfer.to_branch_id" required class="rounded-lg border border-ink/15 px-3 py-2.5">
                <option v-for="b in branches.filter(x => x.id !== Number(transfer.from_branch_id))" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">Inventory item
              <select v-model="transfer.inventory_item_id" required class="rounded-lg border border-ink/15 px-3 py-2.5">
                <option v-for="item in activeItems" :key="item.id" :value="item.id">{{ item.name }} ({{ item.unit }})</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">Quantity
              <input v-model.number="transfer.quantity" type="number" min="0.001" step="0.001" required class="rounded-lg border border-ink/15 px-3 py-2.5" />
            </label>
            <label class="grid gap-1 text-sm">Notes
              <input v-model="transfer.notes" maxlength="1000" class="rounded-lg border border-ink/15 px-3 py-2.5" />
            </label>
            <button :disabled="busy || branches.length < 2 || !transfer.inventory_item_id" class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Create transfer draft</button>
          </form>
        </section>

        <section class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 class="font-heading text-xl text-ink">Record stocktake</h2>
          <form class="mt-4 grid gap-3" @submit.prevent="createStocktake">
            <label class="grid gap-1 text-sm">Branch
              <select v-model="stocktake.branch_id" required class="rounded-lg border border-ink/15 px-3 py-2.5">
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">Inventory item
              <select v-model="stocktake.inventory_item_id" required class="rounded-lg border border-ink/15 px-3 py-2.5">
                <option v-for="item in activeItems" :key="item.id" :value="item.id">{{ item.name }} ({{ item.unit }})</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">Physically counted quantity
              <input v-model.number="stocktake.counted_quantity" type="number" min="0" step="0.001" required class="rounded-lg border border-ink/15 px-3 py-2.5" />
            </label>
            <label class="grid gap-1 text-sm">Notes
              <input v-model="stocktake.notes" maxlength="1000" class="rounded-lg border border-ink/15 px-3 py-2.5" />
            </label>
            <button :disabled="busy || !stocktake.inventory_item_id" class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Create stocktake draft</button>
          </form>
        </section>
      </div>

      <section class="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Branch transfers</h2>
        <p v-if="!transfers.length" class="mt-3 text-sm text-ink-soft">No transfers yet.</p>
        <div v-for="t in transfers" :key="t.id" class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3">
          <div>
            <p class="text-sm font-semibold text-ink">{{ t.transfer_number }} · {{ t.from_branch?.name }} → {{ t.to_branch?.name }}</p>
            <p class="text-xs text-ink-soft">{{ t.items?.map(i => i.item?.name + ' × ' + i.quantity).join(', ') }} · {{ t.status }}</p>
          </div>
          <div class="flex gap-2">
            <button v-if="t.status === 'draft'" @click="runTransfer(t.id,'dispatch')" :disabled="busy" class="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">Dispatch</button>
            <button v-if="t.status === 'in_transit'" @click="runTransfer(t.id,'receive')" :disabled="busy" class="rounded-lg bg-clay-600 px-3 py-2 text-xs font-semibold text-white">Receive</button>
          </div>
        </div>
      </section>

      <section class="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Stocktakes</h2>
        <p v-if="!stocktakes.length" class="mt-3 text-sm text-ink-soft">No stocktakes yet.</p>
        <div v-for="s in stocktakes" :key="s.id" class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-3">
          <div>
            <p class="text-sm font-semibold text-ink">{{ s.reference }} · {{ s.branch?.name }}</p>
            <p class="text-xs text-ink-soft">{{ s.items?.map(i => i.item?.name + ': ' + i.system_quantity + ' → ' + i.counted_quantity).join(', ') }} · {{ s.status }}</p>
          </div>
          <button v-if="s.status === 'draft'" @click="finalizeStocktake(s.id)" :disabled="busy" class="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">Finalize</button>
        </div>
      </section>
    </template>
  </main>
</template>
