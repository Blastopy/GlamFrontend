<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/api/client'
import posApi from '@/api/pos'
import inventoryApi from '@/api/inventory'
import { useNotificationsStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'

const notifications = useNotificationsStore()
const auth = useAuthStore()
const branches = ref([])
const services = ref([])
const inventoryItems = ref([])
const sessions = ref([])
const sales = ref([])
const loyaltyCustomers = ref([])
const loyaltyConfig = ref({ enabled: false, point_value: 0, minimum_redemption_points: 0 })
const selectedCustomerId = ref('')
const loyaltyPointsToRedeem = ref(0)
const giftCardCode = ref('')
const giftCardBalance = ref(0)
const branchId = ref('')
const selected = ref({})
const customerName = ref('')
const customerPhone = ref('')
const mpesaPhone = ref('')
const method = ref('cash')
const openingCash = ref(0)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const receipt = ref(null)

const selectedItems = computed(() => [
  ...services.value.filter(s => selected.value['service-' + s.id]).map(s => ({ type: 'service', id: s.id, quantity: Number(selected.value['service-' + s.id]) })),
  ...inventoryItems.value.filter(i => selected.value['inventory-' + i.id]).map(i => ({ type: 'inventory', id: i.id, quantity: Number(selected.value['inventory-' + i.id]) })),
])
const subtotal = computed(() => selectedItems.value.reduce((sum, row) => {
  const item = row.type === 'service' ? services.value.find(s => s.id === row.id) : inventoryItems.value.find(i => i.id === row.id)
  const price = row.type === 'service' ? item?.price : item?.selling_price
  return sum + Number(price || 0) * row.quantity
}, 0))
const activeSession = computed(() => sessions.value.find(s => s.branch_id === Number(branchId.value) && s.user_id === auth.user?.id && s.status === 'open'))
const selectedCustomer = computed(() => loyaltyCustomers.value.find(c => c.id === Number(selectedCustomerId.value)) || null)
const loyaltyDiscount = computed(() => Number(loyaltyPointsToRedeem.value || 0) * Number(loyaltyConfig.value.point_value || 0))
const giftCardDiscount = computed(() => Math.min(Number(giftCardBalance.value || 0), Math.max(0, subtotal.value - loyaltyDiscount.value)))
const total = computed(() => Math.max(0, subtotal.value - loyaltyDiscount.value - giftCardDiscount.value))
const money = value => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0))

async function load() {
  loading.value = true
  try {
    const [options, sessionRes, loyaltyRes] = await Promise.all([
      api.get('/provider/calendar/options'),
      posApi.sessions(),
      posApi.loyaltyCustomers(),
    ])
    services.value = options.data.services || []
    branches.value = options.data.branches || []
    if (!branchId.value && branches.value.length) branchId.value = String((branches.value.find(b => b.is_default) || branches.value[0]).id)
    sessions.value = sessionRes.data
    loyaltyConfig.value = { enabled: Boolean(loyaltyRes.data.enabled), point_value: Number(loyaltyRes.data.point_value || 0), minimum_redemption_points: Number(loyaltyRes.data.minimum_redemption_points || 0) }
    loyaltyCustomers.value = loyaltyRes.data.customers || []
    if (branchId.value) {
      const [salesRes, stockRes] = await Promise.all([
        posApi.sales({ branch_id: branchId.value }),
        inventoryApi.list({ branch_id: branchId.value }),
      ])
      sales.value = salesRes.data
      inventoryItems.value = stockRes.data.items || []
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not load POS.'
  } finally {
    loading.value = false
  }
}

async function refreshSales() {
  const { data } = await posApi.sales({ branch_id: branchId.value || undefined })
  sales.value = data
}

async function startCashSession() {
  busy.value = true
  try {
    await posApi.openSession({ branch_id: Number(branchId.value), opening_cash: Number(openingCash.value || 0) })
    notifications.success('Cash session opened.')
    const { data } = await posApi.sessions()
    sessions.value = data
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not open cash session.'
  } finally { busy.value = false }
}

async function lookupGiftCard() {
  giftCardBalance.value = 0
  if (!giftCardCode.value.trim()) return
  try {
    const { data } = await posApi.giftCard(giftCardCode.value.trim())
    giftCardBalance.value = Number(data.balance || 0)
  } catch (e) {
    error.value = e.response?.data?.message || 'Gift card could not be validated.'
  }
}

async function checkout() {
  error.value = ''
  if (!selectedItems.value.length) { error.value = 'Choose at least one service.'; return }
  if (loyaltyPointsToRedeem.value > 0 && !selectedCustomer.value) { error.value = 'Select a registered customer before redeeming points.'; return }
  if (loyaltyPointsToRedeem.value > 0 && loyaltyPointsToRedeem.value < loyaltyConfig.value.minimum_redemption_points) { error.value = `At least ${loyaltyConfig.value.minimum_redemption_points} points are required to redeem.`; return }
  if (loyaltyPointsToRedeem.value > Number(selectedCustomer.value?.points_balance || 0)) { error.value = 'The customer does not have enough points.'; return }
  if (loyaltyDiscount.value > subtotal.value) { error.value = 'Points discount cannot exceed the sale subtotal.'; return }
  if (method.value === 'cash' && total.value > 0 && !activeSession.value) { error.value = 'Open a cash session before recording cash payments.'; return }
  if (method.value === 'mpesa' && total.value > 0 && !mpesaPhone.value) { error.value = 'Enter the customer phone number for the M-Pesa prompt.'; return }
  busy.value = true
  try {
    const payload = {
      branch_id: Number(branchId.value),
      business_customer_id: selectedCustomerId.value ? Number(selectedCustomerId.value) : null,
      customer_name: customerName.value || selectedCustomer.value?.name || null,
      customer_phone: customerPhone.value || selectedCustomer.value?.phone || null,
      loyalty_points: Number(loyaltyPointsToRedeem.value) > 0 ? Number(loyaltyPointsToRedeem.value) : undefined,
      gift_card_code: giftCardCode.value.trim() || undefined,
      items: selectedItems.value,
      payments: total.value <= 0 || method.value === 'mpesa' ? [] : [{ method: method.value, amount: Number(total.value), cash_session_id: method.value === 'cash' ? activeSession.value.id : null }],
    }
    const { data } = await posApi.checkout(payload)
    receipt.value = data
    selected.value = {}
    customerName.value = ''
    customerPhone.value = ''
    selectedCustomerId.value = ''
    loyaltyPointsToRedeem.value = 0
    giftCardCode.value = ''
    giftCardBalance.value = 0
    const phoneForPrompt = mpesaPhone.value
    mpesaPhone.value = ''
    await refreshSales()
    const { data: refreshedLoyalty } = await posApi.loyaltyCustomers()
    loyaltyCustomers.value = refreshedLoyalty.customers || []
    if (method.value === 'mpesa' && (Number(data.total) - Number(data.gift_card_amount || 0)) > 0) {
      try {
        const { data: prompt } = await posApi.initiateMpesa(data.id, { phone: phoneForPrompt, amount: Number(data.total) - Number(data.gift_card_amount || 0) })
        receipt.value = { ...data, mpesa_payment: prompt }
      } catch (e) {
        error.value = e.response?.data?.message || 'Sale was recorded, but the M-Pesa prompt could not be started.'
      }
    }
    if (method.value === 'cash' && Number(data.total) > 0) {
      const { data: updatedSessions } = await posApi.sessions()
      sessions.value = updatedSessions
    }
    notifications.success('Sale recorded.')
  } catch (e) {
    error.value = e.response?.data?.message || 'Checkout failed.'
  } finally { busy.value = false }
}

async function refundSale(sale) {
  if (!activeSession.value) { error.value = 'Open a cash session before recording a cash refund.'; return }
  const amount = window.prompt('Refund amount for ' + sale.receipt_number + ' (KES):')
  if (amount === null) return
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) { error.value = 'Enter a valid refund amount.'; return }
  const reason = window.prompt('Reason for refund:')
  if (!reason?.trim()) return
  try {
    await posApi.refund(sale.id, { amount: value, method: 'cash', reason: reason.trim() })
    notifications.success('Refund recorded.')
    await refreshSales()
  } catch (e) { error.value = e.response?.data?.message || 'Could not record refund.' }
}

function printReceipt() { window.print() }

async function checkMpesaStatus() {
  if (!receipt.value?.mpesa_payment?.payment_id) return
  try {
    const { data } = await posApi.paymentStatus(receipt.value.id, receipt.value.mpesa_payment.payment_id)
    receipt.value.mpesa_payment = data
    if (data.status === 'completed') notifications.success('M-Pesa payment confirmed.')
  } catch (e) { error.value = e.response?.data?.message || 'Could not check M-Pesa status.' }
}

async function closeSession(session) {
  const amount = window.prompt('Counted cash at closing (KES):')
  if (amount === null) return
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0) { error.value = 'Enter a valid counted cash amount.'; return }
  try {
    const { data } = await posApi.closeSession(session.id, { closing_cash: value })
    notifications.success(`Session closed. Cash variance: ${money(data.cash_difference)}`)
    const { data: updated } = await posApi.sessions()
    sessions.value = updated
  } catch (e) { error.value = e.response?.data?.message || 'Could not close session.' }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p class="text-sm font-medium text-clay-600">Business operations</p><h1 class="mt-1 font-heading text-3xl text-ink">Point of Sale</h1><p class="mt-2 text-sm text-ink-soft">Record service sales and payments, manage cash sessions and view receipts.</p></div>
      <label class="grid gap-1 text-sm">Branch
        <select v-model="branchId" @change="load" class="rounded-xl border border-ink/15 bg-white px-3 py-2.5">
          <option v-for="b in branches" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
        </select>
      </label>
    </header>
    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <div v-if="loading" class="py-12 text-center text-ink-soft">Loading POS…</div>
    <div v-else class="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
      <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="font-heading text-xl text-ink">New sale</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label v-for="service in services" :key="service.id" class="flex items-center justify-between gap-3 rounded-xl border border-ink/10 p-3">
            <div><p class="text-sm font-semibold">{{ service.name }}</p><p class="text-sm text-ink-soft">{{ money(service.price) }}</p></div>
            <input v-model.number="selected['service-' + service.id]" type="number" min="0" max="100" class="w-20 rounded-lg border border-ink/15 px-2 py-1.5" placeholder="Qty" />
          </label>
          <p v-if="!services.length" class="text-sm text-ink-soft">No active services found.</p>
        </div>
        <h3 class="mt-6 font-semibold text-ink">Retail inventory</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label v-for="item in inventoryItems" :key="'inventory-' + item.id" class="flex items-center justify-between gap-3 rounded-xl border border-ink/10 p-3">
            <div><p class="text-sm font-semibold">{{ item.name }}</p><p class="text-sm text-ink-soft">{{ money(item.selling_price) }} · Available {{ item.stock_quantity }} {{ item.unit }}</p></div>
            <input v-model.number="selected['inventory-' + item.id]" type="number" min="0" :max="item.stock_quantity" class="w-20 rounded-lg border border-ink/15 px-2 py-1.5" placeholder="Qty" />
          </label>
          <p v-if="!inventoryItems.length" class="text-sm text-ink-soft">No active inventory items for this branch.</p>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm">Registered customer (for loyalty)
            <select v-model="selectedCustomerId" @change="customerName = selectedCustomer?.name || ''; customerPhone = selectedCustomer?.phone || ''; loyaltyPointsToRedeem = 0" class="rounded-lg border border-ink/15 px-3 py-2"><option value="">Walk-in customer</option><option v-for="customer in loyaltyCustomers" :key="customer.id" :value="String(customer.id)">{{ customer.name }} · {{ Number(customer.points_balance || 0) }} pts</option></select>
          </label>
          <label class="grid gap-1 text-sm">Customer name <input v-model="customerName" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          <label class="grid gap-1 text-sm">Phone <input v-model="customerPhone" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          <label class="grid gap-1 text-sm">Gift card code (optional) <input v-model.trim="giftCardCode" @input="giftCardBalance = 0" @blur="lookupGiftCard" maxlength="32" class="rounded-lg border border-ink/15 px-3 py-2 uppercase" placeholder="FP-XXXXXXXXXXXX" /></label>
          <label class="grid gap-1 text-sm">Payment method
            <select v-model="method" class="rounded-lg border border-ink/15 px-3 py-2"><option value="cash">Cash</option><option value="mpesa">M-Pesa STK Push</option><option value="card">Card (record only)</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select>
          </label>
          <label v-if="method === 'mpesa'" class="grid gap-1 text-sm">Customer M-Pesa phone <input v-model="mpesaPhone" type="tel" placeholder="07XXXXXXXX" class="rounded-lg border border-ink/15 px-3 py-2" /></label>
          <label v-if="loyaltyConfig.enabled && selectedCustomer" class="grid gap-1 text-sm">Redeem loyalty points (balance: {{ Number(selectedCustomer.points_balance || 0) }})<input v-model.number="loyaltyPointsToRedeem" type="number" min="0" :max="selectedCustomer.points_balance || 0" step="1" class="rounded-lg border border-ink/15 px-3 py-2" /><span class="text-xs text-ink-soft">Minimum {{ loyaltyConfig.minimum_redemption_points }} points · {{ money(loyaltyConfig.point_value) }} per point</span></label>
        </div>
        <div class="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm"><div class="flex justify-between"><span>Subtotal</span><span>{{ money(subtotal) }}</span></div><div v-if="loyaltyDiscount > 0" class="flex justify-between text-emerald-700"><span>Loyalty discount ({{ loyaltyPointsToRedeem }} points)</span><span>-{{ money(loyaltyDiscount) }}</span></div><div class="flex items-center justify-between"><span class="font-semibold">Total</span><span class="font-heading text-2xl font-bold">{{ money(total) }}</span></div></div>
        <button @click="checkout" :disabled="busy || subtotal <= 0 || loyaltyPointsToRedeem > Number(selectedCustomer?.points_balance || 0) || loyaltyDiscount > subtotal" class="mt-4 w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white disabled:opacity-40">{{ busy ? 'Processing…' : 'Complete sale' }}</button>
      </section>
      <aside class="space-y-5">
        <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <h2 class="font-heading text-lg">Cash drawer</h2>
          <div v-if="activeSession" class="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Open session · Starting cash {{ money(activeSession.opening_cash) }}
            <button class="mt-3 block rounded-lg border border-emerald-700/20 px-3 py-2 font-semibold" @click="closeSession(activeSession)">Close & reconcile</button>
          </div>
          <div v-else class="mt-3"><label class="grid gap-1 text-sm">Opening cash <input v-model.number="openingCash" type="number" min="0" class="rounded-lg border border-ink/15 px-3 py-2" /></label><button @click="startCashSession" :disabled="busy" class="mt-3 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold text-white">Open cash session</button></div>
        </section>
        <section class="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <h2 class="font-heading text-lg">Recent sales</h2>
          <div class="mt-3 space-y-3">
            <article v-for="sale in sales.slice(0,10)" :key="sale.id" class="border-b border-ink/5 pb-3 text-sm last:border-0">
              <div class="flex justify-between gap-2"><strong>{{ sale.receipt_number }}</strong><span class="font-semibold">{{ money(sale.total) }}</span></div><p class="mt-1 text-ink-soft">{{ new Date(sale.created_at).toLocaleString('en-KE') }} · {{ sale.status }}</p>
              <button v-if="sale.status !== 'refunded' && sale.status !== 'cancelled' && Number(sale.paid_amount) > Number(sale.refunded_amount)" @click="refundSale(sale)" class="mt-2 text-xs font-semibold text-clay-700 underline">Record cash refund</button>
            </article>
            <p v-if="!sales.length" class="text-sm text-ink-soft">No sales recorded yet.</p>
          </div>
        </section>
      </aside>
    </div>
    <div v-if="receipt" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="receipt=null">
      <section class="print-area w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="font-heading text-xl">Sale recorded</h2><p class="mt-1 text-sm text-ink-soft">{{ receipt.receipt_number }}</p>
        <div class="my-4 space-y-2 text-sm"><p v-for="item in receipt.items" :key="item.id" class="flex justify-between"><span>{{ item.quantity }} × {{ item.name }}</span><span>{{ money(item.line_total) }}</span></p><div class="border-t pt-3 flex justify-between font-bold"><span>Total</span><span>{{ money(receipt.total) }}</span></div></div>
        <p v-if="Number(receipt.loyalty_discount_amount || 0) > 0" class="text-sm text-emerald-700">Loyalty redemption: {{ receipt.loyalty_points_redeemed }} points · -{{ money(receipt.loyalty_discount_amount) }}</p><p class="text-sm">Paid: {{ money(receipt.paid_amount) }} · {{ receipt.status }}</p>
        <div v-if="receipt.mpesa_payment" class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p>{{ receipt.mpesa_payment.message || (receipt.mpesa_payment.status === 'completed' ? 'M-Pesa payment confirmed.' : 'Waiting for customer to approve the M-Pesa prompt.') }}</p>
          <p class="mt-1">Payment status: <strong>{{ receipt.mpesa_payment.status }}</strong></p>
          <p v-if="receipt.mpesa_payment.mpesa_receipt_number">Receipt: {{ receipt.mpesa_payment.mpesa_receipt_number }}</p>
          <button v-if="receipt.mpesa_payment.status === 'pending'" @click="checkMpesaStatus" class="mt-2 rounded-lg border border-amber-800/20 px-3 py-2 font-semibold">Check payment status</button>
        </div>
        <div class="mt-5 flex gap-2"><button @click="printReceipt" class="flex-1 rounded-xl border border-ink/15 px-4 py-2.5 font-semibold">Print receipt</button><button @click="receipt=null" class="flex-1 rounded-xl bg-ink px-4 py-2.5 font-semibold text-white">Done</button></div>
      </section>
    </div>
  </main>
</template>

<style>
@media print {
  body * { visibility: hidden !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; box-shadow: none !important; }
  .print-area button { display: none !important; }
}
</style>
