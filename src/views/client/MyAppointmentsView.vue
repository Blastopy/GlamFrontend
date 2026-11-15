<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAppointmentsStore } from '@/stores/appointments'
import { useNotificationsStore } from '@/stores/notifications'
import { extractErrorMessage } from '@/utils/errors'
import ReviewModal from '@/components/shared/ReviewModal.vue'

const store = useAppointmentsStore()
const notifications = useNotificationsStore()
const loading = ref(true)
const reviewingAppointment = ref(null) // the appointment currently open in the review modal, or null

async function load() {
  loading.value = true
  try {
    await store.fetchList()
  } catch {
    // network/server failures are already toasted globally by the axios interceptor
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function checkIn(appointmentId) {
  try {
    await store.checkIn(appointmentId)
  } catch (e) {
    notifications.error(extractErrorMessage(e, 'Could not check in right now.'))
  }
}

async function cancel(appt) {
  if (!confirm('Cancel this appointment?')) return
  try {
    await store.updateStatus(appt.id, 'cancelled')
  } catch (e) {
    notifications.error(extractErrorMessage(e, 'Could not cancel this appointment.'))
  }
}

function openReview(appt) {
  reviewingAppointment.value = appt
}

function handleReviewSubmitted(review) {
  // Attach the new review straight onto the local list — no need to refetch
  // the whole page just to flip one appointment's card into "reviewed" state.
  const appt = store.list.find((a) => a.id === reviewingAppointment.value.id)
  if (appt) appt.review = review
  reviewingAppointment.value = null
  notifications.success('Thanks for your review!')
}

const STATUS = {
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', badge: 'bg-clay-50 text-clay-700 ring-clay-200', dot: 'bg-clay-600' },
  in_progress: { label: 'In progress', badge: 'bg-ink text-white ring-ink', dot: 'bg-clay-400' },
  completed: { label: 'Completed', badge: 'bg-sage-50 text-sage-700 ring-sage-200', dot: 'bg-sage-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-ink/5 text-ink-soft ring-ink/10', dot: 'bg-ink/30' },
  no_show: { label: 'No show', badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
}
const statusOf = (appt) => STATUS[appt.status] || { label: String(appt.status || '').replace('_', ' '), badge: 'bg-ink/5 text-ink-soft ring-ink/10', dot: 'bg-ink/30' }

const TABS = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['pending', 'confirmed', 'in_progress'] },
  { key: 'past', label: 'Past', statuses: ['completed', 'no_show'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
]
const activeTab = ref('upcoming')

const byTab = computed(() => {
  const groups = Object.fromEntries(TABS.map((t) => [t.key, []]))
  for (const appt of store.list) {
    const tab = TABS.find((t) => t.statuses.includes(appt.status))
    groups[tab ? tab.key : 'past'].push(appt)
  }
  const time = (a) => new Date(a.scheduled_at).getTime()
  groups.upcoming.sort((a, b) => time(a) - time(b)) // soonest first
  groups.past.sort((a, b) => time(b) - time(a)) // most recent first
  groups.cancelled.sort((a, b) => time(b) - time(a))
  return groups
})

const visible = computed(() => byTab.value[activeTab.value])
const nextAppointment = computed(() => byTab.value.upcoming[0] || null)

const EMPTY = {
  upcoming: { title: 'No upcoming appointments', text: 'Find a barber, salon or nail specialist and book your next look.' },
  past: { title: 'No past appointments yet', text: 'Appointments you’ve completed will show up here.' },
  cancelled: { title: 'Nothing cancelled', text: 'Appointments you cancel will show up here.' },
}

function canCheckIn(appt) {
  return appt.status === 'confirmed' && !appt.checked_in_at
}

function canCancel(appt) {
  return ['pending', 'confirmed'].includes(appt.status)
}

function canReview(appt) {
  return appt.status === 'completed' && !appt.review
}

const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z'

const fmt = (d, opts) => new Date(d).toLocaleString('en-KE', opts)
const dayNum = (d) => fmt(d, { day: 'numeric' })
const monthShort = (d) => fmt(d, { month: 'short' })
const weekday = (d) => fmt(d, { weekday: 'short' })
const timeOf = (d) => fmt(d, { hour: 'numeric', minute: '2-digit' })
const longDate = (d) => fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })

function relative(d) {
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1 && days < 7) return `In ${days} days`
  return null
}

function providerLink(appt) {
  const id = appt.provider_profile?.id ?? appt.provider_profile_id
  return id ? `/providers/${id}` : null
}
</script>

<template>
  <div class="mx-auto max-w-5xl py-6 sm:py-10">
    <!-- Header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-12">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay-300">
            <span class="h-1.5 w-1.5 rounded-full bg-clay-400" />
            Bookings
          </p>
          <h1 class="mt-5 font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            My <span class="font-accent font-bold text-clay-400">appointments</span>
          </h1>
          <p class="mt-4 max-w-lg text-base leading-7 text-white/70">
            Keep track of upcoming visits, let your provider know you’re on the way, and review past appointments.
          </p>
        </div>

        <!-- Next up -->
        <div v-if="!loading && nextAppointment" class="w-full rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur lg:max-w-xs">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Next up</p>
          <div class="mt-3 flex items-center gap-3">
            <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-clay-600 shadow-lg shadow-clay-600/30">
              <span class="text-[10px] font-semibold uppercase leading-none tracking-wide text-white/80">{{ monthShort(nextAppointment.scheduled_at) }}</span>
              <span class="mt-0.5 font-heading text-xl font-bold leading-none">{{ dayNum(nextAppointment.scheduled_at) }}</span>
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ nextAppointment.provider_profile?.business_name }}</p>
              <p class="truncate text-xs text-white/60">{{ nextAppointment.service?.name }}</p>
              <p class="mt-0.5 text-xs font-medium text-clay-300">
                {{ relative(nextAppointment.scheduled_at) || weekday(nextAppointment.scheduled_at) }} · {{ timeOf(nextAppointment.scheduled_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="mt-8 flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Appointment groups" class="inline-flex rounded-2xl border border-ink/10 bg-white p-1 shadow-sm shadow-ink/5">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          :class="[
            'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 sm:px-4',
            activeTab === tab.key ? 'bg-clay-600 text-white shadow-md shadow-clay-600/25' : 'text-ink-soft hover:bg-paper hover:text-ink',
          ]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span
            v-if="!loading"
            :class="['min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold', activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-ink/5 text-ink-soft']"
          >{{ byTab[tab.key].length }}</span>
        </button>
      </div>

      <RouterLink
        to="/providers"
        class="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-clay-300 hover:text-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
      >
        <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 text-clay-600" aria-hidden="true">
          <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        Book new
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mt-6 space-y-4" role="status" aria-label="Loading appointments">
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
    <div v-else-if="!visible.length" class="mt-6 rounded-3xl border border-dashed border-clay-200 bg-white px-5 py-14 text-center sm:py-20">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
        <svg viewBox="0 0 24 24" fill="none" class="h-7 w-7" aria-hidden="true">
          <path d="M7 3v3m10-3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h2 class="mt-6 font-heading text-xl font-semibold text-ink">{{ EMPTY[activeTab].title }}</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">{{ EMPTY[activeTab].text }}</p>
      <RouterLink
        v-if="activeTab === 'upcoming'"
        to="/providers"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-clay-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2"
      >
        Browse providers
        <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
          <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </RouterLink>
    </div>

    <!-- List -->
    <ul v-else class="mt-6 space-y-4">
      <li
        v-for="appt in visible"
        :key="appt.id"
        :class="[
          'group relative overflow-hidden rounded-2xl border bg-white shadow-sm shadow-ink/5 transition hover:shadow-lg hover:shadow-ink/5',
          appt.status === 'cancelled' ? 'border-ink/10 opacity-80' : 'border-ink/10 hover:border-clay-200',
        ]"
      >
        <span aria-hidden="true" :class="['absolute inset-y-0 left-0 w-1', statusOf(appt).dot]" />

        <div class="flex flex-col gap-5 p-5 pl-6 sm:flex-row sm:items-center sm:p-6 sm:pl-7">
          <!-- Date block -->
          <div class="flex items-center gap-4 sm:block sm:shrink-0">
            <div
              :class="[
                'flex h-16 w-16 flex-col items-center justify-center rounded-xl',
                activeTab === 'upcoming' ? 'bg-clay-50 text-clay-700 ring-1 ring-clay-100' : 'bg-paper text-ink-soft ring-1 ring-ink/5',
              ]"
            >
              <span class="text-[10px] font-semibold uppercase leading-none tracking-wider">{{ monthShort(appt.scheduled_at) }}</span>
              <span class="mt-1 font-heading text-2xl font-bold leading-none text-ink">{{ dayNum(appt.scheduled_at) }}</span>
              <span class="mt-0.5 text-[10px] font-medium uppercase leading-none">{{ weekday(appt.scheduled_at) }}</span>
            </div>
            <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 sm:hidden', statusOf(appt).badge]">
              <span :class="['h-1.5 w-1.5 rounded-full', statusOf(appt).dot]" />
              {{ statusOf(appt).label }}
            </span>
          </div>

          <!-- Details -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <RouterLink
                v-if="providerLink(appt)"
                :to="providerLink(appt)"
                class="truncate font-heading text-lg font-semibold text-ink transition-colors hover:text-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
              >{{ appt.provider_profile?.business_name }}</RouterLink>
              <p v-else class="truncate font-heading text-lg font-semibold text-ink">{{ appt.provider_profile?.business_name }}</p>
              <span :class="['hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 sm:inline-flex', statusOf(appt).badge]">
                <span :class="['h-1.5 w-1.5 rounded-full', statusOf(appt).dot]" />
                {{ statusOf(appt).label }}
              </span>
            </div>

            <p class="mt-1 text-sm font-medium text-clay-700">{{ appt.service?.name }}</p>

            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
              <span class="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                  <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
                  <path d="M10 6v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>
                  <span v-if="activeTab === 'upcoming' && relative(appt.scheduled_at)" class="font-semibold text-ink">{{ relative(appt.scheduled_at) }} · </span>
                  {{ longDate(appt.scheduled_at) }}, {{ timeOf(appt.scheduled_at) }}
                </span>
              </span>
              <span v-if="appt.service?.price" class="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="M3.5 10.6V4.5a1 1 0 0 1 1-1h6.1l6 6a1 1 0 0 1 0 1.4l-5.1 5.1a1 1 0 0 1-1.4 0l-6.6-5.4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                  <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
                </svg>
                KES {{ Number(appt.service.price).toLocaleString() }}
              </span>
              <span v-if="appt.is_home_service" class="inline-flex min-w-0 items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span class="truncate">Home visit{{ appt.home_address ? ` · ${appt.home_address}` : '' }}</span>
              </span>
              <span v-if="appt.checked_in_at" class="inline-flex items-center gap-1.5 font-medium text-sage-700">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Provider notified you’re on the way
              </span>
            </div>

            <div v-if="appt.review" class="mt-3 inline-flex items-center gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-xs text-ink-soft">
              <span class="flex gap-0.5" role="img" :aria-label="`You rated ${Math.round(appt.review.rating)} out of 5`">
                <svg v-for="n in 5" :key="n" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                  :class="['h-3.5 w-3.5', n <= Math.round(appt.review.rating) ? 'text-amber-500' : 'text-ink/10']">
                  <path :d="STAR_PATH" />
                </svg>
              </span>
              You reviewed this
            </div>
          </div>

          <!-- Actions -->
          <div
            v-if="canCheckIn(appt) || canReview(appt) || canCancel(appt)"
            class="flex flex-wrap gap-2 border-t border-ink/10 pt-4 sm:shrink-0 sm:flex-col sm:items-stretch sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"
          >
            <button
              v-if="canCheckIn(appt)"
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 sm:flex-none"
              @click="checkIn(appt.id)"
            >
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="m3.5 9.5 13-6-6 13-1.5-5.5-5.5-1.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              </svg>
              I’m on my way
            </button>
            <button
              v-if="canReview(appt)"
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 sm:flex-none"
              @click="openReview(appt)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 text-amber-400" aria-hidden="true"><path :d="STAR_PATH" /></svg>
              Leave a review
            </button>
            <button
              v-if="canCancel(appt)"
              type="button"
              class="inline-flex flex-1 items-center justify-center rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 sm:flex-none"
              @click="cancel(appt)"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    </ul>

    <ReviewModal
      v-if="reviewingAppointment"
      :appointment-id="reviewingAppointment.id"
      :provider-name="reviewingAppointment.provider_profile?.business_name"
      @submitted="handleReviewSubmitted"
      @close="reviewingAppointment = null"
    />
  </div>
</template>
