<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProvidersStore } from '@/stores/providers'
import providersApi from '@/api/providers'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import heroImage from '@/assets/he.png'
import ProviderCard from '@/components/shared/ProviderCard.vue'
import ToolMotif from '@/components/shared/ToolMotif.vue'
import ProviderMap from '@/components/shared/ProviderMap.vue'
import BeautyCategoryLinks from '@/components/shared/BeautyCategoryLinks.vue'
import { providerDistanceKm } from '@/utils/geo'

const store = useProvidersStore()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const router = useRouter()
const brokenUrls = ref(new Set())
const viewMode = ref('list') // 'list' | 'map'
const trendingTrack = ref(null)
const canScrollTrendingLeft = ref(false)
const canScrollTrendingRight = ref(false)
const searchFocused = ref(false)
const searchResultProviders = ref([])
const providerSearchIndex = ref([])
const providersLoaded = ref(false)
const searchLoading = ref(false)
const resultsForQuery = ref('')
const searchQuery = computed(() => store.filters.search.trim())
const showSearchDropdown = computed(() => searchFocused.value && searchQuery.value.length > 0)

function normalizeSearch(value) {
  return String(value || '').trim().toLocaleLowerCase()
}

const searchSuggestions = computed(() => {
  const query = normalizeSearch(searchQuery.value)
  if (!query || query !== resultsForQuery.value) return []

  const suggestions = []
  for (const provider of searchResultProviders.value) {
    const providerName = String(provider.business_name || '')
    const providerType = String(provider.provider_type || 'Provider')
    const providerLocation = String(provider.address || provider.location || 'Location not listed')
    const providerMatches = normalizeSearch(providerName).includes(query)
    const matchingServices = (provider.services || []).filter((service) =>
      normalizeSearch(service.name || service.title).includes(query)
    )

    if (providerMatches) {
      suggestions.push({
        key: `provider-${provider.id}`,
        kind: 'Provider',
        title: providerName,
        detail: `${providerType} · ${providerLocation}`,
        to: { name: 'provider-profile', params: { id: provider.id } },
      })
    }

    for (const service of matchingServices) {
      suggestions.push({
        key: `service-${provider.id}-${service.id}`,
        kind: 'Style',
        title: service.name || service.title,
        detail: `${providerName} · ${providerType} · ${providerLocation}`,
        to: { name: 'provider-profile', params: { id: provider.id }, query: { style: service.id } },
      })
    }

  }

  return suggestions.slice(0, 8)
})
let closeSearchTimer = null
let searchRequestId = 0

function markBroken(url) {
  brokenUrls.value.add(url)
}

function updateTrendingScroll() {
  const track = trendingTrack.value
  if (!track) return

  canScrollTrendingLeft.value = track.scrollLeft > 1
  canScrollTrendingRight.value = track.scrollLeft + track.clientWidth < track.scrollWidth - 1
}

function scrollTrending(direction) {
  const track = trendingTrack.value
  if (!track) return

  track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' })
}

function handleTrendingResize() {
  updateTrendingScroll()
}

function matchesSearch(provider, query) {
  if (!query) return true
  return normalizeSearch(provider.business_name).includes(query)
    || (provider.services || []).some((service) => normalizeSearch(service.name || service.title).includes(query))
}

function applyProviderSearch() {
  const query = normalizeSearch(searchQuery.value)
  const matches = providerSearchIndex.value.filter((provider) => matchesSearch(provider, query))
  store.list = matches
  searchResultProviders.value = matches
  resultsForQuery.value = query
}

async function loadProviders() {
  const requestId = ++searchRequestId
  const params = { ...store.filters, search: '', page: 1 }
  searchLoading.value = true
  try {
    const response = await providersApi.list(params)
    const pageData = response.data
    const providers = [...(pageData.data || [])]

    for (let page = 2; page <= Number(pageData.last_page || 1); page += 1) {
      if (requestId !== searchRequestId) return
      const nextPage = await providersApi.list({ ...params, page })
      providers.push(...(nextPage.data.data || []))
    }

    if (requestId !== searchRequestId) return
    providerSearchIndex.value = providers
    providersLoaded.value = true
    applyProviderSearch()
  } catch {
    if (requestId === searchRequestId) {
      providerSearchIndex.value = []
      providersLoaded.value = false
      store.list = []
      searchResultProviders.value = []
      resultsForQuery.value = normalizeSearch(searchQuery.value)
    }
    // The axios interceptor already toasts network/server failures
  } finally {
    if (requestId === searchRequestId) searchLoading.value = false
  }
}

function onSearchInput() {
  if (providersLoaded.value) applyProviderSearch()
}

function focusSearch() {
  clearTimeout(closeSearchTimer)
  searchFocused.value = true
}

function blurSearch() {
  clearTimeout(closeSearchTimer)
  closeSearchTimer = setTimeout(() => {
    searchFocused.value = false
  }, 150)
}

const locating = ref(false)

async function findNearby() {
  locating.value = true
  try {
    await store.useMyLocation()
    await loadProviders()
  } catch (e) {
    if (e?.code === 1) {
      notifications.error('Location access was denied — enable it in your browser settings to search nearby.')
    } else {
      notifications.error('Could not get your location. Check your browser permissions and try again.')
    }
  } finally {
    locating.value = false
  }
}

// If the user already granted location access, fetch it silently so the
// "Near you" section fills in without an extra click. Never prompt on load.
async function locateIfAlreadyAllowed() {
  if (hasUserLocation.value || !navigator.permissions?.query) return
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    if (status.state !== 'granted') return
    locating.value = true
    await store.useMyLocation()
    await loadProviders()
  } catch {
    // Fall back to the "Use my location" button
  } finally {
    locating.value = false
  }
}

onMounted(() => {
  loadProviders()
  locateIfAlreadyAllowed()
  window.addEventListener('resize', handleTrendingResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', handleTrendingResize))

const allPhotos = computed(() =>
  store.list
    .flatMap((p) => (p.services || []).filter((s) => s.image_url).map((s) => ({ ...s, provider: p.business_name, providerId: p.id })))
    .filter((s) => !brokenUrls.value.has(s.image_url))
)
const heroPhotos = computed(() => allPhotos.value.slice(0, 4))
const trendingPhotos = computed(() => allPhotos.value.slice(0, 12))

watch(trendingPhotos, async () => {
  await nextTick()
  updateTrendingScroll()
})

const motifs = ['scissors', 'comb', 'bottle', 'polish']
const firstName = computed(() => auth.user?.name?.split(' ')[0] || '')

const NEARBY_RADIUS_KM = 10

const hasUserLocation = computed(() =>
  Number.isFinite(store.filters.lat) && Number.isFinite(store.filters.lng)
)

// Providers within NEARBY_RADIUS_KM of the user, closest first. Distance is
// computed from coordinates so the limit holds even if the API ignores radius_km.
const nearbyProviders = computed(() => {
  if (!hasUserLocation.value) return []
  const { lat, lng } = store.filters

  return store.list
    .map((p) => ({ ...p, distance_km: providerDistanceKm(lat, lng, p) }))
    .filter((p) => p.distance_km !== null && p.distance_km <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.distance_km - b.distance_km)
})

const mapMarkers = computed(() =>
  nearbyProviders.value
    .map((p) => ({
      id: p.id,
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      title: p.business_name,
      subtitle: p.provider_type,
    }))
    .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
)

const mapCenter = computed(() =>
  Number.isFinite(store.filters.lat) && Number.isFinite(store.filters.lng)
    ? [store.filters.lat, store.filters.lng]
    : undefined
)

function openProviderFromMap(id) {
  router.push(`/providers/${id}`)
}

// Hero search hands off to the full directory, which already filters by ?q=.
const heroSearch = ref('')
function submitHeroSearch() {
  const q = heroSearch.value.trim()
  router.push({ name: 'providers-directory', query: q ? { q } : {} })
}

const providerCount = computed(() => providerSearchIndex.value.length)

// "Popular right now" chips: the style names offered by the most providers,
// with a few common Kenyan favourites as a fallback until the list loads.
const FALLBACK_STYLES = ['Box braids', 'Skin fade', 'Gel manicure', 'Locs retwist', 'Pedicure']
const popularStyles = computed(() => {
  const counts = new Map()
  for (const p of providerSearchIndex.value) {
    const seen = new Set()
    for (const s of p.services || []) {
      const name = String(s.name || s.title || '').trim()
      const key = name.toLocaleLowerCase()
      if (!name || seen.has(key)) continue
      seen.add(key)
      const entry = counts.get(key) || { name, count: 0 }
      entry.count += 1
      counts.set(key, entry)
    }
  }
  const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5).map((e) => e.name)
  return top.length >= 3 ? top : FALLBACK_STYLES
})

// Hero image placeholder: shown until the (large) image has finished loading.
const heroImgEl = ref(null)
const heroLoaded = ref(false)
onMounted(() => {
  if (heroImgEl.value?.complete && heroImgEl.value.naturalWidth) heroLoaded.value = true
})
const isClient = computed(() => auth.isAuthenticated && auth.user?.role === 'client')

const STEPS = [
  { title: 'Discover', text: 'Browse barbers, salons and nail specialists near you, with real photos of their work.', icon: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35' },
  { title: 'Compare', text: 'Check prices, ratings and honest reviews before you choose who to book.', icon: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z' },
  { title: 'Book', text: 'Pick a style and a time that suits you, then message your provider directly.', icon: 'M7 3v3m10-3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Zm3.5 9 2 2 4-4' },
]
</script>

<template>
  <div class="space-y-16 sm:space-y-24">
    <!-- ───────────── Hero ───────────── -->
    <section class="relative grid items-center gap-8 pt-2 md:grid-cols-2 md:gap-10 md:pt-6 lg:min-h-[calc(100dvh-10rem)]">
      <div class="order-2 md:order-1">
        <h1 class="font-heading text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Your best look,
          <span class="block text-clay-600">booked in minutes.</span>
        </h1>
        <p class="mt-5 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
          Flairplace brings clients and independent beauty professionals together. Browse real work, compare honest prices,
          and book a barber, salon or nail specialist that fits your style and your schedule.
        </p>

        <!-- Search -->
        <form role="search" class="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-ink/10 bg-white p-2 shadow-lg shadow-ink/5 focus-within:border-clay-400 focus-within:ring-4 focus-within:ring-clay-100" @submit.prevent="submitHeroSearch">
          <svg viewBox="0 0 24 24" fill="none" class="ml-2 h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <label for="hero-search" class="sr-only">Search providers or styles</label>
          <input
            id="hero-search"
            v-model="heroSearch"
            type="search"
            placeholder="Search a provider or style, e.g. braids"
            class="min-w-0 flex-1 bg-transparent py-2 text-base text-ink placeholder:text-ink-soft/60 focus:outline-none sm:text-sm"
          />
          <button type="submit" class="shrink-0 rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 sm:px-5">
            Search
          </button>
        </form>

        <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <RouterLink to="/providers" class="inline-flex items-center gap-1.5 font-semibold text-clay-600 hover:text-clay-700">
            Browse all providers
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </RouterLink>
          <RouterLink v-if="!auth.isAuthenticated" to="/register" class="font-semibold text-ink underline-offset-4 hover:underline">
            Join as a provider
          </RouterLink>
          <RouterLink v-else-if="isClient" to="/my-appointments" class="font-semibold text-ink underline-offset-4 hover:underline">
            My appointments
          </RouterLink>
        </div>

        <!-- Popular right now -->
        <div class="mt-10 max-w-xl border-t border-ink/10 pt-6">
          <p class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
            <span class="relative flex h-2 w-2" aria-hidden="true">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay-500 opacity-60" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-clay-600" />
            </span>
            Popular right now
          </p>
          <ul class="mt-3 flex flex-wrap gap-2">
            <li v-for="style in popularStyles" :key="style">
              <RouterLink
                :to="{ name: 'providers-directory', query: { q: style } }"
                class="group inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-clay-600 hover:bg-clay-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
              >
                <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 text-clay-600 transition group-hover:text-white" aria-hidden="true">
                  <path d="M10 2.5 11.8 8.2 17.5 10l-5.7 1.8L10 17.5l-1.8-5.7L2.5 10l5.7-1.8L10 2.5Z" fill="currentColor" />
                </svg>
                {{ style }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="relative order-1 md:order-2">
        <div aria-hidden="true" class="pointer-events-none absolute inset-6 -z-10 rounded-full bg-clay-200/60 blur-3xl" />
        <div aria-hidden="true" class="pointer-events-none absolute -right-4 top-6 -z-10 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl" />
        <!-- Fixed aspect ratio box so the page doesn't jump when the image arrives -->
        <div class="relative mx-auto aspect-[1187/1325] w-full max-w-[30.5rem]">
          <Transition leave-active-class="transition duration-500 ease-out" leave-to-class="opacity-0">
            <div
              v-if="!heroLoaded"
              class="hero-skeleton absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[2.5rem] bg-clay-50 ring-1 ring-clay-100"
              role="status"
            >
              <div class="relative h-16 w-16">
                <span class="absolute inset-0 rounded-full border-4 border-clay-100" aria-hidden="true" />
                <span class="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-clay-600 border-r-clay-600" aria-hidden="true" />
                <img src="/logo.png" alt="" class="absolute inset-2 h-12 w-12 rounded-full object-cover" />
              </div>
              <p class="mt-4 text-sm font-semibold text-clay-700">Getting your look ready…</p>
            </div>
          </Transition>
          <img
            ref="heroImgEl"
            :src="heroImage"
            alt="A stylist straightening a woman's hair beside two clients"
            fetchpriority="high"
            decoding="async"
            :class="['absolute inset-0 h-full w-full object-contain transition duration-700 ease-out', heroLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0']"
            @load="heroLoaded = true"
            @error="heroLoaded = true"
          />
        </div>
        <!-- Floating badge -->
        <div class="absolute bottom-3 left-2 hidden items-center gap-3 rounded-2xl border border-ink/5 bg-white/95 px-4 py-3 shadow-xl shadow-ink/10 backdrop-blur sm:flex md:-left-4 lg:bottom-10">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-clay-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
              <path d="M7 3v3m10-3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Zm3.5 9 2 2 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span>
            <span class="block text-sm font-semibold text-ink">Book in a few taps</span>
            <span class="block text-xs text-ink-soft">Barbers · Salons · Nails</span>
          </span>
        </div>
      </div>
    </section>

    <!-- ───────────── Categories ───────────── -->
    <BeautyCategoryLinks />

    <!-- ───────────── How it works ───────────── -->
    <section aria-labelledby="how-title" class="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-14">
      <div aria-hidden="true" class="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-clay-800/40 blur-3xl" />
      <div class="relative">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-300">How it works</p>
        <h2 id="how-title" class="mt-1.5 max-w-lg font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Your next look in <span class="font-accent font-bold text-clay-400">three steps</span>
        </h2>
        <ol class="mt-8 grid gap-4 sm:mt-10 md:grid-cols-3 md:gap-6">
          <li v-for="(step, i) in STEPS" :key="step.title" class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <div class="flex items-center justify-between">
              <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-600 text-white shadow-lg shadow-clay-600/30">
                <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                  <path :d="step.icon" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="font-heading text-3xl font-semibold text-white/15">{{ String(i + 1).padStart(2, '0') }}</span>
            </div>
            <h3 class="mt-5 text-lg font-semibold">{{ step.title }}</h3>
            <p class="mt-1.5 text-sm leading-6 text-white/65">{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ───────────── Trending styles ───────────── -->
    <section v-if="trendingPhotos.length">
      <h2 class="mb-16 font-heading text-3xl text-ink font-black">Trending <span class="font-accent text-3xl font-black text-clay-600">Styles</span></h2>
      <div class="relative">
        <button
          type="button"
          aria-label="Scroll trending styles left"
          :disabled="!canScrollTrendingLeft"
          @click="scrollTrending(-1)"
          class="trending-arrow trending-arrow-left absolute top-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-clay-600 text-white shadow-md transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
            <path d="M16 10H4m5 5-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div ref="trendingTrack" @scroll="updateTrendingScroll" class="trending-track flex snap-x snap-mandatory gap-4 overflow-x-hidden">
          <RouterLink v-for="photo in trendingPhotos" :key="photo.id"
            :to="`/providers/${photo.providerId}?style=${photo.id}`"
            class="trending-card group relative block h-64 shrink-0 snap-start overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 sm:h-72">
            <img :src="photo.image_url" :alt="photo.name" loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" @error="markBroken(photo.image_url)" />
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent px-4 pb-4 pt-12">
              <p class="truncate text-sm font-semibold leading-tight text-white">{{ photo.name }}</p>
              <p class="mt-1 flex items-center gap-1 truncate text-xs text-white/75">
                {{ photo.provider }}
                <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                  <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </p>
            </div>
          </RouterLink>
        </div>
        <button
          type="button"
          aria-label="Scroll trending styles right"
          :disabled="!canScrollTrendingRight"
          @click="scrollTrending(1)"
          class="trending-arrow trending-arrow-right absolute top-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-clay-600 text-white shadow-md transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
            <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </section>

    <!-- ───────────── Providers near you ───────────── -->
    <section aria-labelledby="nearby-title">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Within {{ NEARBY_RADIUS_KM }} km</p>
          <h2 id="nearby-title" class="mt-1.5 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Providers <span class="font-accent font-bold text-clay-600">near you</span>
          </h2>
        </div>
        <div v-if="hasUserLocation && nearbyProviders.length" class="inline-flex rounded-xl border border-ink/10 bg-white p-1 text-sm shadow-sm" role="group" aria-label="View as">
          <button type="button" @click="viewMode = 'list'" :aria-pressed="viewMode === 'list'"
            :class="['rounded-lg px-4 py-1.5 font-semibold transition', viewMode === 'list' ? 'bg-clay-600 text-white shadow-sm' : 'text-ink-soft hover:text-ink']">
            List
          </button>
          <button type="button" @click="viewMode = 'map'" :aria-pressed="viewMode === 'map'"
            :class="['rounded-lg px-4 py-1.5 font-semibold transition', viewMode === 'map' ? 'bg-clay-600 text-white shadow-sm' : 'text-ink-soft hover:text-ink']">
            Map
          </button>
        </div>
      </div>

      <!-- No location yet -->
      <div v-if="!hasUserLocation" class="relative overflow-hidden rounded-3xl border border-ink/10 bg-white px-6 py-10 text-center shadow-sm shadow-ink/5 sm:py-14">
        <div aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800" />
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
          <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6" aria-hidden="true">
            <path d="M12 21s-7-5.6-7-11.5a7 7 0 1 1 14 0C19 15.4 12 21 12 21Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" stroke-width="1.7" />
          </svg>
        </span>
        <h3 class="mt-5 font-heading text-lg font-semibold text-ink">See who’s close by</h3>
        <p class="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-ink-soft">
          Share your location to see providers within {{ NEARBY_RADIUS_KM }} km of you. We only use it to sort results.
        </p>
        <div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" @click="findNearby" :disabled="locating"
            class="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700 disabled:cursor-wait disabled:opacity-60">
            <span v-if="locating" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            {{ locating ? 'Finding you…' : 'Use my location' }}
          </button>
          <RouterLink to="/providers" class="text-sm font-semibold text-ink-soft hover:text-ink">or browse all providers</RouterLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="locating || searchLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        <div v-for="n in 3" :key="n" class="h-64 animate-pulse rounded-2xl border border-ink/10 bg-white">
          <div class="h-32 rounded-t-2xl bg-paper" />
          <div class="space-y-3 p-4">
            <div class="h-3 w-1/3 rounded bg-paper" />
            <div class="h-4 w-2/3 rounded bg-paper" />
            <div class="h-3 w-1/2 rounded bg-paper" />
          </div>
        </div>
        <span class="sr-only">Loading providers near you…</span>
      </div>

      <!-- Empty -->
      <div v-else-if="!nearbyProviders.length" class="rounded-3xl border border-dashed border-ink/15 bg-white/60 px-6 py-10 text-center">
        <p class="font-semibold text-ink">No providers within {{ NEARBY_RADIUS_KM }} km yet</p>
        <p class="mt-1 text-sm text-ink-soft">New providers join regularly. In the meantime, browse everyone on Flairplace.</p>
        <RouterLink to="/providers" class="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-clay-300">
          Browse all providers
        </RouterLink>
      </div>

      <div v-else-if="viewMode === 'list'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProviderCard v-for="p in nearbyProviders" :key="p.id" :provider="p" />
      </div>

      <template v-else>
        <div v-if="mapMarkers.length" class="overflow-hidden rounded-2xl border border-ink/10 shadow-sm">
          <ProviderMap
            :markers="mapMarkers"
            :center="mapCenter"
            height-class="h-[60vh]"
            @marker-click="openProviderFromMap"
          />
        </div>
        <p v-else class="text-sm text-ink-soft">
          No providers to show on the map — switch back to List.
        </p>
      </template>
    </section>

    <!-- ───────────── Provider CTA ───────────── -->
    <section v-if="!auth.isAuthenticated" class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-clay-500 via-clay-600 to-clay-800 px-6 py-10 text-white shadow-xl shadow-clay-600/20 sm:px-12 sm:py-14">
      <div aria-hidden="true" class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />
      <div class="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">For beauty professionals</p>
          <h2 class="mt-2 max-w-xl font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Grow your business with <span class="font-accent font-bold text-ink">Flairplace</span>
          </h2>
          <p class="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
            List your services, show off your work and take bookings from clients near you, all from one simple dashboard.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <RouterLink to="/register" class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-clay-700 shadow-lg transition hover:bg-paper">
            Join as a provider
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </RouterLink>
          <RouterLink to="/about" class="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Learn more
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Soft shimmer sweeping across the hero placeholder */
.hero-skeleton::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.7) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: hero-shimmer 1.6s ease-in-out infinite;
}
@keyframes hero-shimmer {
  to { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-skeleton::before { animation: none; }
}

.trending-card {
  flex-basis: calc((100% - 3rem) / 4);
}

.trending-arrow-left {
  left: 0.75rem;
  transform: translateY(-50%);
}

.trending-arrow-right {
  right: 0.75rem;
  transform: translateY(-50%);
}

@media (max-width: 767px) {
  .trending-card {
    flex-basis: calc((100% - 1rem) / 2);
  }

}

@media (max-width: 479px) {
  .trending-card {
    flex-basis: 100%;
  }

}
</style>
