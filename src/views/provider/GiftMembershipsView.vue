<script setup>
import { onMounted, reactive, ref } from 'vue'
import membershipsApi from '@/api/memberships'
import loyaltyApi from '@/api/loyalty'

const plans = ref([])
const subscriptions = ref([])
const customers = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')

const planForm = reactive({
  name: '',
  description: '',
  price: 1000,
  duration_days: 30,
  discount_percent: 0,
})

const memberForm = reactive({
  business_customer_id: '',
  membership_plan_id: '',
})

const money = value =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(Number(value || 0))

async function load() {
  loading.value = true
  error.value = ''

  try {
    const [planResponse, subscriptionResponse, customerResponse] =
      await Promise.all([
        membershipsApi.plans(),
        membershipsApi.subscriptions(),
        loyaltyApi.customers(),
      ])

    plans.value = planResponse.data.data || []
    subscriptions.value = subscriptionResponse.data.data || []
    customers.value = customerResponse.data.data || []
  } catch (e) {
    error.value = e.response?.data?.message ||
      'Could not load membership information.'
  } finally {
    loading.value = false
  }
}

async function savePlan() {
  saving.value = true
  error.value = ''
  message.value = ''

  try {
    await membershipsApi.createPlan({
      ...planForm,
      price: Number(planForm.price),
      duration_days: Number(planForm.duration_days),
      discount_percent: Number(planForm.discount_percent),
    })

    message.value = 'Membership plan created successfully.'

    Object.assign(planForm, {
      name: '',
      description: '',
      price: 1000,
      duration_days: 30,
      discount_percent: 0,
    })

    await load()
  } catch (e) {
    error.value = e.response?.data?.message ||
      Object.values(e.response?.data?.errors || {}).flat()[0] ||
      'Could not create membership plan.'
  } finally {
    saving.value = false
  }
}

async function subscribe() {
  saving.value = true
  error.value = ''
  message.value = ''

  try {
    await membershipsApi.subscribe({
      business_customer_id: Number(memberForm.business_customer_id),
      membership_plan_id: Number(memberForm.membership_plan_id),
    })

    message.value =
      'Membership assigned. Collect and record payment separately.'

    Object.assign(memberForm, {
      business_customer_id: '',
      membership_plan_id: '',
    })

    await load()
  } catch (e) {
    error.value = e.response?.data?.message ||
      Object.values(e.response?.data?.errors || {}).flat()[0] ||
      'Could not assign membership.'
  } finally {
    saving.value = false
  }
}

async function cancelMembership(subscription) {
  const name = subscription.customer?.name || 'this customer'

  if (!window.confirm(`Cancel the membership for ${name}?`)) return

  error.value = ''
  message.value = ''

  try {
    await membershipsApi.cancelSubscription(subscription.id)
    message.value = 'Membership cancelled successfully.'
    await load()
  } catch (e) {
    error.value = e.response?.data?.message ||
      'Could not cancel membership.'
  }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6">
      <p class="text-sm font-medium text-clay-600">Customer retention</p>
      <h1 class="mt-1 font-heading text-3xl text-ink">Memberships</h1>
      <p class="mt-2 text-sm text-ink-soft">
        Create membership packages, assign customers and manage subscriptions.
      </p>
    </header>

    <p v-if="error" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>
    <p v-if="message" class="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
      {{ message }}
    </p>
    <p v-if="loading" class="py-6 text-center text-sm text-ink-soft">
      Loading membership information...
    </p>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Create membership plan</h2>

        <form class="mt-4 grid gap-3" @submit.prevent="savePlan">
          <label class="grid gap-1 text-sm">
            Plan name
            <input v-model.trim="planForm.name" required maxlength="120"
              placeholder="Monthly VIP"
              class="rounded-lg border border-ink/15 px-3 py-2.5" />
          </label>

          <label class="grid gap-1 text-sm">
            Description
            <textarea v-model.trim="planForm.description" maxlength="2000" rows="2"
              placeholder="Describe membership benefits"
              class="rounded-lg border border-ink/15 px-3 py-2.5" />
          </label>

          <div class="grid gap-3 sm:grid-cols-3">
            <label class="grid gap-1 text-sm">
              Price (KES)
              <input v-model.number="planForm.price" type="number" min="0.01"
                step="0.01" required
                class="w-full rounded-lg border border-ink/15 px-3 py-2.5" />
            </label>

            <label class="grid gap-1 text-sm">
              Duration (days)
              <input v-model.number="planForm.duration_days" type="number"
                min="1" max="3650" required
                class="w-full rounded-lg border border-ink/15 px-3 py-2.5" />
            </label>

            <label class="grid gap-1 text-sm">
              Discount (%)
              <input v-model.number="planForm.discount_percent" type="number"
                min="0" max="100" step="0.01"
                class="w-full rounded-lg border border-ink/15 px-3 py-2.5" />
            </label>
          </div>

          <button type="submit" :disabled="saving"
            class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {{ saving ? 'Saving...' : 'Create plan' }}
          </button>
        </form>
      </section>

      <section class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h2 class="font-heading text-xl text-ink">Assign membership</h2>

        <form class="mt-4 grid gap-3" @submit.prevent="subscribe">
          <label class="grid gap-1 text-sm">
            Customer
            <select v-model="memberForm.business_customer_id" required
              class="rounded-lg border border-ink/15 px-3 py-2.5">
              <option value="" disabled>Select customer</option>
              <option v-for="customer in customers" :key="customer.id"
                :value="String(customer.id)">
                {{ customer.name }} · {{ customer.phone || 'No phone' }}
              </option>
            </select>
          </label>

          <label class="grid gap-1 text-sm">
            Membership plan
            <select v-model="memberForm.membership_plan_id" required
              class="rounded-lg border border-ink/15 px-3 py-2.5">
              <option value="" disabled>Select plan</option>
              <option v-for="plan in plans.filter(p => p.is_active)"
                :key="plan.id" :value="String(plan.id)">
                {{ plan.name }} · {{ money(plan.price) }}
              </option>
            </select>
          </label>

          <button type="submit"
            :disabled="saving || !customers.length || !plans.some(p => p.is_active)"
            class="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {{ saving ? 'Processing...' : 'Assign membership' }}
          </button>
        </form>

        <p class="mt-3 text-xs leading-5 text-ink-soft">
          Membership starts on the assignment date. Payment collection and
          recurring renewals are handled separately.
        </p>
      </section>
    </div>

    <section class="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div class="border-b border-ink/10 p-5">
        <h2 class="font-heading text-xl text-ink">Membership plans</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[650px] text-left text-sm">
          <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th class="px-4 py-3">Plan</th>
              <th class="px-4 py-3">Price</th>
              <th class="px-4 py-3">Duration</th>
              <th class="px-4 py-3">Discount</th>
              <th class="px-4 py-3">Subscribers</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            <tr v-for="plan in plans" :key="plan.id">
              <td class="px-4 py-3 font-semibold">{{ plan.name }}</td>
              <td class="px-4 py-3">{{ money(plan.price) }}</td>
              <td class="px-4 py-3">{{ plan.duration_days }} days</td>
              <td class="px-4 py-3">{{ plan.discount_percent }}%</td>
              <td class="px-4 py-3">{{ plan.subscriptions_count || 0 }}</td>
            </tr>
            <tr v-if="!plans.length">
              <td colspan="5" class="px-4 py-6 text-center text-ink-soft">
                No membership plans created yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div class="border-b border-ink/10 p-5">
        <h2 class="font-heading text-xl text-ink">Customer subscriptions</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] text-left text-sm">
          <thead class="bg-paper text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th class="px-4 py-3">Customer</th>
              <th class="px-4 py-3">Plan</th>
              <th class="px-4 py-3">Starts</th>
              <th class="px-4 py-3">Ends</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            <tr v-for="subscription in subscriptions" :key="subscription.id">
              <td class="px-4 py-3 font-semibold">
                {{ subscription.customer?.name || 'Unknown customer' }}
              </td>
              <td class="px-4 py-3">{{ subscription.plan?.name || '—' }}</td>
              <td class="px-4 py-3">{{ subscription.starts_at }}</td>
              <td class="px-4 py-3">{{ subscription.ends_at }}</td>
              <td class="px-4 py-3 capitalize">{{ subscription.status }}</td>
              <td class="px-4 py-3 text-right">
                <button v-if="subscription.status === 'active'" type="button"
                  @click="cancelMembership(subscription)"
                  class="text-xs font-semibold text-red-700 hover:underline">
                  Cancel
                </button>
              </td>
            </tr>
            <tr v-if="!subscriptions.length">
              <td colspan="6" class="px-4 py-6 text-center text-ink-soft">
                No customer memberships yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
