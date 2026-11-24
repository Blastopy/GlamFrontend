<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import marketingApi from '@/api/marketing'

const promotions = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showForm = ref(false)
const editingId = ref(null)
const form = reactive({
  name: '', code: '', discount_type: 'percentage', discount_value: 10,
  minimum_subtotal: 0, maximum_discount: '', starts_at: '', ends_at: '',
  usage_limit: '', is_active: true,
})
const activeCount = computed(() => promotions.value.filter(p => p.is_active).length)
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await marketingApi.promotions()
    promotions.value = data.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load promotions.'
  } finally { loading.value = false }
}

function resetForm() {
  Object.assign(form, {
    name: '', code: '', discount_type: 'percentage', discount_value: 10,
    minimum_subtotal: 0, maximum_discount: '', starts_at: '', ends_at: '',
    usage_limit: '', is_active: true,
  })
  editingId.value = null
}

function editPromotion(p) {
  Object.assign(form, {
    name: p.name, code: p.code, discount_type: p.discount_type,
    discount_value: Number(p.discount_value), minimum_subtotal: Number(p.minimum_subtotal || 0),
    maximum_discount: p.maximum_discount ?? '', starts_at: p.starts_at ? p.starts_at.slice(0, 16) : '',
    ends_at: p.ends_at ? p.ends_at.slice(0, 16) : '', usage_limit: p.usage_limit ?? '',
    is_active: p.is_active,
  })
  editingId.value = p.id
  showForm.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  const payload = {
    ...form,
    code: form.code.trim().toUpperCase(),
    discount_value: Number(form.discount_value),
    minimum_subtotal: Number(form.minimum_subtotal || 0),
    maximum_discount: form.maximum_discount === '' ? null : Number(form.maximum_discount),
    usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
  }
  try {
    if (editingId.value) await marketingApi.updatePromotion(editingId.value, payload)
    else await marketingApi.createPromotion(payload)
    showForm.value = false
    resetForm()
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Could not save promotion.'
  } finally { saving.value = false }
}

async function toggle(p) {
  try {
    await marketingApi.updatePromotion(p.id, { is_active: !p.is_active })
    await load()
  } catch (e) { error.value = e.response?.data?.message || 'Could not update promotion.' }
}

async function remove(p) {
  if (!window.confirm(`Delete promotion ${p.code}?`)) return
  try { await marketingApi.deletePromotion(p.id); await load() }
  catch (e) { error.value = e.response?.data?.message || 'Could not delete promotion. Redeemed promotions must be deactivated.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-clay-600">Customer retention</p>
        <h1 class="mt-1 font-heading text-3xl text-ink">Promotions</h1>
        <p class="mt-2 text-sm text-ink-soft">Create discount codes and track their use at the point of sale.</p>
      </div>
      <button type="button" @click="showForm = !showForm; resetForm()" class="rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700">{{ showForm ? 'Close form' : '＋ Create promotion' }}</button>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <section class="mb-6 grid gap-3 sm:grid-cols-3">
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Promotions</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ promotions.length }}</p></article>
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Active campaigns</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ activeCount }}</p></article>
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Redemptions</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ promotions.reduce((sum, p) => sum + Number(p.usage_count || 0), 0) }}</p></article>
    </section>

    <form v-if="showForm" @submit.prevent="save" class="mb-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h2 class="mb-4 font-heading text-xl text-ink">{{ editingId ? 'Edit promotion' : 'Create promotion' }}</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label class="grid gap-1 text-sm">Campaign name<input v-model.trim="form.name" required maxlength="120" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="New customer offer" /></label>
        <label class="grid gap-1 text-sm">Discount code<input v-model.trim="form.code" required maxlength="40" class="rounded-lg border border-ink/15 px-3 py-2.5 uppercase" placeholder="WELCOME10" /></label>
        <label class="grid gap-1 text-sm">Discount type<select v-model="form.discount_type" class="rounded-lg border border-ink/15 px-3 py-2.5"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
        <label class="grid gap-1 text-sm">{{ form.discount_type === 'percentage' ? 'Percentage off' : 'Amount off (KES)' }}<input v-model="form.discount_value" type="number" min="0.01" :max="form.discount_type === 'percentage' ? 100 : undefined" step="0.01" required class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Minimum subtotal (KES)<input v-model="form.minimum_subtotal" type="number" min="0" step="0.01" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label v-if="form.discount_type === 'percentage'" class="grid gap-1 text-sm">Maximum discount (KES)<input v-model="form.maximum_discount" type="number" min="0.01" step="0.01" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Starts at<input v-model="form.starts_at" type="datetime-local" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Ends at<input v-model="form.ends_at" type="datetime-local" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Maximum redemptions<input v-model="form.usage_limit" type="number" min="1" step="1" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="Unlimited" /></label>
        <label class="flex items-center gap-2 self-end py-3 text-sm"><input v-model="form.is_active" type="checkbox" class="rounded" /> Campaign active</label>
      </div>
      <div class="mt-4 flex justify-end gap-2"><button type="button" @click="showForm = false; resetForm()" class="rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold">Cancel</button><button :disabled="saving" type="submit" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save promotion' }}</button></div>
    </form>

    <section class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Campaign register</h2><p class="mt-1 text-xs text-ink-soft">Codes can be applied during POS checkout.</p></div>
      <p v-if="loading" class="p-8 text-center text-sm text-ink-soft">Loading campaigns…</p>
      <p v-else-if="!promotions.length" class="p-8 text-center text-sm text-ink-soft">No promotions created yet.</p>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[850px] text-left text-sm">
        <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Campaign</th><th class="px-4 py-3">Code</th><th class="px-4 py-3">Discount</th><th class="px-4 py-3">Redemptions</th><th class="px-4 py-3">Status</th><th class="px-4 py-3"></th></tr></thead>
        <tbody class="divide-y divide-ink/10"><tr v-for="p in promotions" :key="p.id">
          <td class="px-4 py-3"><p class="font-semibold text-ink">{{ p.name }}</p><p class="text-xs text-ink-soft">Min. spend {{ money(p.minimum_subtotal) }}</p></td>
          <td class="px-4 py-3 font-mono font-semibold">{{ p.code }}</td>
          <td class="px-4 py-3">{{ p.discount_type === 'percentage' ? `${p.discount_value}%` : money(p.discount_value) }}</td>
          <td class="px-4 py-3">{{ p.usage_count }}<span v-if="p.usage_limit"> / {{ p.usage_limit }}</span></td>
          <td class="px-4 py-3"><span :class="p.is_active ? 'text-green-700' : 'text-ink-soft'">{{ p.is_active ? 'Active' : 'Inactive' }}</span></td>
          <td class="px-4 py-3 text-right whitespace-nowrap"><button type="button" @click="editPromotion(p)" class="mr-3 text-xs font-semibold text-clay-700 hover:underline">Edit</button><button type="button" @click="toggle(p)" class="mr-3 text-xs font-semibold hover:underline">{{ p.is_active ? 'Deactivate' : 'Activate' }}</button><button type="button" @click="remove(p)" class="text-xs font-semibold text-red-700 hover:underline">Delete</button></td>
        </tr></tbody>
      </table></div>
    </section>
  </main>
</template>
