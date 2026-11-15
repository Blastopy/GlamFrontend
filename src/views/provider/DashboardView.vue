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

const STATUS = {
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', badge: 'bg-clay-50 text-clay-700 ring-clay-200', dot: 'bg-clay-600' },
  in_progress: { label: 'In progress', badge: 'bg-ink text-white ring-ink', dot: 'bg-clay-400' },
  completed: { label: 'Completed', badge: 'bg-sage-50 text-sage-700 ring-sage-200', dot: 'bg-sage-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-ink/5 text-ink-soft ring-ink/10', dot: 'bg-ink/30' },
  no_show: { label: 'No show', badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
}
const statusOf = (appt) => STATUS[appt.status] || { label: String(appt.status || '').replace('_', ' '), badge: 'bg-ink/5 text-ink-soft ring-ink/10', dot: 'bg-ink/30' }

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

function setFilter(value) {
  if (filterStatus.value === value) return
  filterStatus.value = value
  load()
}

const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z'

const firstName = computed(() => auth.user?.name?.split(' ')[0] || '')

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
})

const todayLabel = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })

const isToday = (d) => new Date(d).toDateString() === new Date().toDateString()
const todaysCount = computed(() => store.list.filter((a) => isToday(a.scheduled_at) && !['cancelled', 'no_show'].includes(a.status)).length)
const pendingCount = computed(() => store.list.filter((a) => a.status === 'pending').length)

const hasChart = computed(() => clientStats.value?.new_clients_series?.values?.some((v) => v > 0))

const fmt = (d, opts) => new Date(d).toLocaleString('en-KE', opts)
const dayNum = (d) => fmt(d, { day: 'numeric' })
const monthShort = (d) => fmt(d, { month: 'short' })
const timeOf = (d) => fmt(d, { hour: 'numeric', minute: '2-digit' })
const dateLine = (d) => fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })

function initial(name) {
  return String(name || '?').trim().charAt(0).toUpperCase()
}
</script>

<template>
  <div class="mx-auto max-w-7xl py-6 sm:py-10">
    <!-- Live toast -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast"
        role="status"
        class="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-2xl shadow-ink/30 sm:left-auto sm:right-6 sm:translate-x-0"
      >
        <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay-400 opacity-75" />
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-clay-500" />
        </span>
        {{ toast }}
      </div>
    </Transition>

    <!-- Header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-clay-300">{{ todayLabel }}</p>
          <h1 class="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {{ greeting }}<template v-if="firstName">,
              <span class="font-accent font-bold text-clay-400">{{ firstName }}</span></template>
          </h1>
          <p class="mt-3 max-w-lg text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            Here’s what’s happening with your bookings and clients.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:max-w-sm lg:w-80">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-white/50">Today</p>
            <p class="mt-1 font-heading text-3xl font-bold">{{ loading ? '–' : todaysCount }}</p>
            <p class="text-xs text-white/60">booking{{ todaysCount === 1 ? '' : 's' }}</p>
          </div>
          <div class="rounded-2xl border border-clay-400/30 bg-clay-600/20 p-4 backdrop-blur">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-clay-200">Awaiting you</p>
            <p class="mt-1 font-heading text-3xl font-bold">{{ loading ? '–' : pendingCount }}</p>
            <p class="text-xs text-white/60">to confirm</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Subscription status — only shown at all while the admin has payments enabled -->
    <div
      v-if="subscriptionBannerStyle"
      :class="[
        'mt-6 flex flex-col gap-3 rounded-2xl border px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between',
        subscriptionBannerStyle === 'expired' ? 'border-red-200 bg-red-50 text-red-800' :
        subscriptionBannerStyle === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' :
        'border-sage-200 bg-sage-50 text-sage-700',
      ]"
    >
      <span class="flex items-center gap-3">
        <span
          :class="[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            subscriptionBannerStyle === 'expired' ? 'bg-red-100 text-red-600' :
            subscriptionBannerStyle === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-sage-100 text-sage-700',
          ]"
        >
          <svg v-if="subscriptionBannerStyle === 'ok'" viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
            <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
            <path d="M10 6.5v4M10 13.5h.01M8.7 3.3 2.4 14.5A1.5 1.5 0 0 0 3.7 16.7h12.6a1.5 1.5 0 0 0 1.3-2.2L11.3 3.3a1.5 1.5 0 0 0-2.6 0Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span v-if="subscriptionBannerStyle === 'expired'" class="font-medium">Your subscription has expired — you’re not visible to clients right now.</span>
        <span v-else class="font-medium">{{ subscription.days_left }} day{{ subscription.days_left === 1 ? '' : 's' }} left on your subscription</span>
      </span>
      <RouterLink
        to="/provider/activate"
        :class="[
          'inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition',
          subscriptionBannerStyle === 'expired' ? 'bg-clay-600 text-white shadow-md shadow-clay-600/25 hover:bg-clay-700' : 'border border-current/20 bg-white/60 hover:bg-white',
        ]"
      >
        {{ subscriptionBannerStyle === 'expired' ? 'Renew now' : 'Manage subscription' }}
      </RouterLink>
    </div>

    <!-- Client analytics -->
    <section aria-labelledby="clients-title" class="mt-10">
      <h2 id="clients-title" class="font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Your <span class="font-accent font-bold text-clay-600">clients</span>
      </h2>

      <div v-if="analyticsLoading" class="mt-5 grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4" role="status" aria-label="Loading client stats">
        <div v-for="n in 4" :key="n" class="h-28 rounded-2xl border border-ink/10 bg-white" />
      </div>

      <template v-else-if="clientStats">
        <div class="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Total clients</p>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <circle cx="7.5" cy="7" r="2.75" stroke="currentColor" stroke-width="1.5" />
                  <path d="M2.5 16c.5-2.6 2.5-4 5-4s4.5 1.4 5 4M13 4.5a2.5 2.5 0 0 1 0 5M14.5 12.2c1.6.5 2.7 1.8 3 3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </span>
            </div>
            <p class="mt-3 font-heading text-3xl font-bold text-ink">{{ clientStats.total_clients }}</p>
          </div>

          <div class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">New this month</p>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <circle cx="8" cy="7" r="2.75" stroke="currentColor" stroke-width="1.5" />
                  <path d="M3 16c.5-2.6 2.5-4 5-4 1.2 0 2.3.3 3.1.9M15 11v5M12.5 13.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </span>
            </div>
            <p class="mt-3 font-heading text-3xl font-bold text-ink">{{ clientStats.new_clients_this_month }}</p>
          </div>

          <div class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Repeat clients</p>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M15.5 8A6 6 0 0 0 4.6 6.2M4.5 12a6 6 0 0 0 10.9 1.8M4 3v3.5h3.5M16 17v-3.5h-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </div>
            <p class="mt-3 font-heading text-3xl font-bold text-ink">{{ clientStats.repeat_clients }}</p>
            <div class="mt-2 flex items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/5">
                <div class="h-full rounded-full bg-clay-600" :style="{ width: `${Math.round(clientStats.repeat_rate * 100)}%` }" />
              </div>
              <span class="text-xs font-semibold text-ink-soft">{{ Math.round(clientStats.repeat_rate * 100) }}%</span>
            </div>
          </div>

          <div class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-soft">Avg. rating</p>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true"><path :d="STAR_PATH" /></svg>
              </span>
            </div>
            <p class="mt-3 font-heading text-3xl font-bold text-ink">
              {{ clientStats.average_rating.toFixed(1) }}
              <span class="text-sm font-medium text-ink-soft">/ 5</span>
            </p>
            <p class="mt-1 text-xs text-ink-soft">{{ clientStats.reviews_count }} review{{ clientStats.reviews_count === 1 ? '' : 's' }}</p>
          </div>
        </div>

        <div v-if="hasChart" class="mt-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5 sm:p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold text-ink">New clients</p>
            <span class="rounded-md bg-paper px-2 py-1 text-xs font-medium text-ink-soft">Last 30 days</span>
          </div>
          <ClientsLineChart :labels="clientStats.new_clients_series.labels" :values="clientStats.new_clients_series.values" />
        </div>
      </template>
    </section>

    <!-- Bookings -->
    <section aria-labelledby="bookings-title" class="mt-12">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="bookings-title" class="font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          <span class="font-accent font-bold text-clay-600">Bookings</span>
        </h2>

        <div role="tablist" aria-label="Filter bookings by status" class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          <div class="inline-flex shrink-0 rounded-2xl border border-ink/10 bg-white p-1 shadow-sm shadow-ink/5">
            <button
              v-for="f in FILTERS"
              :key="f.value || 'all'"
              type="button"
              role="tab"
              :aria-selected="filterStatus === f.value"
              :class="[
                'whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 sm:px-3.5 sm:text-sm',
                filterStatus === f.value ? 'bg-clay-600 text-white shadow-md shadow-clay-600/25' : 'text-ink-soft hover:bg-paper hover:text-ink',
              ]"
              @click="setFilter(f.value)"
            >
              {{ f.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="mt-6 space-y-4" role="status" aria-label="Loading bookings">
        <div v-for="n in 3" :key="n" class="flex animate-pulse gap-4 rounded-2xl border border-ink/10 bg-white p-5">
          <div class="h-16 w-16 shrink-0 rounded-xl bg-clay-100" />
          <div class="flex-1 space-y-3 py-1">
            <div class="h-4 w-1/3 rounded-full bg-ink/10" />
            <div class="h-3 w-1/2 rounded-full bg-ink/5" />
            <div class="h-3 w-1/4 rounded-full bg-ink/5" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!store.list.length" class="mt-6 rounded-3xl border border-dashed border-clay-200 bg-white px-5 py-14 text-center sm:py-16">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
          <svg viewBox="0 0 24 24" fill="none" class="h-7 w-7" aria-hidden="true">
            <path d="M7 3v3m10-3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <h3 class="mt-6 font-heading text-xl font-semibold text-ink">{{ filterStatus ? 'No bookings with this status' : 'No bookings yet' }}</h3>
        <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          {{ filterStatus ? 'Try another filter to see the rest of your bookings.' : 'New bookings will appear here the moment a client books you.' }}
        </p>
      </div>

      <!-- List -->
      <ul v-else class="mt-6 space-y-4">
        <li
          v-for="appt in store.list"
          :key="appt.id"
          class="relative overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm shadow-ink/5 transition hover:border-clay-200 hover:shadow-lg hover:shadow-ink/5"
        >
          <span aria-hidden="true" :class="['absolute inset-y-0 left-0 w-1', statusOf(appt).dot]" />

          <div class="flex flex-col gap-5 p-5 pl-6 sm:p-6 sm:pl-7 lg:flex-row lg:items-center">
            <!-- Date + client -->
            <div class="flex min-w-0 flex-1 gap-4">
              <div
                :class="[
                  'flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl ring-1',
                  isToday(appt.scheduled_at) ? 'bg-clay-600 text-white ring-clay-600 shadow-md shadow-clay-600/25' : 'bg-paper text-ink-soft ring-ink/5',
                ]"
              >
                <span class="text-[10px] font-semibold uppercase leading-none tracking-wider">{{ isToday(appt.scheduled_at) ? 'Today' : monthShort(appt.scheduled_at) }}</span>
                <span :class="['mt-1 font-heading text-2xl font-bold leading-none', isToday(appt.scheduled_at) ? 'text-white' : 'text-ink']">{{ dayNum(appt.scheduled_at) }}</span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p class="flex min-w-0 items-center gap-2">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{{ initial(appt.client?.name) }}</span>
                    <span class="truncate font-heading text-lg font-semibold text-ink">{{ appt.client?.name }}</span>
                  </p>
                  <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1', statusOf(appt).badge]">
                    <span :class="['h-1.5 w-1.5 rounded-full', statusOf(appt).dot]" />
                    {{ statusOf(appt).label }}
                  </span>
                </div>

                <p class="mt-1 text-sm font-medium text-clay-700">{{ appt.service?.name }}</p>

                <div class="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
                  <span class="inline-flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
                      <path d="M10 6v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    {{ dateLine(appt.scheduled_at) }}, {{ timeOf(appt.scheduled_at) }}
                  </span>
                  <a v-if="appt.client?.phone" :href="`tel:${appt.client.phone}`" class="inline-flex items-center gap-1.5 transition hover:text-clay-700">
                    <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                      <path d="M7.2 3.5H5a1.5 1.5 0 0 0-1.5 1.6c.7 8.1 7.2 14.6 15.3 15.4a1.5 1.5 0 0 0 1.7-1.5v-2.3a1.5 1.5 0 0 0-1.2-1.5l-3.1-.6a1.5 1.5 0 0 0-1.4.4l-1.4 1.4a16 16 0 0 1-6.3-6.3l1.4-1.4a1.5 1.5 0 0 0 .4-1.4l-.6-3.1a1.5 1.5 0 0 0-1.1-1.2Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    {{ appt.client.phone }}
                  </a>
                </div>

                <p v-if="appt.checked_in_at" class="mt-3 inline-flex items-center gap-2 rounded-lg bg-sage-50 px-2.5 py-1.5 text-xs font-semibold text-sage-700 ring-1 ring-sage-200">
                  <span class="relative flex h-2 w-2" aria-hidden="true">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-400 opacity-60" />
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-sage-500" />
                  </span>
                  On the way / arrived at {{ new Date(appt.checked_in_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
                </p>

                <div v-if="appt.is_home_service" class="mt-3 rounded-xl border border-clay-100 bg-clay-50/60 px-4 py-3">
                  <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-clay-700">
                    <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Home visit
                  </p>
                  <p class="mt-1 text-sm text-ink">{{ appt.home_address }}</p>
                  <a v-if="homeDirectionsUrl(appt)" :href="homeDirectionsUrl(appt)" target="_blank" rel="noopener"
                    class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-600 hover:text-clay-700">
                    <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                      <path d="m3.5 9.5 13-6-6 13-1.5-5.5-5.5-1.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                    </svg>
                    Get directions to client
                  </a>
                  <p v-else class="mt-1 text-xs text-ink-soft">Client didn’t share exact coordinates — use the address above.</p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap gap-2 border-t border-ink/10 pt-4 lg:w-44 lg:shrink-0 lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <button v-if="appt.status === 'pending'" type="button" @click="setStatus(appt.id, 'confirmed')"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 lg:flex-none">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Confirm
              </button>
              <button v-if="appt.status === 'confirmed'" type="button" @click="setStatus(appt.id, 'in_progress')"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 lg:flex-none">
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5 text-clay-400" aria-hidden="true">
                  <path d="M6 4.5v11l9-5.5-9-5.5Z" />
                </svg>
                Start
              </button>
              <button v-if="appt.status === 'in_progress'" type="button" @click="setStatus(appt.id, 'completed')"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 lg:flex-none">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Mark complete
              </button>
              <RouterLink v-if="appt.client?.id" :to="`/messages/${appt.client.id}`"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-clay-300 hover:text-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 lg:flex-none">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-4 3V5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                </svg>
                Message
              </RouterLink>
              <button v-if="['pending', 'confirmed'].includes(appt.status)" type="button" @click="setStatus(appt.id, 'cancelled')"
                class="inline-flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 lg:flex-none">
                Cancel
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
