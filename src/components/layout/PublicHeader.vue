<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menuOpen = ref(false)

const ICONS = {
  providers: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2 .7 3.3 2.4 3.7 5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5m0-8h.01',
  mail: 'M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Zm.5.5 7.5 5.5L19.5 8',
}

const links = [
  { to: '/providers', label: 'Providers', icon: 'providers' },
  { to: '/about', label: 'About us', icon: 'info' },
  { to: '/contact', label: 'Contact us', icon: 'mail' },
]

const AUTH_PAGES = ['login', 'register', 'forgot-password', 'reset-password']
const onAuthPage = computed(() => AUTH_PAGES.includes(route.name))

// On an auth page, keep whatever destination the visitor was originally headed
// to instead of redirecting back to the auth page itself.
const redirectQuery = computed(() => {
  if (onAuthPage.value) return route.query.redirect ? { redirect: route.query.redirect } : {}
  return { redirect: route.fullPath }
})
const loginTo = computed(() => ({ path: '/login', query: redirectQuery.value }))
const registerTo = computed(() => ({ path: '/register', query: redirectQuery.value }))

const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`)

watch(() => route.fullPath, () => { menuOpen.value = false })

// Lock page scroll behind the open mobile menu.
watch(menuOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })

function onKeydown(e) {
  if (e.key === 'Escape') menuOpen.value = false
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <nav class="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80" aria-label="Main">
    <div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
      <!-- Brand -->
      <RouterLink to="/" class="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">
        <img src="/logo.png" alt="" class="h-11 w-11 rounded-full object-cover shadow-sm ring-2 ring-white" />
        <span class="font-heading text-lg font-semibold tracking-tight text-ink">Flairplace</span>
      </RouterLink>

      <!-- Desktop links -->
      <div class="hidden flex-1 items-center justify-center gap-1 md:flex">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          :class="[
            'relative whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400',
            isActive(link.to) ? 'bg-white text-clay-700 shadow-sm ring-1 ring-ink/5' : 'text-ink-soft hover:bg-white/70 hover:text-ink',
          ]"
        >
          {{ link.label }}
          <span v-if="isActive(link.to)" aria-hidden="true" class="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-clay-600" />
        </RouterLink>
      </div>

      <!-- Desktop auth -->
      <div class="hidden shrink-0 items-center gap-2 md:flex">
        <RouterLink
          :to="loginTo"
          :aria-current="route.name === 'login' ? 'page' : undefined"
          :class="['rounded-xl px-3.5 py-2 text-sm font-semibold transition', route.name === 'login' ? 'bg-white text-clay-700 shadow-sm ring-1 ring-ink/5' : 'text-ink']"
          class="hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
        >
          Log in
        </RouterLink>
        <RouterLink
          :to="registerTo"
          class="rounded-xl bg-clay-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2"
        >
          Sign up
        </RouterLink>
      </div>

      <!-- Mobile: sign up + menu toggle -->
      <div class="ml-auto flex items-center gap-2 md:hidden">
        <RouterLink
          v-if="!menuOpen && route.name === 'register'"
          :to="loginTo"
          class="rounded-xl border border-ink/10 bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-clay-300"
        >
          Log in
        </RouterLink>
        <RouterLink
          v-else-if="!menuOpen"
          :to="registerTo"
          class="rounded-xl bg-clay-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700"
        >
          Sign up
        </RouterLink>
        <button
          type="button"
          :aria-expanded="menuOpen"
          aria-controls="public-navigation-menu"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink shadow-sm transition hover:border-clay-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
          @click="menuOpen = !menuOpen"
        >
          <svg v-if="!menuOpen" viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile menu — teleported to <body> so the nav's backdrop-blur doesn't clip it -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div v-if="menuOpen" class="fixed inset-x-0 bottom-0 top-16 z-40 bg-ink/40 backdrop-blur-sm md:hidden" @click.self="menuOpen = false">
          <div id="public-navigation-menu" class="max-h-full overflow-y-auto rounded-b-3xl border-b border-ink/10 bg-paper px-4 pb-6 pt-4 shadow-2xl sm:px-6">
            <div class="rounded-2xl border border-ink/10 bg-white p-2">
              <RouterLink
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                :aria-current="isActive(link.to) ? 'page' : undefined"
                :class="[
                  'flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-semibold transition',
                  isActive(link.to) ? 'bg-clay-50 text-clay-700' : 'text-ink hover:bg-paper',
                ]"
              >
                <span :class="['flex h-9 w-9 items-center justify-center rounded-lg', isActive(link.to) ? 'bg-clay-600 text-white' : 'bg-clay-50 text-clay-600']">
                  <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" aria-hidden="true">
                    <path :d="ICONS[link.icon]" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                {{ link.label }}
                <svg viewBox="0 0 20 20" fill="none" class="ml-auto h-4 w-4 text-ink-soft/60" aria-hidden="true">
                  <path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </RouterLink>
            </div>

            <div class="mt-4 rounded-2xl bg-ink p-5 text-white">
              <p class="font-heading text-lg font-semibold">
                Book your next <span class="font-accent font-bold text-clay-400">look</span>
              </p>
              <p class="mt-1 text-sm text-white/60">Create a free account to book, message providers and leave reviews.</p>
              <div class="mt-4 grid grid-cols-2 gap-2">
                <RouterLink
                  :to="loginTo"
                  class="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Log in
                </RouterLink>
                <RouterLink
                  :to="registerTo"
                  class="inline-flex items-center justify-center rounded-xl bg-clay-600 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/30 transition hover:bg-clay-700"
                >
                  Sign up
                </RouterLink>
              </div>
            </div>

            <p class="mt-4 flex justify-center gap-4 text-xs text-ink-soft">
              <RouterLink to="/privacy" class="hover:text-clay-700">Privacy policy</RouterLink>
              <span aria-hidden="true">·</span>
              <RouterLink to="/terms" class="hover:text-clay-700">Terms &amp; conditions</RouterLink>
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>
