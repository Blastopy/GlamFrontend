<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Shared layout for long-form legal pages (Privacy Policy, Terms & Conditions).
 *
 * sections: [{ id, title, blocks: [{ p: 'text' } | { list: ['item', ...] } | { note: 'text' }] }]
 */
defineProps({
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  accent: { type: String, required: true },
  intro: { type: String, required: true },
  updated: { type: String, required: true },
  sections: { type: Array, required: true },
  related: { type: Object, default: null }, // { to, label }
})

const activeId = ref('')
let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) activeId.value = visible[0].target.id
    },
    { rootMargin: '-96px 0px -65% 0px' }
  )
  document.querySelectorAll('[data-legal-section]').forEach((el) => observer.observe(el))
})

onBeforeUnmount(() => observer?.disconnect())

function jumpTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}
</script>

<template>
  <div class="mx-auto max-w-7xl py-6 sm:py-10">
    <!-- Header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative max-w-3xl">
        <p class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay-300">
          <span class="h-1.5 w-1.5 rounded-full bg-clay-400" />
          {{ eyebrow }}
        </p>
        <h1 class="mt-5 font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {{ title }}
          <span class="font-accent font-bold text-clay-400">{{ accent }}</span>
        </h1>
        <p class="mt-5 text-base leading-7 text-white/70 sm:text-lg sm:leading-8">{{ intro }}</p>
        <p class="mt-6 inline-flex items-center gap-2 text-xs font-medium text-white/50">
          <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M10 6v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Last updated {{ updated }}
        </p>
      </div>
    </header>

    <div class="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
      <!-- Table of contents -->
      <nav aria-label="On this page" class="lg:sticky lg:top-24 lg:self-start">
        <details class="group rounded-2xl border border-ink/10 bg-white shadow-sm shadow-ink/5 lg:hidden">
          <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-ink">
            On this page
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 text-ink-soft transition-transform group-open:rotate-180" aria-hidden="true">
              <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </summary>
          <ol class="space-y-0.5 border-t border-ink/10 p-2">
            <li v-for="(s, i) in sections" :key="s.id">
              <a :href="`#${s.id}`" class="flex gap-3 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink" @click.prevent="jumpTo(s.id)">
                <span class="w-5 shrink-0 text-xs font-bold text-clay-600">{{ String(i + 1).padStart(2, '0') }}</span>
                {{ s.title }}
              </a>
            </li>
          </ol>
        </details>

        <div class="hidden lg:block">
          <p class="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">On this page</p>
          <ol class="space-y-0.5 border-l border-ink/10">
            <li v-for="(s, i) in sections" :key="s.id">
              <a
                :href="`#${s.id}`"
                :class="[
                  '-ml-px flex gap-3 border-l-2 py-2 pl-4 pr-2 text-sm transition',
                  activeId === s.id ? 'border-clay-600 font-semibold text-ink' : 'border-transparent text-ink-soft hover:border-ink/20 hover:text-ink',
                ]"
                @click.prevent="jumpTo(s.id)"
              >
                <span :class="['w-5 shrink-0 text-xs font-bold', activeId === s.id ? 'text-clay-600' : 'text-ink-soft/60']">{{ String(i + 1).padStart(2, '0') }}</span>
                {{ s.title }}
              </a>
            </li>
          </ol>
        </div>
      </nav>

      <!-- Content -->
      <article class="min-w-0 rounded-3xl border border-ink/10 bg-white p-6 shadow-xl shadow-ink/5 sm:p-10">
        <section
          v-for="(s, i) in sections"
          :id="s.id"
          :key="s.id"
          data-legal-section
          :class="['scroll-mt-24', i > 0 ? 'mt-10 border-t border-ink/10 pt-10' : '']"
        >
          <h2 class="flex items-baseline gap-3 font-heading text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            <span class="text-sm font-bold text-clay-600">{{ String(i + 1).padStart(2, '0') }}</span>
            {{ s.title }}
          </h2>

          <div class="mt-4 space-y-4 text-sm leading-7 text-ink-soft sm:text-base sm:leading-8">
            <template v-for="(b, j) in s.blocks" :key="j">
              <p v-if="b.p">{{ b.p }}</p>
              <ul v-else-if="b.list" class="space-y-2.5">
                <li v-for="item in b.list" :key="item" class="flex gap-3">
                  <span aria-hidden="true" class="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-600" />
                  <span>{{ item }}</span>
                </li>
              </ul>
              <p v-else-if="b.note" class="flex gap-3 rounded-2xl bg-clay-50 px-4 py-3 text-sm leading-6 text-clay-800 ring-1 ring-clay-100">
                <svg viewBox="0 0 20 20" fill="none" class="mt-0.5 h-4 w-4 shrink-0 text-clay-600" aria-hidden="true">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" />
                  <path d="M10 9v4.5M10 6.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
                <span>{{ b.note }}</span>
              </p>
            </template>
          </div>
        </section>

        <!-- Contact footer -->
        <div class="mt-12 flex flex-col gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold">Questions about this page?</p>
            <p class="mt-1 text-sm text-white/60">Our team is happy to help.</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <RouterLink
              v-if="related"
              :to="related.to"
              class="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-clay-400/60 hover:bg-white/10"
            >
              {{ related.label }}
            </RouterLink>
            <RouterLink
              to="/contact"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-clay-600/30 transition hover:bg-clay-700"
            >
              Contact us
              <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </RouterLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
