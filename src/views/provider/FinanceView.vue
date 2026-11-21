<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import financeApi from '@/api/finance'
import businessApi from '@/api/business'

const branches = ref([])
const branchId = ref('')
const from = ref('')
const to = ref('')
const report = ref({ currency: 'KES', revenue: 0, refunds: 0, net_revenue: 0, expenses: 0, operating_result: 0, expense_categories: [], branch_performance: [], basis: '' })
const expenses = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const showForm = ref(false)
const form = reactive({ branch_id: '', category: 'Rent', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', reference: '', notes: '' })
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: report.value.currency || 'KES' }).format(Number(value || 0))
const filters = computed(() => {
  const params = {}
  if (branchId.value) params.branch_id = Number(branchId.value)
  if (from.value) params.from = from.value
  if (to.value) params.to = to.value
  return params
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [summaryResponse, expensesResponse] = await Promise.all([
      financeApi.summary(filters.value),
      financeApi.expenses(filters.value),
    ])
    report.value = summaryResponse.data
    expenses.value = expensesResponse.data.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load financial information.'
  } finally { loading.value = false }
}

async function loadBranches() {
  try {
    const { data } = await businessApi.listBranches()
    branches.value = Array.isArray(data) ? data : (data.data || [])
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load branches.'
  }
}

async function saveExpense() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...form,
      branch_id: form.branch_id ? Number(form.branch_id) : null,
      amount: Number(form.amount),
    }
    await financeApi.createExpense(payload)
    Object.assign(form, { branch_id: '', category: 'Rent', description: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', reference: '', notes: '' })
    showForm.value = false
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat()[0] || 'Could not save expense.'
  } finally { saving.value = false }
}

async function removeExpense(expense) {
  if (!window.confirm(`Delete expense “${expense.description}”?`)) return
  try {
    await financeApi.deleteExpense(expense.id)
    await load()
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not delete expense.'
  }
}

function resetFilters() {
  branchId.value = ''
  from.value = ''
  to.value = ''
}
watch([branchId, from, to], load)
onMounted(async () => { await loadBranches(); await load() })
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-clay-600">Business operations</p>
        <h1 class="mt-1 font-heading text-3xl text-ink">Financial management</h1>
        <p class="mt-2 text-sm text-ink-soft">Track collected revenue, refunds, operating expenses and branch performance.</p>
      </div>
      <button type="button" @click="showForm = !showForm" class="rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700">{{ showForm ? 'Close form' : '＋ Record expense' }}</button>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <form v-if="showForm" @submit.prevent="saveExpense" class="mb-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h2 class="mb-4 font-heading text-xl text-ink">New expense</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label class="grid gap-1 text-sm">Description<input v-model.trim="form.description" required maxlength="255" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="e.g. November rent" /></label>
        <label class="grid gap-1 text-sm">Category<select v-model="form.category" required class="rounded-lg border border-ink/15 px-3 py-2.5"><option>Rent</option><option>Utilities</option><option>Salaries</option><option>Supplies</option><option>Marketing</option><option>Transport</option><option>Repairs</option><option>Internet</option><option>Other</option></select></label>
        <label class="grid gap-1 text-sm">Amount<input v-model="form.amount" type="number" min="0.01" step="0.01" required class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="0.00" /></label>
        <label class="grid gap-1 text-sm">Expense date<input v-model="form.expense_date" type="date" required class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
        <label class="grid gap-1 text-sm">Branch<select v-model="form.branch_id" class="rounded-lg border border-ink/15 px-3 py-2.5"><option value="">Business-wide</option><option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select></label>
        <label class="grid gap-1 text-sm">Payment method<select v-model="form.payment_method" class="rounded-lg border border-ink/15 px-3 py-2.5"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="bank">Bank</option><option value="other">Other</option></select></label>
        <label class="grid gap-1 text-sm sm:col-span-2">Reference (optional)<input v-model.trim="form.reference" maxlength="100" class="rounded-lg border border-ink/15 px-3 py-2.5" placeholder="Receipt or transaction reference" /></label>
        <label class="grid gap-1 text-sm sm:col-span-3">Notes (optional)<textarea v-model.trim="form.notes" rows="2" maxlength="2000" class="rounded-lg border border-ink/15 px-3 py-2.5"></textarea></label>
      </div>
      <div class="mt-4 flex justify-end"><button :disabled="saving" type="submit" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save expense' }}</button></div>
    </form>

    <section class="mb-6 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:grid-cols-4">
      <label class="grid gap-1 text-sm">Branch<select v-model="branchId" class="rounded-lg border border-ink/15 px-3 py-2.5"><option value="">All branches</option><option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select></label>
      <label class="grid gap-1 text-sm">From<input v-model="from" type="date" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
      <label class="grid gap-1 text-sm">To<input v-model="to" type="date" :min="from || undefined" class="rounded-lg border border-ink/15 px-3 py-2.5" /></label>
      <div class="flex items-end"><button type="button" @click="resetFilters" class="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm font-semibold">Clear filters</button></div>
    </section>

    <p v-if="loading" class="rounded-xl border border-ink/10 bg-white p-6 text-center text-sm text-ink-soft">Loading financial report…</p>
    <template v-else>
      <section class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Revenue collected</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ money(report.revenue) }}</p><p class="mt-1 text-xs text-ink-soft">POS and successful booking payments</p></article>
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Refunds</p><p class="mt-2 font-heading text-2xl font-semibold text-red-700">{{ money(report.refunds) }}</p><p class="mt-1 text-xs text-ink-soft">Recorded POS refunds</p></article>
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Operating expenses</p><p class="mt-2 font-heading text-2xl font-semibold text-ink">{{ money(report.expenses) }}</p><p class="mt-1 text-xs text-ink-soft">Expenses entered in Flairplace</p></article>
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Operating result</p><p class="mt-2 font-heading text-2xl font-semibold" :class="Number(report.operating_result) < 0 ? 'text-red-700' : 'text-green-700'">{{ money(report.operating_result) }}</p><p class="mt-1 text-xs text-ink-soft">Net revenue less recorded expenses</p></article>
      </section>

      <section class="mb-6 grid gap-6 lg:grid-cols-2">
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 class="font-heading text-xl text-ink">Branch performance</h2>
          <div v-if="!report.branch_performance?.length" class="py-6 text-center text-sm text-ink-soft">No branch data for this period.</div>
          <div v-else class="mt-3 divide-y divide-ink/10">
            <div v-for="branch in report.branch_performance" :key="branch.branch_id" class="flex items-center justify-between gap-4 py-3">
              <div><p class="font-semibold text-ink">{{ branch.branch_name }}</p><p class="text-xs text-ink-soft">Revenue {{ money(branch.revenue) }} · Expenses {{ money(branch.expenses) }}</p></div>
              <p class="shrink-0 text-sm font-semibold" :class="Number(branch.operating_result) < 0 ? 'text-red-700' : 'text-green-700'">{{ money(branch.operating_result) }}</p>
            </div>
          </div>
        </article>
        <article class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 class="font-heading text-xl text-ink">Expenses by category</h2>
          <div v-if="!report.expense_categories?.length" class="py-6 text-center text-sm text-ink-soft">No expenses recorded for this period.</div>
          <div v-else class="mt-3 divide-y divide-ink/10">
            <div v-for="row in report.expense_categories" :key="row.category" class="flex items-center justify-between gap-3 py-3"><div><p class="font-semibold text-ink">{{ row.category }}</p><p class="text-xs text-ink-soft">{{ row.entries }} entries</p></div><p class="text-sm font-semibold text-ink">{{ money(row.total) }}</p></div>
          </div>
        </article>
      </section>

      <section class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        <div class="border-b border-ink/10 p-5"><h2 class="font-heading text-xl text-ink">Expense register</h2><p class="mt-1 text-xs text-ink-soft">Latest 50 expenses matching the selected filters</p></div>
        <div v-if="!expenses.length" class="p-8 text-center text-sm text-ink-soft">No expenses recorded.</div>
        <div v-else class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft"><tr><th class="px-4 py-3">Date</th><th class="px-4 py-3">Description</th><th class="px-4 py-3">Category</th><th class="px-4 py-3">Branch</th><th class="px-4 py-3">Method</th><th class="px-4 py-3 text-right">Amount</th><th class="px-4 py-3"> </th></tr></thead>
          <tbody class="divide-y divide-ink/10"><tr v-for="expense in expenses" :key="expense.id">
            <td class="whitespace-nowrap px-4 py-3">{{ expense.expense_date }}</td><td class="px-4 py-3 font-medium">{{ expense.description }}</td><td class="px-4 py-3">{{ expense.category }}</td><td class="px-4 py-3">{{ expense.branch?.name || 'Business-wide' }}</td><td class="px-4 py-3 capitalize">{{ expense.payment_method }}</td><td class="px-4 py-3 text-right font-semibold">{{ money(expense.amount) }}</td><td class="px-4 py-3 text-right"><button type="button" @click="removeExpense(expense)" class="text-xs font-semibold text-red-700 hover:underline">Delete</button></td>
          </tr></tbody>
        </table></div>
      </section>
      <p class="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{{ report.basis }}</p>
    </template>
  </main>
</template>
