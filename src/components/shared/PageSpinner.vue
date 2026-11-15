<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useLoadingStore } from '@/stores/loading'

const loading = useLoadingStore()
const visible = ref(false)
let showTimer = null

// Only show the spinner if the page switch takes noticeably long, so quick
// (already-cached) navigations don't flash an overlay.
const SHOW_DELAY_MS = 150

watch(
  () => loading.navigating,
  (navigating) => {
    clearTimeout(showTimer)
    if (navigating) {
      showTimer = setTimeout(() => { visible.value = true }, SHOW_DELAY_MS)
    } else {
      visible.value = false
    }
  }
)

onBeforeUnmount(() => clearTimeout(showTimer))
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-[55] flex items-center justify-center bg-paper/60 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div class="flex flex-col items-center gap-4 rounded-3xl bg-white px-8 py-7 shadow-2xl shadow-ink/10 ring-1 ring-ink/5">
        <div class="relative h-16 w-16">
          <!-- Track -->
          <span class="absolute inset-0 rounded-full border-4 border-clay-100" aria-hidden="true" />
          <!-- Spinning arc -->
          <span class="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-clay-600 border-r-clay-600" aria-hidden="true" />
          <!-- Logo -->
          <img src="/logo.png" alt="" class="absolute inset-2 h-12 w-12 rounded-full object-cover" />
        </div>
        <p class="text-sm font-semibold text-ink">
          Loading<span class="loading-dots" aria-hidden="true"></span>
          <span class="sr-only">page, please wait</span>
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-dots::after {
  content: '';
  display: inline-block;
  width: 1.2em;
  text-align: left;
  animation: dots 1.2s steps(4, end) infinite;
}
@keyframes dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}
@media (prefers-reduced-motion: reduce) {
  .animate-spin { animation-duration: 2.5s; }
  .loading-dots::after { animation: none; content: '…'; }
}
</style>
