<script setup>
import { ref } from 'vue'
import ToolMotif from './ToolMotif.vue'

const props = defineProps({ provider: { type: Object, required: true } })

const motifs = ['scissors', 'comb', 'bottle', 'polish']

// Tracks cover images that failed to actually load (404, missing storage
// symlink, deleted file) so we fall back to the icon tile instead of
// silently showing nothing where a photo was expected.
const brokenUrls = ref(new Set())

function cheapestService(services) {
  if (!services?.length) return null
  return services.reduce((min, s) => (Number(s.price) < Number(min.price) ? s : min), services[0])
}

function coverImage(provider) {
  const url = provider.services?.find((s) => s.image_url)?.image_url || null
  return url && !brokenUrls.value.has(url) ? url : null
}

function locationLabel(provider) {
  if (provider.address || provider.location) return provider.address || provider.location
  if (provider.distance_km) return `${Number(provider.distance_km).toFixed(1)} km away`
  return 'Location not listed'
}

function markBroken(url) {
  brokenUrls.value.add(url)
}

// Deterministic-ish pick so the same card doesn't flicker between icons on re-render
function fallbackMotif(provider) {
  return motifs[provider.id % motifs.length]
}
</script>

<template>
  <RouterLink :to="`/providers/${provider.id}`"
    class="group flex h-full flex-col overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-1 hover:border-clay-200 hover:shadow-xl hover:shadow-clay-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2">
    <!-- Cover -->
    <div class="relative aspect-16/10 overflow-hidden bg-sage-50">
      <img v-if="coverImage(provider)" :src="coverImage(provider)" :alt="provider.business_name" loading="lazy"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" @error="markBroken(coverImage(provider))" />
      <div v-else class="flex h-full w-full items-center justify-center text-sage-400">
        <div class="h-10 w-10">
          <ToolMotif :icon="fallbackMotif(provider)" />
        </div>
      </div>

      <div class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink/25 to-transparent" />
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div class="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-clay-600 transition-transform duration-300 group-hover:scale-x-100" />

      <span :class="[
        'absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur',
        provider.is_open ? 'bg-white/95 text-sage-700' : 'bg-ink/75 text-white',
      ]">
        <span :class="['h-1.5 w-1.5 rounded-full', provider.is_open ? 'bg-sage-500' : 'bg-white/70']" />
        {{ provider.is_open ? 'Open' : 'Closed' }}
      </span>

      <span v-if="provider.is_featured"
        class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink shadow-sm backdrop-blur">
        <svg viewBox="0 0 20 20" class="h-3 w-3 text-amber-500" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
        Featured
      </span>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-600">{{ provider.provider_type || 'Provider' }}</p>
          <h3 class="mt-1 truncate font-heading text-lg font-semibold leading-6 text-ink transition-colors group-hover:text-clay-700">{{ provider.business_name }}</h3>
        </div>
        <div v-if="provider.reviews_count" class="flex shrink-0 items-center gap-1 rounded-md bg-paper px-2 py-1 text-xs font-semibold text-ink">
          <svg viewBox="0 0 20 20" class="h-3.5 w-3.5 text-amber-500" fill="currentColor" aria-hidden="true">
            <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
          {{ Number(provider.average_rating || 0).toFixed(1) }}
          <span class="font-normal text-ink-soft">({{ provider.reviews_count }})</span>
        </div>
        <span v-else class="shrink-0 rounded-md bg-clay-50 px-2 py-1 text-xs font-semibold text-clay-700">New</span>
      </div>

      <p class="mt-3 flex min-w-0 items-center gap-1.5 text-sm text-ink-soft">
        <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0" aria-hidden="true">
          <path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 1 0-11 0c0 4.4 5.5 9 5.5 9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <circle cx="10" cy="8.5" r="2" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <span class="truncate">{{ locationLabel(provider) }}</span>
      </p>

      <div v-if="provider.offers_home_service" class="mt-3 flex flex-wrap gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-md border border-clay-100 bg-clay-50 px-2 py-1 text-xs font-medium text-clay-700">
          <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
            <path d="M3 9.5 10 4l7 5.5M5 8v8h10V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Home service
        </span>
      </div>

      <!-- Footer -->
      <div class="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <div v-if="cheapestService(provider.services)">
          <p class="text-[11px] font-medium uppercase tracking-wide text-ink-soft">Starting at</p>
          <p class="mt-0.5 text-base font-semibold text-ink">KES {{ Number(cheapestService(provider.services).price).toLocaleString() }}</p>
        </div>
        <p v-else class="text-xs text-ink-soft">View services and prices</p>
        <span class="inline-flex shrink-0 items-center gap-1 rounded-md bg-clay-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition group-hover:bg-clay-700">
          View profile
          <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  </RouterLink>
</template>
