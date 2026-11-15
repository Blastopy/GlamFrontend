<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { extractErrorMessage } from '@/utils/errors'
import providersApi from '@/api/providers'

const auth = useAuthStore()
const notifications = useNotificationsStore()
const form = ref({
  business_name: '', provider_type: 'barber', bio: '', address: '',
  latitude: null, longitude: null,
  offers_home_service: false, home_service_fee: '',
})
const closedReason = ref('')
const saving = ref(false)
const savedMsg = ref('')
const saveError = ref('')
const togglingOpen = ref(false)
const isOpen = ref(null) // current open/closed state as last known; null = unknown
const locating = ref(false)

const TYPES = [
  { value: 'barber', label: 'Barber' },
  { value: 'salon', label: 'Salon' },
  { value: 'manicurist', label: 'Manicurist' },
  { value: 'other', label: 'Other' },
]

onMounted(async () => {
  const profile = auth.user.providerProfile || auth.user.provider_profile
  if (profile) {
    form.value = { ...form.value, ...profile }
    if (typeof profile.is_open === 'boolean') isOpen.value = profile.is_open
    if (profile.closed_reason) closedReason.value = profile.closed_reason
  }
})

async function save() {
  saving.value = true
  savedMsg.value = ''
  saveError.value = ''
  try {
    await providersApi.updateProfile(form.value)
    savedMsg.value = 'Profile updated.'
  } catch (e) {
    saveError.value = extractErrorMessage(e, 'Could not save your profile. Please try again.')
  } finally {
    saving.value = false
  }
}

async function useCurrentLocation() {
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.value.latitude = pos.coords.latitude
      form.value.longitude = pos.coords.longitude
      locating.value = false
    },
    () => {
      locating.value = false
      notifications.error('Could not get your location. Check your browser permissions and try again.')
    }
  )
}

async function toggleOpen(open) {
  togglingOpen.value = true
  try {
    await providersApi.toggleOpen({ is_open: open, closed_reason: open ? null : closedReason.value })
    isOpen.value = open
    savedMsg.value = open ? "You're now shown as open." : "You're now shown as closed."
  } catch (e) {
    notifications.error(extractErrorMessage(e, 'Could not update your open/closed status.'))
  } finally {
    togglingOpen.value = false
  }
}

const hasCoordinates = computed(() =>
  Number.isFinite(parseFloat(form.value.latitude)) && Number.isFinite(parseFloat(form.value.longitude))
)

const initials = computed(() =>
  String(form.value.business_name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?'
)

const publicProfileLink = computed(() => (form.value.id ? `/providers/${form.value.id}` : null))

const inputClass = 'w-full rounded-xl border border-ink/10 bg-paper/40 px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 transition hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100 sm:text-sm'
</script>

<template>
  <div class="mx-auto max-w-7xl py-6 sm:py-10">
    <!-- Header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-5">
          <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-500 to-clay-700 font-heading text-xl font-bold shadow-xl shadow-clay-700/30 ring-4 ring-white/10 sm:h-20 sm:w-20 sm:text-2xl">
            {{ initials }}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-clay-300">Business profile</p>
            <h1 class="mt-1.5 truncate font-heading text-2xl font-semibold tracking-tight sm:text-4xl">
              {{ form.business_name || 'Your business' }}
            </h1>
            <p class="mt-1 text-sm text-white/60">Update how clients see you on Flairplace.</p>
          </div>
        </div>

        <RouterLink
          v-if="publicProfileLink"
          :to="publicProfileLink"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:border-clay-400/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
        >
          <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
            <path d="M1.75 10S4.75 4.5 10 4.5 18.25 10 18.25 10 15.25 15.5 10 15.5 1.75 10 1.75 10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
          </svg>
          View public profile
        </RouterLink>
      </div>
    </header>

    <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <!-- Main form -->
      <form class="min-w-0 space-y-6" novalidate @submit.prevent="save">
        <!-- Business details -->
        <section aria-labelledby="details-title" class="relative overflow-hidden rounded-3xl border border-ink/10 bg-white p-6 shadow-xl shadow-ink/5 sm:p-8">
          <div aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800" />
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Step 1</p>
          <h2 id="details-title" class="mt-1 font-heading text-xl font-semibold text-ink">Business details</h2>

          <div class="mt-6 space-y-5">
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">Business name</span>
              <input v-model="form.business_name" placeholder="e.g. Fade Masters Barbershop" :class="inputClass" />
            </label>

            <fieldset>
              <legend class="mb-2 block text-sm font-medium text-ink">Type</legend>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label v-for="t in TYPES" :key="t.value" class="cursor-pointer">
                  <input v-model="form.provider_type" type="radio" name="provider_type" :value="t.value" class="peer sr-only" />
                  <span class="flex items-center justify-center rounded-xl border border-ink/10 px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:border-clay-300 hover:text-ink peer-checked:border-clay-600 peer-checked:bg-clay-600 peer-checked:text-white peer-checked:shadow-md peer-checked:shadow-clay-600/25 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-400 peer-focus-visible:ring-offset-2">
                    {{ t.label }}
                  </span>
                </label>
              </div>
            </fieldset>

            <label class="block">
              <span class="mb-1.5 flex items-baseline justify-between">
                <span class="text-sm font-medium text-ink">Bio</span>
                <span class="text-xs text-ink-soft">{{ (form.bio || '').length }} characters</span>
              </span>
              <textarea v-model="form.bio" rows="4" placeholder="Tell clients about your experience, specialities and what makes you different." :class="[inputClass, 'resize-y']" />
            </label>
          </div>
        </section>

        <!-- Location -->
        <section aria-labelledby="location-title" class="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm shadow-ink/5 sm:p-8">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Step 2</p>
          <h2 id="location-title" class="mt-1 font-heading text-xl font-semibold text-ink">Location</h2>

          <div class="mt-6 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">Address</span>
              <input v-model="form.address" placeholder="e.g. Shop 12, Kimathi Street, Nairobi" :class="inputClass" />
            </label>

            <div class="flex flex-col gap-3 rounded-2xl bg-paper/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="flex items-start gap-2.5 text-sm">
                <span :class="['mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', hasCoordinates ? 'bg-sage-100 text-sage-700' : 'bg-clay-100 text-clay-700']">
                  <svg v-if="hasCoordinates" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                    <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <svg v-else viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M10 6.5v4M10 13.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </span>
                <span>
                  <span class="block font-medium text-ink">{{ hasCoordinates ? 'Map location set' : 'No map location yet' }}</span>
                  <span class="block text-xs text-ink-soft">{{ hasCoordinates ? 'Clients nearby can find you in map search.' : 'Add it so clients nearby can find you in map search.' }}</span>
                </span>
              </p>
              <button
                type="button"
                :disabled="locating"
                class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 disabled:opacity-60"
                @click="useCurrentLocation"
              >
                <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4 text-clay-400" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" />
                  <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" stroke-width="1.8" />
                </svg>
                {{ locating ? 'Finding you…' : hasCoordinates ? 'Update location' : 'Use my current location' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Home service -->
        <section aria-labelledby="home-title" class="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm shadow-ink/5 sm:p-8">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Step 3</p>
          <h2 id="home-title" class="mt-1 font-heading text-xl font-semibold text-ink">Home visits</h2>

          <label class="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-ink/10 p-4 transition hover:border-clay-300">
            <span class="flex items-start gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span>
                <span class="block text-sm font-semibold text-ink">I can travel to a client’s home</span>
                <span class="block text-xs leading-5 text-ink-soft">Clients will see this and can request a home visit when booking.</span>
              </span>
            </span>
            <input v-model="form.offers_home_service" type="checkbox" class="peer sr-only" />
            <span class="relative h-6 w-11 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-clay-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-400" aria-hidden="true" />
          </label>

          <label v-if="form.offers_home_service" class="mt-4 block">
            <span class="mb-1.5 block text-sm font-medium text-ink">Home visit fee <span class="font-normal text-ink-soft">(KES, optional)</span></span>
            <span class="relative block">
              <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-soft">KES</span>
              <input v-model="form.home_service_fee" type="number" min="0" placeholder="300" :class="[inputClass, 'pl-14']" />
            </span>
            <span class="mt-1.5 block text-xs text-ink-soft">Added on top of the service price for home bookings. Leave blank for no extra charge.</span>
          </label>
        </section>

        <!-- Save bar -->
        <div class="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white/95 p-4 shadow-xl shadow-ink/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div class="min-h-5 text-sm" aria-live="polite">
            <p v-if="saveError" class="flex items-center gap-2 font-medium text-red-700">
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M10 6.5v4M10 13.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              {{ saveError }}
            </p>
            <p v-else-if="savedMsg" class="flex items-center gap-2 font-medium text-sage-700">
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ savedMsg }}
            </p>
            <p v-else class="text-ink-soft">Remember to save after making changes.</p>
          </div>
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ saving ? 'Saving…' : 'Save profile' }}
          </button>
        </div>
      </form>

      <!-- Sidebar -->
      <aside class="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <!-- Open / Closed -->
        <section aria-labelledby="status-title" class="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-xl shadow-ink/5">
          <div
            :class="[
              'px-6 py-5',
              isOpen === true ? 'bg-sage-50' : isOpen === false ? 'bg-ink text-white' : 'bg-paper',
            ]"
          >
            <p :class="['text-[11px] font-semibold uppercase tracking-[0.16em]', isOpen === false ? 'text-clay-300' : 'text-clay-600']">Availability</p>
            <h2 id="status-title" class="mt-1 flex items-center gap-2.5 font-heading text-xl font-semibold">
              <span v-if="isOpen !== null" class="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span v-if="isOpen" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-400 opacity-60" />
                <span :class="['relative inline-flex h-2.5 w-2.5 rounded-full', isOpen ? 'bg-sage-500' : 'bg-white/50']" />
              </span>
              {{ isOpen === true ? 'You’re open' : isOpen === false ? 'You’re closed' : 'Open / Closed' }}
            </h2>
            <p :class="['mt-1 text-xs', isOpen === false ? 'text-white/60' : 'text-ink-soft']">
              {{ isOpen === false && closedReason ? closedReason : 'Let clients know if you’re taking bookings right now.' }}
            </p>
          </div>

          <div class="space-y-3 p-6">
            <button
              type="button"
              :disabled="togglingOpen || isOpen === true"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 disabled:cursor-not-allowed disabled:opacity-50"
              @click="toggleOpen(true)"
            >
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Mark as open
            </button>

            <div class="flex items-center gap-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70" aria-hidden="true">
              <span class="h-px flex-1 bg-ink/10" />or close for now<span class="h-px flex-1 bg-ink/10" />
            </div>

            <label class="block">
              <span class="sr-only">Reason for closing</span>
              <input v-model="closedReason" placeholder="Reason (e.g. Public holiday)" :class="inputClass" />
            </label>
            <button
              type="button"
              :disabled="togglingOpen"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 disabled:cursor-not-allowed disabled:opacity-50"
              @click="toggleOpen(false)"
            >
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 text-clay-400" aria-hidden="true">
                <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.6" />
                <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" stroke-width="1.6" />
              </svg>
              Mark as closed
            </button>
          </div>
        </section>

        <!-- Tips -->
        <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-clay-500 to-clay-700 p-6 text-white shadow-lg shadow-clay-600/20">
          <div aria-hidden="true" class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <h2 class="relative text-base font-semibold">Stand out to clients</h2>
          <ul class="relative mt-3 space-y-2 text-sm text-white/85">
            <li class="flex gap-2"><span aria-hidden="true">•</span>Write a short bio about your speciality.</li>
            <li class="flex gap-2"><span aria-hidden="true">•</span>Set your map location so nearby clients find you.</li>
            <li class="flex gap-2"><span aria-hidden="true">•</span>Add clear photos and prices to each service.</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
