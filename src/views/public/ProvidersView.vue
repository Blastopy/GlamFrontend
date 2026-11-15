<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import providersApi from '@/api/providers'
import { useProvidersStore } from '@/stores/providers'
import { useNotificationsStore } from '@/stores/notifications'
import { providerDistanceKm } from '@/utils/geo'
import ProviderCard from '@/components/shared/ProviderCard.vue'

const route = useRoute()
const router = useRouter()
const providersStore = useProvidersStore()
const notifications = useNotificationsStore()

const PAGE_SIZE = 12

const TYPE_OPTIONS = [
  { value: '', label: 'All providers' },
  { value: 'barber', label: 'Barbers' },
  { value: 'salon', label: 'Salons' },
  { value: 'manicurist', label: 'Nail specialists' },
  { value: 'other', label: 'Other' },
]
const RATING_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 3, label: '3.0 & up' },
  { value: 4, label: '4.0 & up' },
  { value: 4.5, label: '4.5 & up' },
]
const DISTANCE_OPTIONS = [
  { value: 0, label: 'Any distance' },
  { value: 2, label: 'Within 2 km' },
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 25, label: 'Within 25 km' },
]
const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'distance', label: 'Nearest first' },
  { value: 'name', label: 'Name: A to Z' },
]
const KNOWN_TYPES = ['barber', 'salon', 'manicurist']

const routeType = (value) => (TYPE_OPTIONS.some((t) => t.value && t.value === value) ? value : '')

// ---- State ----
const providers = ref([])
const loading = ref(true)
const loadError = ref('')
const filtersOpen = ref(false)
const locating = ref(false)
const visibleCount = ref(PAGE_SIZE)

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedType = ref(routeType(route.query.type))
const openOnly = ref(false)
const homeServiceOnly = ref(false)
const minRating = ref(0)
const minPrice = ref('')
const maxPrice = ref('')
const maxDistance = ref(0)
const sortBy = ref('recommended')

const hasLocation = computed(() =>
  Number.isFinite(providersStore.filters.lat) && Number.isFinite(providersStore.filters.lng)
)

// Keep type/search in the URL so filtered views can be shared and survive refresh.
watch(() => route.query.type, (type) => { selectedType.value = routeType(type) })
watch([selectedType, search], ([type, q]) => {
  const query = { ...route.query, type: type || undefined, q: q.trim() || undefined }
  if (query.type !== route.query.type || query.q !== route.query.q) {
    router.replace({ query })
  }
})

// ---- Helpers ----
function startingPrice(provider) {
  const prices = (provider.services || [])
    .map((s) => (s.price === null || s.price === undefined || s.price === '' ? Number.NaN : Number(s.price)))
    .filter(Number.isFinite)
  return prices.length ? Math.min(...prices) : null
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const priceMin = computed(() => toNumber(minPrice.value))
const priceMax = computed(() => toNumber(maxPrice.value))

// ---- Derived lists ----
const providersWithDistance = computed(() => {
  if (!hasLocation.value) return providers.value
  const { lat, lng } = providersStore.filters
  return providers.value.map((p) => ({ ...p, distance_km: providerDistanceKm(lat, lng, p) }))
})

const filteredProviders = computed(() => {
  const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)

  const matches = providersWithDistance.value.filter((p) => {
    if (selectedType.value === 'other') {
      if (KNOWN_TYPES.includes(p.provider_type)) return false
    } else if (selectedType.value && p.provider_type !== selectedType.value) {
      return false
    }
    if (openOnly.value && !p.is_open) return false
    if (homeServiceOnly.value && !p.offers_home_service) return false
    if (minRating.value && Number(p.average_rating || 0) < minRating.value) return false

    if (priceMin.value !== null || priceMax.value !== null) {
      const price = startingPrice(p)
      if (price === null) return false
      if (priceMin.value !== null && price < priceMin.value) return false
      if (priceMax.value !== null && price > priceMax.value) return false
    }

    if (maxDistance.value && hasLocation.value) {
      if (p.distance_km === null || p.distance_km === undefined || p.distance_km > maxDistance.value) return false
    }

    if (!terms.length) return true
    const haystack = [
      p.business_name, p.provider_type, p.address, p.location, p.city, p.county, p.description,
      ...(p.services || []).flatMap((s) => [s.name, s.title, s.category]),
    ].map((v) => String(v || '').toLocaleLowerCase()).join(' ')
    return terms.every((term) => haystack.includes(term))
  })

  const byName = (a, b) => String(a.business_name || '').localeCompare(String(b.business_name || ''))
  const byRating = (a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0)
  const priceOr = (p, fallback) => startingPrice(p) ?? fallback
  const distOr = (p) => p.distance_km ?? Number.POSITIVE_INFINITY

  return matches.sort((a, b) => {
    switch (sortBy.value) {
      case 'rating': return byRating(a, b) || byName(a, b)
      case 'price_asc': return priceOr(a, Infinity) - priceOr(b, Infinity) || byName(a, b)
      case 'price_desc': return priceOr(b, -Infinity) - priceOr(a, -Infinity) || byName(a, b)
      case 'distance': return distOr(a) - distOr(b) || byName(a, b)
      case 'name': return byName(a, b)
      default:
        return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || byRating(a, b) || byName(a, b)
    }
  })
})

const visibleProviders = computed(() => filteredProviders.value.slice(0, visibleCount.value))

// Reset pagination whenever the result set changes shape.
watch([search, selectedType, openOnly, homeServiceOnly, minRating, minPrice, maxPrice, maxDistance, sortBy], () => {
  visibleCount.value = PAGE_SIZE
})

// ---- Active filter chips ----
const activeFilters = computed(() => {
  const chips = []
  if (selectedType.value) {
    chips.push({ key: 'type', label: TYPE_OPTIONS.find((t) => t.value === selectedType.value)?.label, clear: () => { selectedType.value = '' } })
  }
  if (openOnly.value) chips.push({ key: 'open', label: 'Open now', clear: () => { openOnly.value = false } })
  if (homeServiceOnly.value) chips.push({ key: 'home', label: 'Home service', clear: () => { homeServiceOnly.value = false } })
  if (minRating.value) chips.push({ key: 'rating', label: `${minRating.value}★ & up`, clear: () => { minRating.value = 0 } })
  if (priceMin.value !== null || priceMax.value !== null) {
    const label = priceMin.value !== null && priceMax.value !== null
      ? `KES ${priceMin.value.toLocaleString()} – ${priceMax.value.toLocaleString()}`
      : priceMin.value !== null ? `From KES ${priceMin.value.toLocaleString()}` : `Up to KES ${priceMax.value.toLocaleString()}`
    chips.push({ key: 'price', label, clear: () => { minPrice.value = ''; maxPrice.value = '' } })
  }
  if (maxDistance.value && hasLocation.value) {
    chips.push({ key: 'distance', label: `Within ${maxDistance.value} km`, clear: () => { maxDistance.value = 0 } })
  }
  return chips
})

function clearFilters() {
  search.value = ''
  selectedType.value = ''
  openOnly.value = false
  homeServiceOnly.value = false
  minRating.value = 0
  minPrice.value = ''
  maxPrice.value = ''
  maxDistance.value = 0
  sortBy.value = 'recommended'
}

// ---- Location ----
async function useMyLocation() {
  locating.value = true
  try {
    await providersStore.useMyLocation()
    if (!maxDistance.value) maxDistance.value = 10
  } catch (e) {
    notifications.error(e?.code === 1
      ? 'Location access was denied. Enable it in your browser settings to filter by distance.'
      : 'Could not get your location. Please try again.')
  } finally {
    locating.value = false
  }
}

function onDistanceChange(value) {
  maxDistance.value = value
  if (value && !hasLocation.value) useMyLocation()
}

// ---- Mobile drawer ----
function closeFilters() { filtersOpen.value = false }
function onKeydown(e) { if (e.key === 'Escape' && filtersOpen.value) closeFilters() }
watch(filtersOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })

// ---- Data ----
async function loadProviders() {
  loading.value = true
  loadError.value = ''
  try {
    const firstPage = await providersApi.list({ page: 1 })
    const pageData = firstPage.data
    const all = [...(pageData.data || [])]
    for (let page = 2; page <= Number(pageData.last_page || 1); page += 1) {
      const response = await providersApi.list({ page })
      all.push(...(response.data.data || []))
    }
    providers.value = all
  } catch {
    loadError.value = 'We could not load providers. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProviders()
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="mx-auto max-w-7xl py-6 sm:py-10">
    <!-- Page header -->
    <header class="relative mb-8 overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white sm:mb-10 sm:px-10 sm:py-14 lg:px-14">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative">
        <nav aria-label="Breadcrumb">
          <ol class="flex items-center gap-1.5 text-xs font-medium text-white/50">
            <li>
              <RouterLink to="/" class="inline-flex items-center gap-1.5 rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">
                <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Home
              </RouterLink>
            </li>
            <li aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5">
                <path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </li>
            <li aria-current="page" class="text-clay-300">Providers</li>
          </ol>
        </nav>

        <div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
          <div class="max-w-2xl">
            <h1 class="font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Beauty
              <span class="font-accent font-bold text-clay-400">professionals</span>
            </h1>
            <p class="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              Compare trusted barbers, salons and nail specialists by rating, price and distance — then book in a few taps.
            </p>
          </div>

          <div>
            <label class="relative block w-full">
              <span class="sr-only">Search by provider, service, or location</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-clay-600">
                <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.8" />
                <path d="m16 16 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              <input
                v-model="search"
                type="search"
                autocomplete="off"
                placeholder="Search name, service or area"
                class="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-12 text-base text-ink shadow-xl shadow-black/20 placeholder:text-ink-soft/70 focus:outline-none focus:ring-4 focus:ring-clay-500/40 sm:text-sm"
              />
              <button
                v-if="search"
                type="button"
                aria-label="Clear search"
                class="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-ink-soft hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
                @click="search = ''"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-4 w-4">
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </button>
            </label>

            <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by provider type">
              <button
                v-for="type in TYPE_OPTIONS"
                :key="type.value || 'all'"
                type="button"
                :aria-pressed="selectedType === type.value"
                :class="[
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 sm:text-sm',
                  selectedType === type.value
                    ? 'border-clay-600 bg-clay-600 text-white shadow-lg shadow-clay-600/30'
                    : 'border-white/15 bg-white/5 text-white/75 hover:border-clay-400/60 hover:bg-white/10 hover:text-white',
                ]"
                @click="selectedType = type.value"
              >
                {{ type.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
      <!-- Mobile backdrop -->
      <div
        v-if="filtersOpen"
        class="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
        @click="closeFilters"
      />

      <!-- Filters: slide-over drawer on mobile, sticky sidebar on desktop -->
      <aside
        id="provider-filters"
        aria-label="Filter providers"
        :class="[
          'fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300',
          'lg:visible lg:sticky lg:top-24 lg:bottom-auto lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:self-start lg:rounded-3xl lg:border lg:border-ink/10 lg:shadow-xl lg:shadow-ink/5',
          filtersOpen ? 'translate-x-0' : 'invisible -translate-x-full',
        ]"
      >
        <div aria-hidden="true" class="h-1 shrink-0 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800" />
        <div class="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 class="flex items-center gap-2.5 text-base font-semibold text-ink">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-4 w-4">
                <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            Filters
            <span v-if="activeFilters.length" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-600 px-1.5 text-xs font-semibold text-white">
              {{ activeFilters.length }}
            </span>
          </h2>
          <div class="flex items-center gap-1">
            <button
              v-if="activeFilters.length"
              type="button"
              class="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-clay-700 transition hover:bg-clay-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
              @click="clearFilters"
            >
              Clear all
            </button>
            <button
              type="button"
              aria-label="Close filters"
              class="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 lg:hidden"
              @click="closeFilters"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-5 w-5">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 divide-y divide-ink/5 overflow-y-auto px-5 lg:max-h-[calc(100dvh-12rem)]">
          <!-- Type -->
          <fieldset class="py-5">
            <legend class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-600">Provider type</legend>
            <div class="space-y-1">
              <label
                v-for="type in TYPE_OPTIONS"
                :key="type.value || 'all'"
                :class="[
                  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  selectedType === type.value
                    ? 'bg-clay-50 font-semibold text-clay-800 ring-1 ring-clay-200'
                    : 'text-ink hover:bg-paper',
                ]"
              >
                <input v-model="selectedType" type="radio" name="provider-type" :value="type.value" class="h-4 w-4 accent-clay-600" />
                {{ type.label }}
              </label>
            </div>
          </fieldset>

          <!-- Availability -->
          <fieldset class="py-5">
            <legend class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-600">Availability</legend>
            <div class="space-y-2">
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition hover:bg-paper">
                <span class="flex items-center gap-2.5">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-4 w-4 text-ink-soft">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
                    <path d="M10 6v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  Open now
                </span>
                <input v-model="openOnly" type="checkbox" class="peer sr-only" />
                <span class="relative h-6 w-11 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-clay-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-400" aria-hidden="true" />
              </label>
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition hover:bg-paper">
                <span class="flex items-center gap-2.5">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-4 w-4 text-ink-soft">
                    <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  Offers home service
                </span>
                <input v-model="homeServiceOnly" type="checkbox" class="peer sr-only" />
                <span class="relative h-6 w-11 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-clay-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-clay-400" aria-hidden="true" />
              </label>
            </div>
          </fieldset>

          <!-- Rating -->
          <fieldset class="py-5">
            <legend class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-600">Rating</legend>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in RATING_OPTIONS"
                :key="option.value"
                type="button"
                :aria-pressed="minRating === option.value"
                :class="[
                  'inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400',
                  minRating === option.value
                    ? 'border-clay-600 bg-clay-600 font-semibold text-white shadow-md shadow-clay-600/25'
                    : 'border-ink/10 text-ink hover:border-clay-300 hover:bg-clay-50/50',
                ]"
                @click="minRating = option.value"
              >
                <svg v-if="option.value" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                  :class="['h-3.5 w-3.5', minRating === option.value ? 'text-white' : 'text-amber-500']">
                  <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                </svg>
                {{ option.label }}
              </button>
            </div>
          </fieldset>

          <!-- Price -->
          <fieldset class="py-5">
            <legend class="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-600">Starting price (KES)</legend>
            <p class="mb-3 text-xs text-ink-soft">Based on each provider's cheapest service.</p>
            <div class="flex items-center gap-2">
              <label class="flex-1">
                <span class="sr-only">Minimum price</span>
                <input v-model="minPrice" type="number" inputmode="numeric" min="0" step="100" placeholder="Min"
                  class="w-full rounded-xl border border-ink/10 bg-paper/40 px-3 py-2.5 text-sm text-ink transition placeholder:text-ink-soft/60 hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100" />
              </label>
              <span class="text-ink-soft" aria-hidden="true">–</span>
              <label class="flex-1">
                <span class="sr-only">Maximum price</span>
                <input v-model="maxPrice" type="number" inputmode="numeric" min="0" step="100" placeholder="Max"
                  class="w-full rounded-xl border border-ink/10 bg-paper/40 px-3 py-2.5 text-sm text-ink transition placeholder:text-ink-soft/60 hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100" />
              </label>
            </div>
          </fieldset>

          <!-- Distance -->
          <fieldset class="py-5">
            <legend class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-600">Distance</legend>
            <select
              :value="maxDistance"
              aria-label="Maximum distance"
              class="w-full rounded-xl border border-ink/10 bg-paper/40 px-3 py-2.5 text-sm text-ink transition hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100"
              @change="onDistanceChange(Number($event.target.value))"
            >
              <option v-for="option in DISTANCE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <button
              v-if="!hasLocation"
              type="button"
              :disabled="locating"
              class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 disabled:opacity-60"
              @click="useMyLocation"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="h-4 w-4 text-clay-400">
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" />
                <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" stroke-width="1.8" />
              </svg>
              {{ locating ? 'Finding you…' : 'Use my location' }}
            </button>
            <p v-else class="mt-3 flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2 text-xs font-medium text-sage-700">
              <span class="relative flex h-2 w-2" aria-hidden="true">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-400 opacity-60" />
                <span class="relative inline-flex h-2 w-2 rounded-full bg-sage-500" />
              </span>
              Using your current location
            </p>
          </fieldset>
        </div>

        <!-- Mobile apply bar -->
        <div class="border-t border-ink/10 p-4 lg:hidden">
          <button
            type="button"
            class="w-full rounded-xl bg-clay-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
            @click="closeFilters"
          >
            Show {{ filteredProviders.length }} {{ filteredProviders.length === 1 ? 'provider' : 'providers' }}
          </button>
        </div>
      </aside>

      <!-- Results -->
      <section aria-label="Provider results" class="min-w-0">
        <!-- Toolbar -->
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm shadow-ink/5 sm:px-5">
          <p class="text-sm text-ink-soft" aria-live="polite">
            <template v-if="!loading && !loadError">
              <span class="mr-1 inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-clay-50 px-2 font-heading text-sm font-bold text-clay-700">{{ filteredProviders.length }}</span>
              {{ filteredProviders.length === 1 ? 'provider' : 'providers' }}
              <span v-if="search.trim()">for “<span class="font-medium text-ink">{{ search.trim() }}</span>”</span>
            </template>
            <template v-else-if="loading">Loading providers…</template>
          </p>

          <div class="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              aria-controls="provider-filters"
              :aria-expanded="filtersOpen"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-clay-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 sm:flex-none lg:hidden"
              @click="filtersOpen = true"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-4 w-4 text-clay-600">
                <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              Filters
              <span v-if="activeFilters.length" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-600 px-1.5 text-xs font-semibold text-white">
                {{ activeFilters.length }}
              </span>
            </button>

            <label class="flex flex-1 items-center gap-2 sm:flex-none">
              <span class="hidden text-sm text-ink-soft sm:inline">Sort by</span>
              <select
                v-model="sortBy"
                aria-label="Sort providers"
                class="w-full rounded-xl border border-ink/10 bg-paper/40 px-3 py-2 text-sm font-medium text-ink transition hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100 sm:w-auto"
              >
                <option
                  v-for="option in SORT_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                  :disabled="option.value === 'distance' && !hasLocation"
                >
                  {{ option.label }}{{ option.value === 'distance' && !hasLocation ? ' (needs location)' : '' }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <!-- Active filter chips -->
        <div v-if="activeFilters.length" class="mb-5 flex flex-wrap items-center gap-2">
          <button
            v-for="chip in activeFilters"
            :key="chip.key"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border border-clay-200 bg-clay-50 py-1.5 pl-3 pr-2 text-xs font-semibold text-clay-800 transition hover:border-clay-400 hover:bg-clay-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
            :aria-label="`Remove filter: ${chip.label}`"
            @click="chip.clear()"
          >
            {{ chip.label }}
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-clay-600/10">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-3 w-3 text-clay-700">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </span>
          </button>
          <button type="button" class="px-1.5 text-xs font-semibold text-ink-soft underline-offset-2 hover:text-clay-700 hover:underline" @click="clearFilters">
            Clear all
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" class="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3" role="status" aria-label="Loading providers">
          <div v-for="item in 6" :key="item" class="animate-pulse overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm shadow-ink/5">
            <div class="aspect-16/10 bg-paper" />
            <div class="space-y-3 p-5">
              <div class="h-2.5 w-1/4 rounded-full bg-clay-100" />
              <div class="h-4 w-2/3 rounded-full bg-ink/10" />
              <div class="h-3 w-3/4 rounded-full bg-ink/5" />
              <div class="flex items-center justify-between border-t border-ink/5 pt-4">
                <div class="h-6 w-20 rounded-md bg-ink/5" />
                <div class="h-8 w-24 rounded-lg bg-clay-100" />
              </div>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="rounded-3xl border border-ink/10 bg-white px-5 py-14 text-center shadow-sm shadow-ink/5">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="h-6 w-6">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7" />
              <path d="M12 8v4.5M12 15.5h.01" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
            </svg>
          </div>
          <p class="mt-5 text-sm text-ink-soft">{{ loadError }}</p>
          <button type="button" class="mt-5 rounded-xl bg-clay-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2" @click="loadProviders">
            Try again
          </button>
        </div>

        <template v-else>
          <div v-if="filteredProviders.length">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              <ProviderCard v-for="provider in visibleProviders" :key="provider.id" :provider="provider" />
            </div>

            <div v-if="visibleProviders.length < filteredProviders.length" class="mt-10 flex flex-col items-center gap-3">
              <div class="h-1 w-40 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                <div class="h-full rounded-full bg-clay-600 transition-all" :style="{ width: `${(visibleProviders.length / filteredProviders.length) * 100}%` }" />
              </div>
              <p class="text-xs text-ink-soft">Showing {{ visibleProviders.length }} of {{ filteredProviders.length }}</p>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-6 py-3 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-clay-300 hover:text-clay-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
                @click="visibleCount += PAGE_SIZE"
              >
                Load more providers
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="h-4 w-4">
                  <path d="m5 8 5 5 5-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Empty -->
          <div v-else class="rounded-3xl border border-dashed border-clay-200 bg-white px-5 py-14 text-center sm:py-20">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="h-7 w-7">
                <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.6" />
                <path d="m16 16 4.2 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </div>
            <h2 class="mt-6 font-heading text-xl font-semibold text-ink">No providers match your filters</h2>
            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
              Try a different search, widen the distance or price range, or remove a filter.
            </p>
            <button type="button" class="mt-6 rounded-xl bg-clay-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2" @click="clearFilters">
              Clear search and filters
            </button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
