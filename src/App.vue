<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/layout/NavBar.vue'
import PublicHeader from '@/components/layout/PublicHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import ToastHost from '@/components/shared/ToastHost.vue'
import LoadingBar from '@/components/shared/LoadingBar.vue'
import PageSpinner from '@/components/shared/PageSpinner.vue'

const route = useRoute()
const auth = useAuthStore()

const showNav = computed(() => auth.isAuthenticated && !route.meta.guestOnly)

// Auth screens also get the public header.
const AUTH_PAGES = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
]

const showLoginHeader = computed(
  () => !auth.isAuthenticated && AUTH_PAGES.includes(route.name)
)

// Public pages have a minimal header.
const showPublicHeader = computed(
  () =>
    !auth.isAuthenticated &&
    !route.meta.requiresAuth &&
    !route.meta.guestOnly
)

const showContentContainer = computed(
  () => showNav.value || showPublicHeader.value || showLoginHeader.value
)

// Provider and admin dashboards need more horizontal space.
const isWideDashboard = computed(
  () => auth.isProvider || auth.isAdmin
)

const mainClasses = computed(() => {
  if (isWideDashboard.value && showNav.value) {
    return [
      'w-full',
      'min-w-0',
      'flex-1',
      'px-3',
      'py-4',
      'sm:px-5',
      'sm:py-6',
      'lg:px-8',
    ]
  }

  if (showContentContainer.value) {
    return [
      'mx-auto',
      'w-full',
      'max-w-6xl',
      'min-w-0',
      'flex-1',
      'px-3',
      'py-6',
    ]
  }

  return [
    'w-full',
    'min-w-0',
    'flex-1',
  ]
})
</script>

<template>
  <div class="flex min-h-screen w-full min-w-0 flex-col">
    <LoadingBar />

    <PageSpinner />

    <NavBar v-if="showNav" />

    <PublicHeader
      v-else-if="showPublicHeader || showLoginHeader"
    />

    <main :class="mainClasses">
      <RouterView />
    </main>

    <Footer />

    <ToastHost />
  </div>
</template>
