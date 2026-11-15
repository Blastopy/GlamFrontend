<script setup>
import ToolMotif from '@/components/shared/ToolMotif.vue'

// `type` matches the provider_type filter on the /providers directory.
const categories = [
  { label: 'Barbers', text: 'Cuts, fades & beard trims', icon: 'scissors', type: 'barber' },
  { label: 'Salons', text: 'Braids, weaves & styling', icon: 'comb', type: 'salon' },
  { label: 'Nail specialists', text: 'Manicures, pedicures & art', icon: 'polish', type: 'manicurist' },
  { label: 'Other beauty', text: 'Makeup, lashes, skincare & more', icon: 'bottle', type: 'other' },
]
</script>

<template>
  <section aria-labelledby="categories-title">
    <div class="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Categories</p>
        <h2 id="categories-title" class="mt-1.5 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          What are you <span class="font-accent font-bold text-clay-600">looking for?</span>
        </h2>
      </div>
      <RouterLink to="/providers" class="hidden shrink-0 text-sm font-semibold text-clay-600 hover:text-clay-700 sm:inline-flex sm:items-center sm:gap-1">
        All providers
        <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </RouterLink>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <RouterLink
        v-for="category in categories"
        :key="category.type"
        :to="{ name: 'providers-directory', query: { type: category.type } }"
        class="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white p-4 shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-0.5 hover:border-clay-300 hover:shadow-lg hover:shadow-clay-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 sm:p-5"
      >
        <span aria-hidden="true" class="category-icon flex h-12 w-12 items-center justify-center rounded-xl bg-clay-50 p-2.5 text-clay-600 ring-1 ring-clay-100 transition group-hover:bg-clay-600 group-hover:text-white group-hover:ring-clay-600">
          <ToolMotif :icon="category.icon" />
        </span>
        <span class="mt-4 font-heading text-sm font-semibold text-ink transition group-hover:text-clay-700 sm:text-base">{{ category.label }}</span>
        <span class="mt-1 text-xs leading-5 text-ink-soft sm:text-sm">{{ category.text }}</span>
        <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-clay-600 transition-transform duration-300 group-hover:scale-x-100" />
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.category-icon :deep(svg *) {
  stroke-width: 3.5px;
}
</style>
