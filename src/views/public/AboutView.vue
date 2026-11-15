<script setup>
import ToolMotif from '@/components/shared/ToolMotif.vue'

const values = [
  {
    title: 'Real work, not stock photos',
    body: 'Every style you see comes from a provider’s own portfolio, so you know what to expect before you book.',
    icon: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM4 15l4.5-4.5L14 16m-1.5-1.5L15 12l5 5M15.5 8.5h.01',
  },
  {
    title: 'Honest, upfront prices',
    body: 'Services and prices are listed clearly on every profile. No guesswork, no surprises at the chair.',
    icon: 'M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3',
  },
  {
    title: 'Local first',
    body: 'Find professionals close to you, see who’s open now, and discover who offers home visits.',
    icon: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  },
  {
    title: 'Booking in a few taps',
    body: 'Pick a service, choose a time and you’re done. Manage every appointment from your phone.',
    icon: 'M7 3v3m10-3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Zm3 9 2 2 4-4',
  },
]

const clientSteps = [
  { title: 'Discover', body: 'Search by style, provider type or location and browse real portfolios.' },
  { title: 'Compare', body: 'Check ratings, prices and opening hours side by side.' },
  { title: 'Book', body: 'Choose a service and time straight from the provider’s profile.' },
]

const providerSteps = [
  { title: 'Create your profile', body: 'Sign up as a provider and add your business details and location.' },
  { title: 'Show your work', body: 'List your services and prices, and upload photos of your best styles.' },
  { title: 'Grow your clientele', body: 'Get discovered by clients nearby and manage bookings in one place.' },
]

const groups = [
  { key: 'clients', eyebrow: 'For clients', title: 'Find and book your next look', steps: clientSteps, cta: 'Find a provider', to: '/providers', dark: false },
  { key: 'providers', eyebrow: 'For providers', title: 'Bring your business online', steps: providerSteps, cta: 'Create a provider account', to: '/register', dark: true },
]

const categories = [
  { label: 'Barbers', text: 'Cuts, fades & beard trims', icon: 'scissors', to: '/providers?type=barber' },
  { label: 'Salons', text: 'Braids, weaves & styling', icon: 'comb', to: '/providers?type=salon' },
  { label: 'Nail specialists', text: 'Manicures, pedicures & art', icon: 'polish', to: '/providers?type=manicurist' },
  { label: 'Other beauty pros', text: 'Makeup, lashes, skincare & more', icon: 'bottle', to: '/providers?type=other' },
]
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-16 py-8 sm:space-y-24 sm:py-12">
    <!-- Page header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-14">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative">
        <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-white/50">
          <RouterLink to="/" class="hover:text-white">Home</RouterLink>
          <span aria-hidden="true">/</span>
          <span class="text-white/80" aria-current="page">About us</span>
        </nav>
        <h1 class="mt-5 max-w-3xl font-heading text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          About <span class="text-clay-400">Flairplace</span>
        </h1>
        <p class="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
          We connect clients with independent barbers, salons and nail specialists, so finding someone you trust is as easy
          as booking them.
        </p>
      </div>
    </header>

    <!-- Mission -->
    <section aria-labelledby="mission-title" class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Our mission</p>
        <h2 id="mission-title" class="mt-2 font-heading text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl">
          Making great beauty services easy to find, and easy to offer.
        </h2>
        <div aria-hidden="true" class="mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-clay-400 to-clay-700" />
      </div>
      <div class="space-y-5 text-base leading-8 text-ink-soft">
        <p>
          Finding a stylist you trust usually comes down to word of mouth. We think it should be simpler:
          see someone’s actual work, know what it costs, and book without the back-and-forth.
        </p>
        <p>
          For independent professionals, Flairplace is a storefront that works for them: a place to show their craft,
          set their prices and reach new clients in their area.
        </p>
      </div>
    </section>

    <!-- Values -->
    <section aria-labelledby="values-title">
      <div class="max-w-2xl">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Our values</p>
        <h2 id="values-title" class="mt-2 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          What we <span class="font-accent font-bold text-clay-600">stand for</span>
        </h2>
        <p class="mt-3 text-base leading-7 text-ink-soft">The principles behind every profile, search and booking on Flairplace.</p>
      </div>
      <div class="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        <article
          v-for="(value, i) in values"
          :key="value.title"
          class="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-0.5 hover:border-clay-300 hover:shadow-lg hover:shadow-clay-600/10"
        >
          <div class="flex items-start justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-50 text-clay-600 ring-1 ring-clay-100 transition group-hover:bg-clay-600 group-hover:text-white group-hover:ring-clay-600">
              <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                <path :d="value.icon" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="font-heading text-2xl font-semibold text-ink/10">{{ String(i + 1).padStart(2, '0') }}</span>
          </div>
          <h3 class="mt-5 text-base font-semibold text-ink">{{ value.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-ink-soft">{{ value.body }}</p>
          <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-clay-600 transition-transform duration-300 group-hover:scale-x-100" />
        </article>
      </div>
    </section>

    <!-- How it works -->
    <section aria-labelledby="how-title">
      <div class="max-w-2xl">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">How it works</p>
        <h2 id="how-title" class="mt-2 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Built for both sides of the <span class="font-accent font-bold text-clay-600">chair</span>
        </h2>
      </div>

      <div class="mt-8 grid gap-5 lg:grid-cols-2">
        <div
          v-for="group in groups"
          :key="group.key"
          :class="[
            'relative flex flex-col overflow-hidden rounded-3xl p-6 sm:p-8',
            group.dark ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink shadow-sm shadow-ink/5',
          ]"
        >
          <div v-if="group.dark" aria-hidden="true" class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-clay-600/40 blur-3xl" />
          <div v-else aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800" />

          <div class="relative flex flex-1 flex-col">
            <p :class="['text-[11px] font-semibold uppercase tracking-[0.16em]', group.dark ? 'text-clay-300' : 'text-clay-600']">{{ group.eyebrow }}</p>
            <h3 class="mt-2 font-heading text-xl font-semibold sm:text-2xl">{{ group.title }}</h3>

            <ol class="mt-7 space-y-6">
              <li v-for="(step, index) in group.steps" :key="step.title" class="relative flex gap-4">
                <span
                  v-if="index < group.steps.length - 1"
                  aria-hidden="true"
                  :class="['absolute left-4 top-9 -bottom-5 w-px', group.dark ? 'bg-white/15' : 'bg-ink/10']"
                />
                <span class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-600 text-sm font-semibold text-white shadow-md shadow-clay-600/30">
                  {{ index + 1 }}
                </span>
                <div>
                  <p class="text-sm font-semibold">{{ step.title }}</p>
                  <p :class="['mt-0.5 text-sm leading-6', group.dark ? 'text-white/65' : 'text-ink-soft']">{{ step.body }}</p>
                </div>
              </li>
            </ol>

            <RouterLink
              :to="group.to"
              :class="[
                'mt-8 inline-flex items-center gap-1.5 self-start rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400',
                group.dark ? 'bg-clay-600 text-white shadow-lg shadow-clay-600/30 hover:bg-clay-700' : 'border border-ink/10 bg-white text-ink hover:border-clay-300 hover:text-clay-700',
              ]"
            >
              {{ group.cta }}
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section aria-labelledby="categories-title">
      <div class="max-w-2xl">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Who you’ll find</p>
        <h2 id="categories-title" class="mt-2 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Every kind of beauty <span class="font-accent font-bold text-clay-600">professional</span>
        </h2>
        <p class="mt-3 text-base leading-7 text-ink-soft">From a quick fade to a full salon treatment, find the right specialist for the job.</p>
      </div>
      <div class="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <RouterLink
          v-for="category in categories"
          :key="category.label"
          :to="category.to"
          class="group flex flex-col rounded-2xl border border-ink/10 bg-white p-4 shadow-sm shadow-ink/5 transition hover:-translate-y-0.5 hover:border-clay-300 hover:shadow-lg hover:shadow-clay-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 sm:p-5"
        >
          <span aria-hidden="true" class="category-icon flex h-12 w-12 items-center justify-center rounded-xl bg-clay-50 p-2.5 text-clay-600 ring-1 ring-clay-100 transition group-hover:bg-clay-600 group-hover:text-white group-hover:ring-clay-600">
            <ToolMotif :icon="category.icon" />
          </span>
          <span class="mt-4 font-heading text-sm font-semibold text-ink transition group-hover:text-clay-700 sm:text-base">{{ category.label }}</span>
          <span class="mt-1 text-xs leading-5 text-ink-soft sm:text-sm">{{ category.text }}</span>
        </RouterLink>
      </div>
    </section>

    <!-- Closing CTA -->
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-clay-500 via-clay-600 to-clay-800 px-6 py-12 text-center text-white shadow-xl shadow-clay-600/20 sm:px-12 sm:py-16">
      <div aria-hidden="true" class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-white/10" />
      <div class="relative">
        <h2 class="mx-auto max-w-2xl font-heading text-2xl font-semibold tracking-tight sm:text-4xl">
          Ready to find your next look?
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-base leading-7 text-white/85">
          Explore professionals near you, or get in touch if you have a question for our team.
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <RouterLink
            to="/providers"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-clay-700 shadow-lg transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-clay-600"
          >
            Browse providers
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
          <RouterLink
            to="/contact"
            class="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Contact us
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.category-icon :deep(svg *) {
  stroke-width: 3.5px;
}
</style>
