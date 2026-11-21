<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '@/api/client'
import retentionApi from '@/api/gift-memberships'

const cards = ref([])
const plans = ref([])
const subscriptions = ref([])
const customers = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')
const historyCustomer = ref(null)
const historyRows = ref([])
const cardForm = reactive({ business_customer_id: '', amount: 1000, expires_at: '' })
const planForm = reactive({ name: '', description: '', price: 0, duration_days: 30, discount_percent: 0 })
const memberForm = reactive({ business_customer_id: '', membership_plan_id: '', starts_at: '' })
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [c, p, s, customerRes] = await Promise.all([
      retentionApi.giftCards(), retentionApi.plans(), retentionApi.subscriptions(),
      api.get('/loyalty/customers', { params: { per_page: 100 } }),
    ])
    cards.value = c.data.data || []
    plans.value = p.data.data || []
    subscriptions.value = s.data.data || []
    customers.value = customerRes.data.data || []
  } catch (e) { error.value = e.response?.data?.message || 'Could not load gift cards and memberships.' }
  finally { loading.value = false }
}

async function issueCard() {
  saving.value = true; error.value = ''; message.value = ''
  try {
    const payload = { amount: Number(cardForm.amount), business_customer_id: cardForm.business_customer_id || null, expires_at: cardForm.expires_at || null }
    const { data } = await retentionApi.issueGiftCard(payload)
    message.value = `Gift card ${data.code} issued successfully.`
    Object.assign(cardForm, { business_customer_id: '', amount: 1000, expires_at: '' })
    await load()
  } catch (e) { error.value = e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Could not issue gift card.' }
  finally { saving.value = false }
}

async function savePlan() {
  saving.value = true; error.value = ''; message.value = ''
  try {
    await retentionApi.createPlan({ ...planForm, price: Number(planForm.price), duration_days: Number(planForm.duration_days), discount_percent: Number(planForm.discount_percent) })
    message.value = 'Membership plan created.'
    Object.assign(planForm, { name: '', description: '', price: 0, duration_days: 30, discount_percent: 0 })
    await load()
  } catch (e) { error.value = e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Could not create membership plan.' }
  finally { saving.value = false }
}

async function subscribe() {
  saving.value = true; error.value = ''; message.value = ''
  try {
    await retentionApi.subscribe({ business_customer_id: Number(memberForm.business_customer_id), membership_plan_id: Number(memberForm.membership_plan_id), starts_at: memberForm.starts_at || null })
    message.value = 'Membership assigned. Record and collect the membership payment separately.'
    Object.assign(memberForm, { business_customer_id: '', membership_plan_id: '', starts_at: '' })
    await load()
  } catch (e) { error.value = e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Could not assign membership.' }
  finally { saving.value = false }
}

async function deactivate(card) {
  if (!window.confirm(`Deactivate gift card ${card.code}?`)) return
  try { await retentionApi.deactivateGiftCard(card.id); message.value = 'Gift card deactivated.'; await load() }
  catch (e) { error.value = e.response?.data?.message || 'Could not deactivate gift card.' }
}

async function showHistory(customer) {
  try {
    const { data } = await retentionApi.customerHistory(customer.id)
    historyCustomer.value = data.customer
    historyRows.value = data.subscriptions || []
  } catch (e) { error.value = e.response?.data?.message || 'Could not load customer membership history.' }
}

async function cancelMembership(item) {
  if (!window.confirm(`Cancel membership for ${item.customer?.name || 'this customer'}?`)) return
  try { await retentionApi.cancelSubscription(item.id); message.value = 'Membership cancelled.'; await load() }
  catch (e) { error.value = e.response?.data?.message || 'Could not cancel membership.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6">
      <p class="text-sm font-medium text-clay-600">Customer retention</p>
      <h1 class="mt-1 font-heading text-3xl text-ink">Gift cards & memberships</h1>
      <p class="mt-2 text-sm text-ink-soft">Issue prepaid gift cards, define membership benefits and manage customer subscriptions.</p>
    </header>
    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <p v-if="message" class="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{{ message }}</p>
    <p v-if="loading" class="py-8 text-center text-ink-soft">Loading…</p>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Issue gift card</h2>
        <form class="mt-4 grid gap-3" @submit.prevent="issueCard">
          <label class="grid gap-1 text-sm">Customer (optional)<select v-model="cardForm.business_customer_id" class="rounded-lg border border-ink/15 px-3 py-2.5"><option value="">Unassigned / gift purchase</option><option v-for="c in customers" :key="c.id" :value="String(c.id)">{{ c.name }} · {{ c.phone || 'No phone' }}</option></select></label>
          <label class="grid gap-1 text-sm">Value (KES)<input v-model.number="cardForm.amount" type="number" min="1" step="0.01" required class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
          <label class="grid gap-1 text-sm">Expiry (optional)<input v-model="cardForm.expires_at" type="date" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
          <button :disabled="saving" class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Issue gift card</button>
        </form>
      </section>

      <section class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Create membership plan</h2>
        <form class="mt-4 grid gap-3" @submit.prevent="savePlan">
          <label class="grid gap-1 text-sm">Plan name<input v-model.trim="planForm.name" required maxlength="120" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="Monthly VIP" /></label>
          <label class="grid gap-1 text-sm">Description<input v-model.trim="planForm.description" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="Member benefits" /></label>
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="grid gap-1 text-sm">Price (KES)<input v-model.number="planForm.price" type="number" min="0.01" step="0.01" required class="w-full rounded-lg border border-ink/15 px-3 py-2.5" /></label>
            <label class="grid gap-1 text-sm">Duration (days)<input v-model.number="planForm.duration_days" type="number" min="1" max="3650" required class="w-full rounded-lg border border-ink/15 px-3 py-2.5" /></label>
            <label class="grid gap-1 text-sm">Discount (%)<input v-model.number="planForm.discount_percent" type="number" min="0" max="100" step="0.01" class="w-full rounded-lg border border-ink/15 px-3 py-2.5" /></label>
          </div>
          <button :disabled="saving" class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Create plan</button>
        </form>
      </section>
    </div>

    <section class="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h2 class="font-heading text-xl text-ink">Assign membership to customer</h2>
      <form class="mt-4 grid gap-3 sm:grid-cols-3" @submit.prevent="subscribe">
        <label class="grid gap-1 text-sm">Customer<select v-model="memberForm.business_customer_id" required class="rounded-lg border border-ink/15 px-3 py-2.5"><option value="" disabled>Select customer</option><option v-for="c in customers" :key="c.id" :value="String(c.id)">{{ c.name }}</option></select></label>
        <label class="grid gap-1 text-sm">Plan<select v-model="memberForm.membership_plan_id" required class="rounded-lg border border-ink/15 px-3 py-2.5"><option value="" disabled>Select plan</option><option v-for="p in plans" :key="p.id" :value="String(p.id)">{{ p.name }} · {{ money(p.price) }}</option></select></label>
        <label class="grid gap-1 text-sm">Start date (optional)<input v-model="memberForm.starts_at" type="date" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <div class="sm:col-span-3"><button :disabled="saving || !plans.length || !customers.length" class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Assign membership</button></div>
      </form>
      <p class="mt-2 text-xs text-ink-soft">Subscriptions are recorded with fixed start/end dates. Automatic recurring billing is not enabled; collect and record renewals separately.</p>
    </section>

    <section class="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Gift cards</h2></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[650px] text-left text-sm">
        <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Code</th><th class="px-4 py-3">Customer</th><th class="px-4 py-3">Initial value</th><th class="px-4 py-3">Balance</th><th class="px-4 py-3">Status</th><th class="px-4 py-3"></th></tr></thead>
        <tbody class="divide-y divide-ink/10"><tr v-for="card in cards" :key="card.id"><td class="px-4 py-3 font-semibold">{{ card.code }}</td><td class="px-4 py-3">{{ card.customer?.name || 'Unassigned' }}</td><td class="px-4 py-3">{{ money(card.initial_balance) }}</td><td class="px-4 py-3">{{ money(card.balance) }}</td><td class="px-4 py-3 capitalize">{{ card.status }}</td><td class="px-4 py-3 text-right"><button v-if="card.status === 'active'" @click="deactivate(card)" class="text-xs font-semibold text-red-700">Deactivate</button></td></tr></tbody>
      </table></div>
      <p v-if="!cards.length" class="p-5 text-sm text-ink-soft">No gift cards issued yet.</p>
    </section>

    <section class="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Membership plans</h2></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[600px] text-left text-sm"><thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Plan</th><th class="px-4 py-3">Price</th><th class="px-4 py-3">Duration</th><th class="px-4 py-3">Discount</th><th class="px-4 py-3">Subscribers</th></tr></thead><tbody class="divide-y divide-ink/10"><tr v-for="plan in plans" :key="plan.id"><td class="px-4 py-3 font-semibold">{{ plan.name }}</td><td class="px-4 py-3">{{ money(plan.price) }}</td><td class="px-4 py-3">{{ plan.duration_days }} days</td><td class="px-4 py-3">{{ plan.discount_percent }}%</td><td class="px-4 py-3">{{ plan.subscriptions_count || 0 }}</td></tr></tbody></table></div>
    </section>

    <section class="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Customer memberships</h2></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[700px] text-left text-sm"><thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Customer</th><th class="px-4 py-3">Plan</th><th class="px-4 py-3">Starts</th><th class="px-4 py-3">Ends</th><th class="px-4 py-3">Status</th><th class="px-4 py-3"></th></tr></thead><tbody class="divide-y divide-ink/10"><tr v-for="sub in subscriptions" :key="sub.id"><td class="px-4 py-3 font-semibold">{{ sub.customer?.name }}</td><td class="px-4 py-3">{{ sub.plan?.name }}</td><td class="px-4 py-3">{{ sub.starts_at }}</td><td class="px-4 py-3">{{ sub.ends_at }}</td><td class="px-4 py-3 capitalize">{{ sub.status }}</td><td class="px-4 py-3 text-right"><button @click="showHistory(sub.customer)" class="mr-3 text-xs font-semibold">History</button><button v-if="sub.status === 'active'" @click="cancelMembership(sub)" class="text-xs font-semibold text-red-700">Cancel</button></td></tr></tbody></table></div>
    </section>
  </main>
</template>
