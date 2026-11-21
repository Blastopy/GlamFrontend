<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import giftCardsApi from '@/api/gift-cards'

const cards = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showForm = ref(false)
const form = reactive({ amount: 1000, code: '', recipient_name: '', recipient_email: '', recipient_phone: '', message: '', expires_at: '' })
const currency = 'KES'
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(Number(value || 0))
const activeBalance = computed(() => cards.value.filter(c => c.status === 'active').reduce((sum, c) => sum + Number(c.balance || 0), 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await giftCardsApi.list()
    cards.value = data.data || []
  } catch (e) { error.value = e.response?.data?.message || 'Could not load gift cards.' }
  finally { loading.value = false }
}

async function issue() {
  saving.value = true
  error.value = ''
  try {
    const payload = { ...form, amount: Number(form.amount), code: form.code.trim() || null, expires_at: form.expires_at || null }
    const { data } = await giftCardsApi.create(payload)
    Object.assign(form, { amount: 1000, code: '', recipient_name: '', recipient_email: '', recipient_phone: '', message: '', expires_at: '' })
    showForm.value = false
    await load()
    if (data.code) {
      try { await navigator.clipboard.writeText(data.code) } catch { /* code remains visible in the register */ }
    }
  } catch (e) { error.value = e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Could not issue gift card.' }
  finally { saving.value = false }
}

async function disable(card) {
  if (!window.confirm(`Disable gift card ${card.code}? Its remaining balance will no longer be redeemable.`)) return
  try { await giftCardsApi.disable(card.id); await load() }
  catch (e) { error.value = e.response?.data?.message || 'Could not disable gift card.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-clay-600">Customer retention</p>
        <h1 class="mt-1 font-heading text-3xl text-ink">Gift cards</h1>
        <p class="mt-2 text-sm text-ink-soft">Issue prepaid gift cards and redeem them as a POS payment method.</p>
      </div>
      <button type="button" @click="showForm = !showForm" class="rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white">{{ showForm ? 'Close form' : '＋ Issue gift card' }}</button>
    </header>
    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <section class="mb-6 grid gap-3 sm:grid-cols-3">
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Gift cards issued</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ cards.length }}</p></article>
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Active cards</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ cards.filter(c => c.status === 'active').length }}</p></article>
      <article class="rounded-2xl border border-ink/10 bg-white p-5"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Outstanding active balance</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ money(activeBalance) }}</p></article>
    </section>

    <form v-if="showForm" @submit.prevent="issue" class="mb-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h2 class="mb-4 font-heading text-xl text-ink">Issue a gift card</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label class="grid gap-1 text-sm">Value (KES)<input v-model="form.amount" type="number" min="1" step="0.01" required class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Custom code (optional)<input v-model.trim="form.code" maxlength="32" class="rounded-lg border border-ink/15 px-3 py-2.5 uppercase" placeholder="Auto-generate if blank" /></label>
        <label class="grid gap-1 text-sm">Recipient name<input v-model.trim="form.recipient_name" maxlength="255" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Recipient email<input v-model.trim="form.recipient_email" type="email" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Recipient phone<input v-model.trim="form.recipient_phone" maxlength="40" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Expiry date<input v-model="form.expires_at" type="date" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm sm:col-span-2 lg:col-span-3">Gift message<textarea v-model.trim="form.message" maxlength="500" rows="2" class="rounded-lg border border-ink/15 px-3 py-2.5"></textarea></label>
      </div>
      <div class="mt-4 flex justify-end"><button :disabled="saving" type="submit" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Issuing…' : 'Issue gift card' }}</button></div>
    </form>

    <section class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Gift card register</h2><p class="mt-1 text-xs text-ink-soft">At POS, choose Gift card as the tender and enter its code as the reference.</p></div>
      <p v-if="loading" class="p-8 text-center text-sm text-ink-soft">Loading gift cards…</p>
      <p v-else-if="!cards.length" class="p-8 text-center text-sm text-ink-soft">No gift cards issued yet.</p>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-sm">
        <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Code</th><th class="px-4 py-3">Recipient</th><th class="px-4 py-3">Initial value</th><th class="px-4 py-3">Balance</th><th class="px-4 py-3">Expires</th><th class="px-4 py-3">Status</th><th class="px-4 py-3"></th></tr></thead>
        <tbody class="divide-y divide-ink/10"><tr v-for="card in cards" :key="card.id">
          <td class="px-4 py-3 font-mono font-semibold">{{ card.code }}</td><td class="px-4 py-3">{{ card.recipient_name || '—' }}</td><td class="px-4 py-3">{{ money(card.initial_balance) }}</td><td class="px-4 py-3 font-semibold">{{ money(card.balance) }}</td><td class="px-4 py-3">{{ card.expires_at ? new Date(card.expires_at).toLocaleDateString() : 'Never' }}</td><td class="px-4 py-3 capitalize">{{ card.status }}</td><td class="px-4 py-3 text-right"><button v-if="card.status === 'active'" type="button" @click="disable(card)" class="text-xs font-semibold text-red-700 hover:underline">Disable</button></td>
        </tr></tbody>
      </table></div>
    </section>
    <p class="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Gift card issuance creates an outstanding balance, not revenue. Revenue is recorded when the card is redeemed at POS. Keep separate records of funds received when issuing cards.</p>
  </main>
</template>
