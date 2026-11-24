
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import messagesApi from '@/api/messages'
import appointmentsApi from '@/api/appointments'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const menuOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuEl = ref(null)

const unreadMessages = ref(0)
const pendingBookings = ref(0)

let badgeTimer = null

// --------------------------------------------------
// Logout
// --------------------------------------------------

async function handleLogout() {
  menuOpen.value = false
  userMenuOpen.value = false

  await auth.logout()

  router.push({ name: 'discover' })
}

// --------------------------------------------------
// Navigation behaviour
// --------------------------------------------------

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
    userMenuOpen.value = false
    refreshBadges()
  }
)

watch(menuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// --------------------------------------------------
// Notification badges
// --------------------------------------------------

async function refreshBadges() {
  if (!auth.isAuthenticated) return

  try {
    if (auth.isClient || auth.isProvider) {
      const { data } = await messagesApi.conversations()

      unreadMessages.value = data.reduce(
        (sum, conversation) =>
          sum + (conversation.unread_count || 0),
        0
      )
    }

    if (auth.isProvider) {
      const { data } = await appointmentsApi.list({
        status: 'pending',
      })

      pendingBookings.value = data.total ?? 0
    }
  } catch {
    // Notification badges are optional.
  }
}

// --------------------------------------------------
// Keyboard and outside-click handling
// --------------------------------------------------

function onDocumentClick(event) {
  if (
    userMenuOpen.value &&
    userMenuEl.value &&
    !userMenuEl.value.contains(event.target)
  ) {
    userMenuOpen.value = false
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    menuOpen.value = false
    userMenuOpen.value = false
  }
}

onMounted(() => {
  refreshBadges()

  badgeTimer = setInterval(refreshBadges, 30000)

  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (badgeTimer) {
    clearInterval(badgeTimer)
  }

  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)

  document.body.style.overflow = ''
})

// --------------------------------------------------
// Icons
// --------------------------------------------------

const ICONS = {
  discover:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z',

  providers:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2 .7 3.3 2.4 3.7 5',

  calendar:
    'M7 3v3m10-3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z',

  messages:
    'M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-5 4V6.5Z',

  dashboard:
    'M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z',

  catalogue:
    'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM4 15l4.5-4.5L14 16m-1.5-1.5L15 12l5 5M15.5 8.5h.01',

  clients:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2 .7 3.3 2.4 3.7 5',

  profile:
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.7-3.5 3.5-5.5 7-5.5s6.3 2 7 5.5',

  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',

  info:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5m0-8h.01',

  shield:
    'M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6l-7-2.5Zm-3 8.5 2 2 4-4',

  document:
    'M7 3.5h7l4 4v11A1.5 1.5 0 0 1 16.5 20h-9A1.5 1.5 0 0 1 6 18.5v-13.5A1.5 1.5 0 0 1 7.5 3.5Zm6.5 0V8h4.5M9 12h6M9 15.5h6',

  mail:
    'M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Zm.5.5 7.5 5.5L19.5 8',
}

// --------------------------------------------------
// Provider navigation groups
// --------------------------------------------------

const providerGroups = computed(() => [
  {
    label: 'Overview',
    links: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        exact: true,
      },
      {
        to: '/dashboard/appointments',
        label: 'Appointments',
        icon: 'calendar',
        badge: pendingBookings.value,
      },
    ],
  },

  {
    label: 'Manage',
    links: [
      {
        to: '/dashboard/catalogue',
        label: 'Catalogue',
        icon: 'catalogue',
      },
      {
        to: '/dashboard/pos',
        label: 'POS',
        icon: 'dashboard',
      },
      {
        to: '/dashboard/inventory',
        label: 'Inventory',
        icon: 'catalogue',
      },
      {
        to: '/dashboard/inventory-reports',
        label: 'Inventory Reports',
        icon: 'document',
      },
      {
        to: '/dashboard/stock-control',
        label: 'Stock Control',
        icon: 'document',
      },
      {
        to: '/dashboard/service-consumables',
        label: 'Service Materials',
        icon: 'catalogue',
      },
      {
        to: '/dashboard/procurement',
        label: 'Purchasing',
        icon: 'document',
      },
    ],
  },

  {
    label: 'Customers & Growth',
    links: [
      {
        to: '/dashboard/clients',
        label: 'Clients',
        icon: 'clients',
      },
      {
        to: '/dashboard/crm',
        label: 'Customer CRM',
        icon: 'clients',
      },
      {
        to: '/dashboard/marketing',
        label: 'Promotions',
        icon: 'document',
      },
      {
        to: '/dashboard/gift-cards',
        label: 'Gift Cards',
        icon: 'document',
      },
      {
        to: '/dashboard/loyalty',
        label: 'Loyalty Rewards',
        icon: 'clients',
      },
      {
        to: '/dashboard/gift-memberships',
        label: 'Memberships',
        icon: 'clients',
      },
      {
        to: '/messages',
        label: 'Messages',
        icon: 'messages',
        badge: unreadMessages.value,
      },
    ],
  },

  {
    label: 'Business',
    links: [
      {
        to: '/dashboard/finance',
        label: 'Finances',
        icon: 'document',
      },
      {
        to: '/dashboard/branches',
        label: 'Branches',
        icon: 'settings',
      },
      {
        to: '/dashboard/team',
        label: 'Staff & Permissions',
        icon: 'shield',
      },
      {
        to: '/dashboard/profile',
        label: 'Profile',
        icon: 'profile',
      },
    ],
  },
])

// --------------------------------------------------
// Main navigation links
// --------------------------------------------------

const primaryLinks = computed(() => {
  if (auth.isProvider) {
    return providerGroups.value.flatMap(group => group.links)
  }

  if (auth.isAdmin) {
    return [
      {
        to: '/admin',
        label: 'Overview',
        icon: 'dashboard',
        exact: true,
      },
      {
        to: '/admin/users',
        label: 'Users',
        icon: 'clients',
      },
      {
        to: '/admin/providers',
        label: 'Providers',
        icon: 'providers',
      },
      {
        to: '/admin/appointments',
        label: 'Appointments',
        icon: 'calendar',
      },
      {
        to: '/admin/settings',
        label: 'Settings',
        icon: 'settings',
      },
    ]
  }

  return [
    {
      to: '/',
      label: 'Discover',
      icon: 'discover',
      exact: true,
    },
    {
      to: '/providers',
      label: 'Providers',
      icon: 'providers',
    },
    {
      to: '/my-appointments',
      label: 'My appointments',
      icon: 'calendar',
    },
    {
      to: '/messages',
      label: 'Messages',
      icon: 'messages',
      badge: unreadMessages.value,
    },
  ]
})

// --------------------------------------------------
// Secondary navigation
// --------------------------------------------------

const secondaryLinks = computed(() => [
  ...(auth.isClient
    ? []
    : [
        {
          to: '/providers',
          label: 'Browse providers',
          icon: 'providers',
        },
      ]),

  {
    to: '/about',
    label: 'About us',
    icon: 'info',
  },
  {
    to: '/contact',
    label: 'Contact us',
    icon: 'mail',
  },
  {
    to: '/privacy',
    label: 'Privacy policy',
    icon: 'shield',
  },
  {
    to: '/terms',
    label: 'Terms & conditions',
    icon: 'document',
  },
])

// --------------------------------------------------
// User information
// --------------------------------------------------

function isActive(link) {
  if (link.exact) {
    return route.path === link.to
  }

  return (
    route.path === link.to ||
    route.path.startsWith(`${link.to}/`)
  )
}

const homeLink = computed(() => {
  if (auth.isAdmin) return '/admin'
  if (auth.isProvider) return '/dashboard'

  return '/'
})

const roleLabel = computed(() => {
  if (auth.isAdmin) return 'Admin'
  if (auth.isProvider) return 'Provider'

  return 'Client'
})

const initials = computed(() =>
  String(auth.user?.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('')
)

const hasAlerts = computed(
  () =>
    unreadMessages.value > 0 ||
    pendingBookings.value > 0
)

const badgeText = number =>
  number > 99 ? '99+' : number
</script>

<template>
  <nav
    class="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur-md supports-[backdrop-filter]:bg-paper/85"
    aria-label="Main navigation"
  >
    <div
      class="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-3 sm:px-6"
    >
      <!-- Brand -->
      <RouterLink
        :to="homeLink"
        class="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
      >
        <img
          src="/logo.png"
          alt="Flairplace"
          class="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
        />

        <span
          class="font-heading text-lg font-semibold tracking-tight text-ink"
        >
          Flairplace
        </span>

        <span
          v-if="!auth.isClient"
          class="hidden rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white sm:inline"
        >
          {{ roleLabel }}
        </span>
      </RouterLink>

      <!-- Desktop navigation -->
      <div
        class="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
      >
        <!-- Provider dropdown groups -->
        <template v-if="auth.isProvider">
          <details
            v-for="group in providerGroups"
            :key="group.label"
            class="group relative"
          >
            <summary
              class="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
              :class="group.links.some(isActive)
                ? 'bg-white text-clay-700 shadow-sm ring-1 ring-ink/5'
                : ''"
            >
              {{ group.label }}

              <svg
                viewBox="0 0 20 20"
                fill="none"
                class="h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </summary>

            <div
              class="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-ink/10 bg-white p-2 shadow-xl"
            >
              <RouterLink
                v-for="link in group.links"
                :key="link.to"
                :to="link.to"
                :aria-current="isActive(link) ? 'page' : undefined"
                class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition"
                :class="isActive(link)
                  ? 'bg-clay-50 font-semibold text-clay-700'
                  : 'text-ink hover:bg-paper'"
              >
                <span>{{ link.label }}</span>

                <span
                  v-if="link.badge"
                  class="flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-600 px-1.5 text-xs font-bold text-white"
                >
                  {{ badgeText(link.badge) }}
                </span>
              </RouterLink>
            </div>
          </details>
        </template>

        <!-- Admin and client navigation -->
        <template v-else>
          <RouterLink
            v-for="link in primaryLinks"
            :key="link.to"
            :to="link.to"
            :aria-current="isActive(link) ? 'page' : undefined"
            :class="[
              'relative whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400',
              isActive(link)
                ? 'bg-white text-clay-700 shadow-sm ring-1 ring-ink/5'
                : 'text-ink-soft hover:bg-white/70 hover:text-ink',
            ]"
          >
            {{ link.label }}

            <span
              v-if="link.badge"
              class="ml-1 rounded-full bg-clay-600 px-2 py-1 text-xs font-bold text-white"
            >
              {{ badgeText(link.badge) }}
            </span>
          </RouterLink>
        </template>
      </div>

      <!-- Right side -->
      <div class="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
        <!-- Desktop account menu -->
        <div
          ref="userMenuEl"
          class="relative hidden lg:block"
        >
          <button
            type="button"
            :aria-expanded="userMenuOpen"
            aria-haspopup="menu"
            class="flex items-center gap-2 rounded-full border border-ink/10 bg-white py-1 pl-1 pr-3 shadow-sm transition hover:border-clay-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
            @click.stop="userMenuOpen = !userMenuOpen"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-xs font-bold text-white"
            >
              {{ initials }}
            </span>

            <span
              class="max-w-[8rem] truncate text-sm font-semibold text-ink"
            >
              {{ auth.user?.name?.split(' ')[0] }}
            </span>

            <svg
              viewBox="0 0 20 20"
              fill="none"
              :class="[
                'h-4 w-4 text-ink-soft transition-transform',
                userMenuOpen ? 'rotate-180' : '',
              ]"
              aria-hidden="true"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="-translate-y-1 opacity-0"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="-translate-y-1 opacity-0"
          >
            <div
              v-if="userMenuOpen"
              role="menu"
              class="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl shadow-ink/15"
            >
              <div class="bg-ink px-4 py-4 text-white">
                <p class="truncate text-sm font-semibold">
                  {{ auth.user?.name }}
                </p>

                <p
                  v-if="auth.user?.email"
                  class="truncate text-xs text-white/60"
                >
                  {{ auth.user.email }}
                </p>

                <span
                  class="mt-2 inline-block rounded-md bg-clay-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                >
                  {{ roleLabel }}
                </span>
              </div>

              <div class="p-2">
                <RouterLink
                  v-for="link in secondaryLinks"
                  :key="link.to"
                  :to="link.to"
                  role="menuitem"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-paper hover:text-clay-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    class="h-4 w-4 text-ink-soft"
                    aria-hidden="true"
                  >
                    <path
                      :d="ICONS[link.icon]"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>

                  {{ link.label }}
                </RouterLink>
              </div>

              <div class="border-t border-ink/10 p-2">
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  @click="handleLogout"
                >
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Mobile messages shortcut -->
        <RouterLink
          v-if="!auth.isAdmin"
          to="/messages"
          aria-label="Messages"
          class="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 lg:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path
              :d="ICONS.messages"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <span
            v-if="unreadMessages"
            class="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-600 px-1 text-[9px] font-bold text-white ring-2 ring-paper"
          >
            {{ badgeText(unreadMessages) }}
          </span>
        </RouterLink>

        <!-- Mobile menu button -->
        <button
          type="button"
          :aria-expanded="menuOpen"
          aria-controls="mobile-menu"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink shadow-sm transition hover:border-clay-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 lg:hidden"
          @click="menuOpen = !menuOpen"
        >
          <svg
            v-if="!menuOpen"
            viewBox="0 0 24 24"
            fill="none"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M4 7h16M4 12h16M4 17h10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>

          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>

          <span
            v-if="!menuOpen && hasAlerts"
            class="absolute right-2 top-2 h-2 w-2 rounded-full bg-clay-600 ring-2 ring-paper"
          />
        </button>
      </div>
    </div>

    <!-- Mobile navigation overlay -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="menuOpen"
          class="fixed inset-x-0 bottom-0 top-16 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
          @click.self="menuOpen = false"
        >
          <div
            id="mobile-menu"
            class="max-h-full overflow-y-auto rounded-b-3xl border-b border-ink/10 bg-paper px-4 pb-8 pt-4 shadow-2xl sm:px-6"
          >
            <!-- Account card -->
            <div
              class="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white"
            >
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-sm font-bold"
              >
                {{ initials }}
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">
                  {{ auth.user?.name }}
                </p>

                <p
                  v-if="auth.user?.email"
                  class="truncate text-xs text-white/60"
                >
                  {{ auth.user.email }}
                </p>
              </div>

              <span
                class="shrink-0 rounded-md bg-clay-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              >
                {{ roleLabel }}
              </span>
            </div>

            <!-- Provider mobile navigation -->
            <div
              v-if="auth.isProvider"
              class="mt-4 space-y-3"
            >
              <details
                v-for="group in providerGroups"
                :key="group.label"
                :open="group.links.some(isActive)"
                class="overflow-hidden rounded-2xl border border-ink/10 bg-white"
              >
                <summary
                  class="flex cursor-pointer list-none items-center justify-between px-4 py-4 font-semibold text-ink"
                >
                  <span>{{ group.label }}</span>

                  <span class="flex items-center gap-2">
                    <span class="text-xs text-ink-soft">
                      {{ group.links.length }} items
                    </span>

                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      class="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                </summary>

                <div class="space-y-1 border-t border-ink/10 p-2">
                  <RouterLink
                    v-for="link in group.links"
                    :key="link.to"
                    :to="link.to"
                    :aria-current="isActive(link) ? 'page' : undefined"
                    class="flex min-h-12 items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition"
                    :class="isActive(link)
                      ? 'bg-clay-600 text-white'
                      : 'text-ink hover:bg-paper'"
                  >
                    <span>{{ link.label }}</span>

                    <span
                      v-if="link.badge"
                      class="rounded-full px-2 py-1 text-xs font-bold"
                      :class="isActive(link)
                        ? 'bg-white text-clay-700'
                        : 'bg-clay-600 text-white'"
                    >
                      {{ badgeText(link.badge) }}
                    </span>
                  </RouterLink>
                </div>
              </details>
            </div>

            <!-- Admin and client mobile navigation -->
            <div
              v-else
              class="mt-4 grid grid-cols-2 gap-2"
            >
              <RouterLink
                v-for="link in primaryLinks"
                :key="link.to"
                :to="link.to"
                :aria-current="isActive(link) ? 'page' : undefined"
                :class="[
                  'relative flex min-h-24 flex-col justify-center gap-2 rounded-2xl border p-4 text-sm font-semibold transition',
                  isActive(link)
                    ? 'border-clay-600 bg-clay-600 text-white'
                    : 'border-ink/10 bg-white text-ink hover:border-clay-300',
                ]"
              >
                <span>{{ link.label }}</span>

                <span
                  v-if="link.badge"
                  class="absolute right-3 top-3 rounded-full bg-clay-600 px-2 py-1 text-xs font-bold text-white"
                >
                  {{ badgeText(link.badge) }}
                </span>
              </RouterLink>
            </div>

            <!-- Secondary links -->
            <div
              class="mt-4 rounded-2xl border border-ink/10 bg-white p-2"
            >
              <p
                class="px-3 pb-2 pt-2 text-xs font-bold uppercase tracking-wider text-ink-soft"
              >
                More
              </p>

              <RouterLink
                v-for="link in secondaryLinks"
                :key="link.to"
                :to="link.to"
                class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink transition hover:bg-paper"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  class="h-4 w-4 text-ink-soft"
                  aria-hidden="true"
                >
                  <path
                    :d="ICONS[link.icon]"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                {{ link.label }}

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  class="ml-auto h-4 w-4 text-ink-soft/60"
                  aria-hidden="true"
                >
                  <path
                    d="m8 5 5 5-5 5"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </RouterLink>
            </div>

            <!-- Logout -->
            <button
              type="button"
              class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              @click="handleLogout"
            >
              Log out
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>
