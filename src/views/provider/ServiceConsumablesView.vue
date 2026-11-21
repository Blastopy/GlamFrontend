<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api/client'
import providersApi from '@/api/providers'
import inventoryApi from '@/api/inventory'
import consumablesApi from '@/api/service-consumables'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

const auth = useAuthStore()
const notifications = useNotificationsStore()
const services = ref([])
const inventory = ref([])
const selectedServiceId = ref('')
const selectedItemId = ref('')
const quantity = ref(1)
const recipes = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const selectedService = computed(() => services.value.find(s => String(s.id) === String(selectedServiceId.value)))

async function loadRecipe() {
  if (!selectedServiceId.value) { recipes.value = []; return }
  try {
    const { data } = await consumablesApi.show(selectedServiceId.value)
    recipes.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load service materials.'
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const providerId = auth.user?.providerProfile?.id || auth.user?.provider_profile?.id
    const [servicesResponse, branchesResponse] = await Promise.all([
      providersApi.services(providerId),
      api.get('/business/branches'),
    ])
    services.value = servicesResponse.data || []
    const branches = Array.isArray(branchesResponse.data) ? branchesResponse.data : (branchesResponse.data.data || [])
    const branch = branches.find(b => b.is_default) || branches[0]
    if (branch) {
      const { data } = await inventoryApi.list({ branch_id: branch.id })
      inventory.value = data.items || []
    }
    if (!selectedServiceId.value && services.value.length) selectedServiceId.value = String(services.value[0].id)
    await loadRecipe()
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load services and inventory.'
  } finally { loading.value = false }
}

async function addMaterial() {
  const id = Number(selectedItemId.value)
  const amount = Number(quantity.value)
  if (!id || !Number.isFinite(amount) || amount <= 0) {
    error.value = 'Choose an inventory item and enter a quantity greater than zero.'
    return
  }
  if (recipes.value.some(x => Number(x.id) === id)) {
    error.value = 'This inventory item is already in the service recipe.'
    return
  }
  const item = inventory.value.find(x => Number(x.id) === id)
  if (!item) return
  recipes.value = [...recipes.value, {
    id: item.id, name: item.name, sku: item.sku, unit: item.unit,
    cost_price: item.cost_price, quantity_per_service: amount,
  }]
  selectedItemId.value = ''
  quantity.value = 1
  error.value = ''
}

function removeMaterial(id) {
  recipes.value = recipes.value.filter(x => Number(x.id) !== Number(id))
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await consumablesApi.update(selectedServiceId.value, {
      items: recipes.value.map(x => ({
        inventory_item_id: Number(x.id),
        quantity_per_service: Number(x.quantity_per_service),
      })),
    })
    notifications.success('Service materials saved.')
    await loadRecipe()
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not save service materials.'
  } finally { saving.value = false }
}

watch(selectedServiceId, loadRecipe)
onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6">
      <p class="text-sm font-medium text-clay-600">Inventory management</p>
      <h1 class="mt-1 font-heading text-3xl text-ink">Service materials</h1>
      <p class="mt-2 max-w-2xl text-sm text-ink-soft">Define the products used by each service. When an appointment is marked completed, the required quantities are deducted from that appointment's branch stock.</p>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <section v-if="loading" class="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">Loading service materials…</section>
    <section v-else class="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <div class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Select service</h2>
        <label class="mt-4 grid gap-1 text-sm">Service
          <select v-model="selectedServiceId" class="rounded-lg border border-ink/15 px-3 py-2.5">
            <option v-for="s in services" :key="s.id" :value="String(s.id)">{{ s.name }}</option>
          </select>
        </label>
        <div v-if="selectedService" class="mt-4 rounded-xl bg-paper p-3">
          <p class="font-semibold text-ink">{{ selectedService.name }}</p>
          <p class="mt-1 text-sm text-ink-soft">KES {{ Number(selectedService.price).toLocaleString() }} · {{ selectedService.duration_minutes }} min</p>
        </div>
        <p v-if="!services.length" class="mt-4 text-sm text-ink-soft">Add a service to your catalogue first.</p>
      </div>

      <div class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Materials per appointment</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
          <label class="grid gap-1 text-sm">Inventory item
            <select v-model="selectedItemId" class="rounded-lg border border-ink/15 px-3 py-2.5">
              <option value="">Choose item</option>
              <option v-for="item in inventory.filter(i => !recipes.some(r => Number(r.id) === Number(i.id)))" :key="item.id" :value="String(item.id)">{{ item.name }} ({{ item.unit }})</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm">Quantity used
            <input v-model.number="quantity" type="number" min="0.001" step="0.001" class="rounded-lg border border-ink/15 px-3 py-2.5" />
          </label>
          <button type="button" @click="addMaterial" :disabled="!selectedItemId" class="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>

        <div class="mt-5 divide-y divide-ink/10">
          <div v-for="item in recipes" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p class="font-semibold text-ink">{{ item.name }}</p>
              <p class="text-xs text-ink-soft">{{ item.quantity_per_service }} {{ item.unit }} per service · Average cost KES {{ Number(item.cost_price || 0).toFixed(2) }}</p>
            </div>
            <button type="button" @click="removeMaterial(item.id)" class="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Remove</button>
          </div>
          <p v-if="!recipes.length" class="py-6 text-center text-sm text-ink-soft">No materials configured for this service.</p>
        </div>
        <button type="button" @click="save" :disabled="saving || !selectedServiceId" class="mt-5 w-full rounded-xl bg-clay-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{{ saving ? 'Saving…' : 'Save service materials' }}</button>
      </div>
    </section>
  </main>
</template>
