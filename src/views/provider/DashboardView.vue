<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useAppointmentsStore } from '@/stores/appointments'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { extractErrorMessage } from '@/utils/errors'
import { getEcho } from '@/echo'
import subscriptionApi from '@/api/subscription'
import providerAnalyticsApi from '@/api/providerAnalytics'
import ClientsLineChart from '@/components/charts/ClientsLineChart.vue'
import { usePushNotifications } from '@/composables/usePushNotifications'

const store = useAppointmentsStore()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const filterStatus = ref('')
const toast = ref('')
const loading = ref(true)
let channel = null

const subscription = ref(null) // { is_active, expires_at, days_left, payments_enabled }
const clientStats = ref(null)
const analyticsLoading = ref(true)

const push = usePushNotifications()
const showPushPrompt = ref(false)

async function checkPushPromptVisibility() {
  if (!push.isSupported || push.permission.value === 'denied') {
    showPushPrompt.value = false
    return
  }
  showPushPrompt.value = !(await push.isCurrentlySubscribed())
}

async function enablePushNotifications() {
  const ok = await push.subscribe()
  if (ok) {
    showPushPrompt.value = false
    notifications.success("You'll now get a notification when someone books.")
  } else if (push.permission.value === 'denied') {
    notifications.error('Notifications were blocked — enable them in your browser settings to turn this back on.')
  }
}

async function load() {
  loading.value = true
  try {
    await store.fetchList(filterStatus.value ? { status: filterStatus.value } : {})
  } catch {
    // network/server failures are already toasted globally by the axios interceptor
  } finally {
    loading.value = false
  }
}

async function loadSidebarData() {
  analyticsLoading.value = true
  try {
    const [subRes, clientsRes] = await Promise.all([
      subscriptionApi.status(),
      providerAnalyticsApi.clients(),
    ])
    subscription.value = subRes.data
    clientStats.value = clientsRes.data
  } catch {
    // non-critical widgets — the main bookings list above still works without them
  } finally {
    analyticsLoading.value = false
  }
}

function flashToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 4000)
}

onMounted(() => {
  load()
  loadSidebarData()
  checkPushPromptVisibility()

  const providerProfileId = auth.user.providerProfile?.id || auth.user.provider_profile?.id
  channel = getEcho()?.private(`provider.${providerProfileId}`)

  channel
    ?.listen('.appointment.booked', (e) => {
      flashToast(`New booking from ${e.client_name}`)
      load()
    })
    .listen('.appointment.checked-in', (e) => {
      flashToast(`${e.client_name} is on the way`)
      const appt = store.list.find((a) => a.id === e.appointment_id)
      if (appt) appt.checked_in_at = e.checked_in_at
    })
    .listen('.deposit.confirmed', () => {
      flashToast('A deposit was just confirmed')
      load()
    })
    .listen('.subscription.confirmed', () => {
      flashToast('Your subscription payment was confirmed')
      loadSidebarData()
    })
})

onBeforeUnmount(() => {
  const providerProfileId = auth.user.providerProfile?.id || auth.user.provider_profile?.id
  getEcho()?.leave(`provider.${providerProfileId}`)
})

async function setStatus(id, status) {
  try {
    await store.updateStatus(id, status)
  } catch (e) {
    notifications.error(extractErrorMessage(e, 'Could not update this booking. Please try again.'))
  }
}

function homeDirectionsUrl(appt) {
  if (!appt.home_latitude || !appt.home_longitude) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${appt.home_latitude},${appt.home_longitude}`
}

const subscriptionBannerStyle = computed(() => {
  if (!subscription.value || subscription.value.payments_enabled === false) return null
  if (!subscription.value.is_active) return 'expired'
  if (subscription.value.days_left <= 5) return 'warning'
  return 'ok'
})

const statusColor = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  no_show: 'bg-red-100 text-red-700',
}
</script>

<template>
  <div>
    <!-- Push notifications prompt — shown once until they enable or the browser blocks it -->
    <div v-if="showPushPrompt" class="mb-4 px-4 py-3 rounded-lg text-sm bg-blue-50 border border-blue-200 text-blue-700 flex flex-wrap items-center justify-between gap-3">
      <span>Get a notification — with one-tap Accept/Decline — the moment someone books.</span>
      <button @click="enablePushNotifications" :disabled="push.subscribing.value"
        class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium shrink-0 disabled:opacity-50">
        {{ push.subscribing.value ? 'Enabling…' : 'Enable notifications' }}
      </button>
    </div>

    <!-- Subscription status — only shown at all while the admin has payments enabled -->
    <div v-if="subscriptionBannerStyle" :class="[
      'mb-4 px-4 py-3 rounded-lg text-sm flex flex-wrap items-center justify-between gap-2',
      subscriptionBannerStyle === 'expired' ? 'bg-red-50 border border-red-200 text-red-700' :
      subscriptionBannerStyle === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
      'bg-sage-50 border border-sage-200 text-sage-700',
    ]">
      <span v-if="subscriptionBannerStyle === 'expired'">Your subscription has expired — you're not visible to clients right now.</span>
      <span v-else>{{ subscription.days_left }} day{{ subscription.days_left === 1 ? '' : 's' }} left on your subscription</span>
      <RouterLink to="/provider/activate" class="underline font-medium shrink-0">
        {{ subscriptionBannerStyle === 'expired' ? 'Renew now' : 'Manage subscription' }}
      </RouterLink>
    </div>

    <div v-if="toast" class="mb-4 px-4 py-2 bg-clay-50 border border-clay-200 text-clay-700 rounded-lg text-sm">
      {{ toast }}
    </div>

    <!-- Client analytics -->
    <div class="mb-6">
      <h2 class="text-base font-semibold text-ink mb-3">Your clients</h2>

      <p v-if="analyticsLoading" class="text-gray-400 text-sm">Loading…</p>

      <template v-else-if="clientStats">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div class="bg-white rounded-xl border border-gray-100 p-3">
            <p class="text-xs text-gray-500">Total clients</p>
            <p class="text-xl font-semibold text-ink">{{ clientStats.total_clients }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-100 p-3">
            <p class="text-xs text-gray-500">New this month</p>
            <p class="text-xl font-semibold text-ink">{{ clientStats.new_clients_this_month }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-100 p-3">
            <p class="text-xs text-gray-500">Repeat clients</p>
            <p class="text-xl font-semibold text-ink">{{ clientStats.repeat_clients }}
              <span class="text-xs font-normal text-gray-400">({{ Math.round(clientStats.repeat_rate * 100) }}%)</span>
            </p>
          </div>
          <div class="bg-white rounded-xl border border-gray-100 p-3">
            <p class="text-xs text-gray-500">Avg. rating</p>
            <p class="text-xl font-semibold text-ink">⭐ {{ clientStats.average_rating.toFixed(1) }}
              <span class="text-xs font-normal text-gray-400">({{ clientStats.reviews_count }})</span>
            </p>
          </div>
        </div>

        <div v-if="clientStats.new_clients_series?.values?.some(v => v > 0)" class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-sm font-medium text-ink mb-2">New clients (last 30 days)</p>
          <ClientsLineChart :labels="clientStats.new_clients_series.labels" :values="clientStats.new_clients_series.values" />
        </div>
      </template>
    </div>

    <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
      <h1 class="text-lg font-semibold">Bookings</h1>
      <select v-model="filterStatus" @change="load" class="text-sm px-3 py-2 border rounded-lg">
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
      </select>
    </div>

    <p v-if="loading" class="text-gray-400 text-sm">Loading…</p>
    <div v-else-if="!store.list.length" class="text-gray-400 text-sm">No bookings yet.</div>

    <div v-for="appt in store.list" :key="appt.id" class="bg-white rounded-xl border border-gray-100 p-4 mb-3">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-medium">{{ appt.client?.name }} <span class="text-gray-400 text-sm">· {{ appt.client?.phone }}</span></p>
          <p class="text-sm text-gray-500">{{ appt.service?.name }} · {{ new Date(appt.scheduled_at).toLocaleString() }}</p>
          <p v-if="appt.checked_in_at" class="text-sm text-green-600 mt-1">
            🚶 On the way / arrived at {{ new Date(appt.checked_in_at).toLocaleTimeString() }}
          </p>

          <div v-if="appt.is_home_service" class="mt-2 bg-clay-50 border border-clay-200 rounded-lg px-3 py-2">
            <p class="text-sm text-clay-700 font-medium">🏠 Home visit</p>
            <p class="text-sm text-clay-700">{{ appt.home_address }}</p>
            <a v-if="homeDirectionsUrl(appt)" :href="homeDirectionsUrl(appt)" target="_blank" rel="noopener"
              class="inline-block mt-1 text-sm text-clay-600 underline">
              Get directions to client
            </a>
            <p v-else class="text-xs text-clay-600/70 mt-1">Client didn't share exact coordinates — use the address above.</p>
          </div>
        </div>
        <span :class="['text-xs px-2 py-1 rounded-full', statusColor[appt.status]]">{{ appt.status.replace('_', ' ') }}</span>
      </div>

      <div class="flex flex-wrap gap-2 mt-3">
        <button v-if="appt.status === 'pending'" @click="setStatus(appt.id, 'confirmed')"
          class="text-sm px-3 py-1.5 rounded-lg bg-clay-600 text-white">Confirm</button>
        <button v-if="appt.status === 'confirmed'" @click="setStatus(appt.id, 'in_progress')"
          class="text-sm px-3 py-1.5 rounded-lg bg-purple-600 text-white">Start</button>
        <button v-if="appt.status === 'in_progress'" @click="setStatus(appt.id, 'completed')"
          class="text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white">Mark complete</button>
        <button v-if="['pending', 'confirmed'].includes(appt.status)" @click="setStatus(appt.id, 'cancelled')"
          class="text-sm px-3 py-1.5 rounded-lg border text-gray-500">Cancel</button>
        <RouterLink v-if="appt.client?.id" :to="`/messages/${appt.client.id}`"
          class="text-sm px-3 py-1.5 rounded-lg border text-clay-600 border-clay-200">Message client</RouterLink>
      </div>
    </div>
  </div>
</template>
