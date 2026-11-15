<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProvidersStore } from '@/stores/providers'
import { useAppointmentsStore } from '@/stores/appointments'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/utils/errors'
import ProviderMap from '@/components/shared/ProviderMap.vue'

const route = useRoute()
const router = useRouter()
const providers = useProvidersStore()
const appointments = useAppointmentsStore()
const auth = useAuthStore()

const selectedService = ref(null)
const scheduledAt = ref('')
const notes = ref('')
const wantsHomeService = ref(false)
const homeAddress = ref('')
const homeLat = ref(null)
const homeLng = ref(null)
const capturingLocation = ref(false)
const locationCaptured = ref(false)
const booking = ref(false)
const bookedAppointment = ref(null)
const bookError = ref('')
const loadError = ref('')
const brokenUrls = ref(new Set())

function markBroken(url) {
  brokenUrls.value.add(url)
}

async function load() {
  loadError.value = ''
  try {
    await providers.fetchOne(route.params.id)
    scrollToRequestedStyle()
  } catch (e) {
    loadError.value = extractErrorMessage(e, 'Could not load this provider. Please go back and try again.')
  }
}

onMounted(load)

// Arriving from a "trending styles" photo click (?style=<id>) — scroll that
// specific style into view and give it a lasting highlight so it's obvious
// which one they came here for, without forcing a login/booking action.
const highlightedServiceId = computed(() => {
  const id = Number(route.query.style)
  return Number.isFinite(id) ? id : null
})

async function scrollToRequestedStyle() {
  if (!highlightedServiceId.value) return
  await nextTick()
  document.getElementById(`service-${highlightedServiceId.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function pickService(service) {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  selectedService.value = service
  bookedAppointment.value = null
}

function bookAnother() {
  bookedAppointment.value = null
  selectedService.value = null
  scheduledAt.value = ''
  notes.value = ''
  wantsHomeService.value = false
  homeAddress.value = ''
  homeLat.value = null
  homeLng.value = null
  locationCaptured.value = false
}

/**
 * Best-effort — lets the provider get real turn-by-turn directions instead of
 * just a typed address. Entirely optional: declining the browser permission
 * just means the provider works from the typed address alone, same as before.
 */
function captureLocation() {
  if (!navigator.geolocation) return
  capturingLocation.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      homeLat.value = pos.coords.latitude
      homeLng.value = pos.coords.longitude
      locationCaptured.value = true
      capturingLocation.value = false
    },
    () => {
      capturingLocation.value = false
      // Silent failure — the typed address still works fine without this
    }
  )
}

const minScheduledAt = computed(() => {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  return now.toISOString().slice(0, 16)
})

const homeServiceFee = computed(() => parseFloat(providers.current?.home_service_fee) || 0)

const estimatedTotal = computed(() => {
  if (!selectedService.value) return 0
  const base = Number(selectedService.value.price)
  return wantsHomeService.value ? base + homeServiceFee.value : base
})

async function submitBooking() {
  bookError.value = ''

  if (new Date(scheduledAt.value) <= new Date()) {
    bookError.value = 'Please choose a time in the future.'
    return
  }

  if (wantsHomeService.value && !homeAddress.value.trim()) {
    bookError.value = 'Please add the address for your home visit.'
    return
  }

  booking.value = true
  try {
    const appt = await appointments.book({
      service_id: selectedService.value.id,
      scheduled_at: scheduledAt.value,
      client_notes: notes.value,
      is_home_service: wantsHomeService.value,
      home_address: wantsHomeService.value ? homeAddress.value : null,
      home_latitude: wantsHomeService.value ? homeLat.value : null,
      home_longitude: wantsHomeService.value ? homeLng.value : null,
    })
    bookedAppointment.value = appt
  } catch (e) {
    bookError.value = extractErrorMessage(e, 'Could not book this slot. Please try a different time.')
  } finally {
    booking.value = false
  }
}

const providerLat = computed(() => parseFloat(providers.current?.latitude))
const providerLng = computed(() => parseFloat(providers.current?.longitude))
const hasLocation = computed(() => Number.isFinite(providerLat.value) && Number.isFinite(providerLng.value))

const mapMarkers = computed(() => hasLocation.value ? [{
  id: providers.current.id,
  lat: providerLat.value,
  lng: providerLng.value,
  title: providers.current.business_name,
  subtitle: providers.current.address,
}] : [])

const directionsUrl = computed(() =>
  hasLocation.value
    ? `https://www.google.com/maps/dir/?api=1&destination=${providerLat.value},${providerLng.value}`
    : null
)

/**
 * Computed from the actually-loaded review list rather than the cached
 * `reviews_count`/`average_rating` columns on the provider record — those
 * columns depend on every code path that creates a review remembering to
 * update them, and if any ever doesn't, the count silently drifts to zero
 * while real reviews still exist and render below. Deriving straight from
 * the array that's already on screen can't drift, by construction.
 */
const reviewCount = computed(() => providers.current?.reviews?.length || 0)

const displayAverageRating = computed(() => {
  const reviews = providers.current?.reviews || []
  if (!reviews.length) return 0
  return reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
})

const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z'

// How many reviews gave each star value (5 → 1), for the rating summary bars.
const ratingBreakdown = computed(() => {
  const reviews = providers.current?.reviews || []
  return [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length
    return { star, count, pct: reviews.length ? (count / reviews.length) * 100 : 0 }
  })
})

const coverImage = computed(() => {
  const url = providers.current?.services?.find((s) => s.image_url && !brokenUrls.value.has(s.image_url))?.image_url
  return url || null
})

const initials = computed(() =>
  String(providers.current?.business_name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
)

const startingPrice = computed(() => {
  const prices = (providers.current?.services || []).map((s) => Number(s.price)).filter(Number.isFinite)
  return prices.length ? Math.min(...prices) : null
})

function formatReviewDate(d) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inputClass = 'w-full rounded-xl border border-ink/10 bg-paper/40 px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 transition hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100 sm:text-sm'
</script>

<template>
  <!-- Error -->
  <div v-if="loadError" class="mx-auto max-w-lg py-16 text-center">
    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="h-6 w-6">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7" />
        <path d="M12 8v4.5M12 15.5h.01" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
      </svg>
    </div>
    <p class="mt-5 text-sm text-ink-soft">{{ loadError }}</p>
    <button type="button" class="mt-5 rounded-xl bg-clay-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2" @click="load">
      Try again
    </button>
  </div>

  <!-- Loading skeleton -->
  <div v-else-if="!providers.current" class="mx-auto max-w-7xl animate-pulse py-6 sm:py-10" role="status" aria-label="Loading provider">
    <div class="h-56 rounded-3xl bg-ink/10 sm:h-64" />
    <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="grid gap-4 sm:grid-cols-2">
        <div v-for="n in 4" :key="n" class="h-56 rounded-2xl bg-ink/5" />
      </div>
      <div class="h-80 rounded-2xl bg-ink/5" />
    </div>
  </div>

  <div v-else class="mx-auto max-w-7xl py-6 sm:py-10">
    <!-- Header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink text-white">
      <img v-if="coverImage" :src="coverImage" alt="" aria-hidden="true"
        class="absolute inset-0 h-full w-full object-cover opacity-30 lg:left-1/2 lg:w-1/2 lg:opacity-60" />
      <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/50" />
      <div aria-hidden="true" class="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-clay-600/35 blur-3xl" />

      <div class="relative px-5 py-8 sm:px-10 sm:py-12 lg:px-12">
        <nav aria-label="Breadcrumb">
          <ol class="flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/50">
            <li><RouterLink to="/" class="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">Home</RouterLink></li>
            <li aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5"><path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </li>
            <li><RouterLink to="/providers" class="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">Providers</RouterLink></li>
            <li aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5"><path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </li>
            <li aria-current="page" class="max-w-[12rem] truncate text-clay-300">{{ providers.current.business_name }}</li>
          </ol>
        </nav>

        <div class="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-500 to-clay-700 font-heading text-2xl font-bold shadow-xl shadow-clay-700/30 ring-4 ring-white/10 sm:h-24 sm:w-24 sm:text-3xl">
            {{ initials }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-300">{{ providers.current.provider_type }}</span>
              <span :class="[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                providers.current.is_open ? 'bg-sage-500/20 text-sage-200 ring-1 ring-sage-400/40' : 'bg-white/10 text-white/70 ring-1 ring-white/15',
              ]">
                <span :class="['h-1.5 w-1.5 rounded-full', providers.current.is_open ? 'bg-sage-400' : 'bg-white/50']" />
                {{ providers.current.is_open ? 'Open now' : providers.current.closed_reason || 'Closed' }}
              </span>
            </div>

            <h1 class="mt-2 break-words font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {{ providers.current.business_name }}
            </h1>

            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/70">
              <span class="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 text-amber-400" aria-hidden="true"><path :d="STAR_PATH" /></svg>
                <span class="font-semibold text-white">{{ reviewCount ? displayAverageRating.toFixed(1) : 'New' }}</span>
                <span v-if="reviewCount">({{ reviewCount }} review{{ reviewCount === 1 ? '' : 's' }})</span>
              </span>
              <span v-if="providers.current.address" class="inline-flex min-w-0 items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 1 0-11 0c0 4.4 5.5 9 5.5 9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                  <circle cx="10" cy="8.5" r="2" stroke="currentColor" stroke-width="1.5" />
                </svg>
                <span class="truncate">{{ providers.current.address }}</span>
              </span>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <span v-if="providers.current.is_verified" class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 text-sage-300" aria-hidden="true">
                  <path d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Verified
              </span>
              <span v-if="providers.current.is_featured" class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5 text-amber-400" aria-hidden="true"><path :d="STAR_PATH" /></svg>
                Featured
              </span>
              <span v-if="providers.current.offers_home_service" class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 text-clay-300" aria-hidden="true">
                  <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Home visits{{ homeServiceFee ? ` · +KES ${homeServiceFee.toLocaleString()}` : '' }}
              </span>
            </div>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0">
            <a href="#styles" class="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/30 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
              Book a style
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
            <RouterLink :to="`/messages/${providers.current.user?.id}`" class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-clay-400/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-4 3V5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
              Message
            </RouterLink>
          </div>
        </div>
      </div>
    </header>

    <div class="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
      <!-- Main column -->
      <div class="min-w-0 space-y-10">
        <!-- About -->
        <section v-if="providers.current.bio" aria-labelledby="about-title" class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5 sm:p-7">
          <p id="about-title" class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">About</p>
          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-ink-soft sm:text-base">{{ providers.current.bio }}</p>
        </section>

        <!-- Styles & pricing -->
        <section id="styles" aria-labelledby="styles-title" class="scroll-mt-24">
          <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="styles-title" class="font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Styles &amp; <span class="font-accent font-bold text-clay-600">pricing</span>
              </h2>
              <p class="mt-1 text-sm text-ink-soft">Pick a style to choose a time and book.</p>
            </div>
            <p v-if="startingPrice !== null" class="rounded-xl bg-clay-50 px-3 py-1.5 text-sm text-clay-800 ring-1 ring-clay-100">
              From <span class="font-semibold">KES {{ startingPrice.toLocaleString() }}</span>
            </p>
          </div>

          <p v-if="!providers.current.services?.length" class="rounded-2xl border border-dashed border-ink/15 bg-white px-5 py-10 text-center text-sm text-ink-soft">
            This provider hasn't listed any styles yet.
          </p>

          <div v-else class="grid gap-4 sm:grid-cols-2">
            <template v-for="s in providers.current.services" :key="s.id">
              <button
                :id="`service-${s.id}`"
                type="button"
                :aria-pressed="selectedService?.id === s.id"
                :class="[
                  'group flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-clay-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2',
                  selectedService?.id === s.id
                    ? 'border-clay-500 ring-4 ring-clay-100'
                    : highlightedServiceId === s.id
                      ? 'border-amber-400 ring-4 ring-amber-100'
                      : 'border-ink/10 hover:border-clay-200',
                ]"
                @click="pickService(s)"
              >
                <div v-if="s.image_url && !brokenUrls.has(s.image_url)" class="relative aspect-[16/10] w-full overflow-hidden bg-paper">
                  <img :src="s.image_url" :alt="s.name" loading="lazy" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" @error="markBroken(s.image_url)" />
                  <span v-if="highlightedServiceId === s.id" class="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink shadow-sm">
                    You picked this
                  </span>
                </div>
                <div class="flex flex-1 flex-col p-5">
                  <div class="flex items-start justify-between gap-3">
                    <h3 class="font-heading text-base font-semibold leading-6 text-ink transition-colors group-hover:text-clay-700">{{ s.name }}</h3>
                    <span class="shrink-0 font-heading text-base font-bold text-clay-600">KES {{ Number(s.price).toLocaleString() }}</span>
                  </div>
                  <p v-if="s.description" class="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-soft">{{ s.description }}</p>
                  <div class="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span class="inline-flex items-center gap-1.5 rounded-md bg-paper px-2 py-1 text-xs font-medium text-ink-soft">
                      <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                        <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
                        <path d="M10 6v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      {{ s.duration_minutes }} min
                    </span>
                    <span :class="[
                      'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition',
                      selectedService?.id === s.id ? 'bg-ink text-white' : 'bg-clay-600 text-white group-hover:bg-clay-700',
                    ]">
                      {{ selectedService?.id === s.id ? 'Selected' : 'Book' }}
                      <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                        <path v-if="selectedService?.id === s.id" d="m5.5 10.5 3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        <path v-else d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>

              <!-- Booking confirmation for this style — spans the full grid width under the clicked card -->
              <div v-if="selectedService?.id === s.id && bookedAppointment" class="relative overflow-hidden rounded-2xl border border-sage-200 bg-white p-6 text-center shadow-lg shadow-ink/5 sm:col-span-2 sm:p-8" role="status">
                <div aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sage-400 to-sage-600" />
                <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-50 text-sage-600 ring-8 ring-sage-50/50">
                  <svg viewBox="0 0 24 24" fill="none" class="h-7 w-7" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                <h3 class="mt-5 font-heading text-xl font-semibold text-ink">Booked!</h3>
                <p class="mt-1 text-sm text-ink-soft">{{ selectedService?.name }} · {{ new Date(bookedAppointment.scheduled_at).toLocaleString() }}</p>
                <p v-if="bookedAppointment.is_home_service" class="mt-1 text-sm text-ink-soft">Home visit at {{ bookedAppointment.home_address }}</p>
                <p class="mt-2 text-xs text-ink-soft">No payment needed — {{ providers.current.business_name }} will confirm shortly.</p>
                <div class="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                  <RouterLink to="/my-appointments" class="rounded-xl bg-clay-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700">View my appointments</RouterLink>
                  <button type="button" class="rounded-xl border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-clay-300 hover:bg-paper" @click="bookAnother">Book another style</button>
                </div>
              </div>

              <!-- Booking form for this style -->
              <div v-else-if="selectedService?.id === s.id" class="relative overflow-hidden rounded-2xl border border-clay-200 bg-white p-5 shadow-xl shadow-clay-600/5 sm:col-span-2 sm:p-7">
                <div aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800" />
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Book appointment</p>
                    <h3 class="mt-1 font-heading text-lg font-semibold text-ink">{{ selectedService.name }}</h3>
                  </div>
                  <button type="button" class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-paper hover:text-ink" @click="selectedService = null">
                    Cancel
                  </button>
                </div>

                <div class="mt-5 grid gap-5 sm:grid-cols-2">
                  <label class="block">
                    <span class="mb-1.5 block text-sm font-medium text-ink">Date &amp; time</span>
                    <input v-model="scheduledAt" type="datetime-local" :min="minScheduledAt" :class="inputClass" />
                  </label>

                  <div v-if="providers.current.offers_home_service" class="flex items-end">
                    <label class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-ink/10 px-4 py-3 text-sm text-ink transition hover:border-clay-300">
                      <span>
                        Book as a home visit
                        <span v-if="homeServiceFee" class="block text-xs text-ink-soft">+KES {{ homeServiceFee.toLocaleString() }}</span>
                      </span>
                      <input v-model="wantsHomeService" type="checkbox" class="peer sr-only" />
                      <span class="relative h-6 w-11 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-clay-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-400" aria-hidden="true" />
                    </label>
                  </div>

                  <div v-if="providers.current.offers_home_service && wantsHomeService" class="sm:col-span-2">
                    <label class="block">
                      <span class="mb-1.5 block text-sm font-medium text-ink">Your address</span>
                      <input v-model="homeAddress" placeholder="e.g. Apartment name, street, area" :class="inputClass" />
                    </label>
                    <button type="button" :disabled="capturingLocation"
                      :class="['mt-2 inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50', locationCaptured ? 'text-sage-700' : 'text-clay-600 hover:text-clay-700']"
                      @click="captureLocation">
                      <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 1 0-11 0c0 4.4 5.5 9 5.5 9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                        <circle cx="10" cy="8.5" r="2" stroke="currentColor" stroke-width="1.6" />
                      </svg>
                      {{ locationCaptured ? 'Location shared with provider' : capturingLocation ? 'Getting your location…' : 'Share my exact location (optional, for directions)' }}
                    </button>
                  </div>

                  <label class="block sm:col-span-2">
                    <span class="mb-1.5 block text-sm font-medium text-ink">Notes for the provider <span class="font-normal text-ink-soft">(optional)</span></span>
                    <textarea v-model="notes" rows="3" :class="[inputClass, 'resize-y']" />
                  </label>
                </div>

                <p v-if="bookError" class="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100">{{ bookError }}</p>

                <div class="mt-6 flex flex-col gap-4 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Estimated total</p>
                    <p class="font-heading text-2xl font-bold text-ink">KES {{ estimatedTotal.toLocaleString() }}</p>
                  </div>
                  <button type="button" :disabled="booking || !scheduledAt"
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    @click="submitBooking">
                    {{ booking ? 'Booking…' : 'Book appointment' }}
                    <svg v-if="!booking" viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                      <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </section>

        <!-- Reviews -->
        <section aria-labelledby="reviews-title">
          <h2 id="reviews-title" class="mb-5 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Client <span class="font-accent font-bold text-clay-600">reviews</span>
            <span class="ml-1 align-middle text-sm font-normal text-ink-soft">({{ reviewCount }})</span>
          </h2>

          <div v-if="!providers.current.reviews?.length" class="rounded-2xl border border-dashed border-ink/15 bg-white px-5 py-10 text-center">
            <p class="text-sm font-medium text-ink">No reviews yet</p>
            <p class="mt-1 text-sm text-ink-soft">Book a style and be the first to share your experience.</p>
          </div>

          <div v-else class="grid gap-4 sm:grid-cols-2">
            <article v-for="r in providers.current.reviews" :key="r.id" class="flex flex-col rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5">
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-50 text-sm font-bold text-clay-700 ring-1 ring-clay-100">
                  {{ (r.client?.name || 'A').charAt(0).toUpperCase() }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-ink">{{ r.client?.name || 'Anonymous' }}</p>
                  <p class="text-xs text-ink-soft">{{ formatReviewDate(r.created_at) }}</p>
                </div>
                <div class="flex shrink-0 gap-0.5" :aria-label="`${Math.round(r.rating)} out of 5 stars`" role="img">
                  <svg v-for="n in 5" :key="n" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                    :class="['h-3.5 w-3.5', n <= Math.round(r.rating) ? 'text-amber-500' : 'text-ink/10']">
                    <path :d="STAR_PATH" />
                  </svg>
                </div>
              </div>
              <p v-if="r.comment" class="mt-3 text-sm leading-6 text-ink-soft">{{ r.comment }}</p>
            </article>
          </div>
        </section>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <!-- Location -->
        <section v-if="hasLocation" aria-labelledby="location-title" class="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl shadow-ink/5">
          <div class="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <h2 id="location-title" class="flex items-center gap-2.5 text-base font-semibold text-ink">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 1 0-11 0c0 4.4 5.5 9 5.5 9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                  <circle cx="10" cy="8.5" r="2" stroke="currentColor" stroke-width="1.6" />
                </svg>
              </span>
              Location
            </h2>
          </div>
          <div class="px-3">
            <div class="overflow-hidden rounded-xl ring-1 ring-ink/10">
              <ProviderMap :markers="mapMarkers" height-class="h-56 sm:h-64 lg:h-56" />
            </div>
          </div>
          <div class="p-5">
            <p v-if="providers.current.address" class="text-sm leading-6 text-ink-soft">{{ providers.current.address }}</p>
            <a :href="directionsUrl" target="_blank" rel="noopener"
              class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 text-clay-400" aria-hidden="true">
                <path d="m3.5 9.5 13-6-6 13-1.5-5.5-5.5-1.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              </svg>
              Get directions
            </a>
          </div>
        </section>

        <!-- Contact -->
        <section aria-labelledby="contact-title" class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5">
          <h2 id="contact-title" class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Contact</h2>
          <div class="mt-3 space-y-2">
            <a v-if="providers.current.user?.phone" :href="`tel:${providers.current.user.phone}`"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M7.2 3.5H5a1.5 1.5 0 0 0-1.5 1.6c.7 8.1 7.2 14.6 15.3 15.4a1.5 1.5 0 0 0 1.7-1.5v-2.3a1.5 1.5 0 0 0-1.2-1.5l-3.1-.6a1.5 1.5 0 0 0-1.4.4l-1.4 1.4a16 16 0 0 1-6.3-6.3l1.4-1.4a1.5 1.5 0 0 0 .4-1.4l-.6-3.1a1.5 1.5 0 0 0-1.1-1.2Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="min-w-0">
                <span class="block text-xs text-ink-soft">Call</span>
                <span class="block truncate text-sm font-semibold text-ink group-hover:text-clay-700">{{ providers.current.user.phone }}</span>
              </span>
            </a>
            <RouterLink :to="`/messages/${providers.current.user?.id}`"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-4 3V5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="min-w-0">
                <span class="block text-xs text-ink-soft">Chat</span>
                <span class="block text-sm font-semibold text-ink group-hover:text-clay-700">Message this provider</span>
              </span>
            </RouterLink>
          </div>
        </section>

        <!-- Rating summary -->
        <section aria-labelledby="rating-title" class="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm shadow-ink/5">
          <h2 id="rating-title" class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Rating</h2>
          <div class="mt-3 flex items-center gap-4">
            <p class="font-heading text-4xl font-bold text-ink">{{ reviewCount ? displayAverageRating.toFixed(1) : '–' }}</p>
            <div>
              <div class="flex gap-0.5" role="img" :aria-label="`${displayAverageRating.toFixed(1)} out of 5 stars`">
                <svg v-for="n in 5" :key="n" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                  :class="['h-4 w-4', n <= Math.round(displayAverageRating) ? 'text-amber-500' : 'text-ink/10']">
                  <path :d="STAR_PATH" />
                </svg>
              </div>
              <p class="mt-1 text-xs text-ink-soft">{{ reviewCount }} review{{ reviewCount === 1 ? '' : 's' }}</p>
            </div>
          </div>
          <ul v-if="reviewCount" class="mt-4 space-y-1.5">
            <li v-for="row in ratingBreakdown" :key="row.star" class="flex items-center gap-2 text-xs text-ink-soft">
              <span class="w-3 text-right font-medium text-ink">{{ row.star }}</span>
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/5">
                <div class="h-full rounded-full bg-clay-600" :style="{ width: `${row.pct}%` }" />
              </div>
              <span class="w-6 text-right">{{ row.count }}</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
