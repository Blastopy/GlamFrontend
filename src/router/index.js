import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import { setSeo } from '@/utils/seo'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: () => import('@/views/auth/RegisterView.vue'), meta: { guestOnly: true } },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/auth/ForgotPasswordView.vue'), meta: { guestOnly: true } },
  { path: '/reset-password', name: 'reset-password', component: () => import('@/views/auth/ResetPasswordView.vue'), meta: { guestOnly: true } },
  { path: '/verify-email', name: 'verify-email', component: () => import('@/views/auth/VerifyEmailView.vue') },

  // ── Public (browsable by anyone; booking itself still requires login) ──
  {
    path: '/',
    name: 'discover',
    component: () => import('@/views/client/DiscoverView.vue'),
    meta: { seo: { description: 'Find and book trusted barbers, salons and nail specialists near you in Kenya. Browse real work, compare upfront prices and book in minutes.' } },
  },
  {
    path: '/providers',
    name: 'providers-directory',
    component: () => import('@/views/public/ProvidersView.vue'),
    meta: { seo: { title: 'Barbers, salons & nail specialists near you', description: 'Compare barbers, salons and nail specialists in Kenya by rating, price and distance. View real portfolios and book your next appointment on Flairplace.' } },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/public/AboutView.vue'),
    meta: { seo: { title: 'About us', description: 'Flairplace connects clients with independent barbers, salons and nail specialists in Kenya. Learn how we make great beauty services easy to find and book.' } },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/public/ContactView.vue'),
    meta: { seo: { title: 'Contact us', description: 'Questions about bookings, payments or listing your beauty business? Contact the Flairplace team by email, phone or our contact form.' } },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/public/PrivacyView.vue'),
    meta: { seo: { title: 'Privacy Policy', description: 'How Flairplace collects, uses and protects your personal data, in line with the Kenya Data Protection Act, 2019.' } },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/public/TermsView.vue'),
    meta: { seo: { title: 'Terms & Conditions', description: 'The terms that apply when you use Flairplace to discover, book or offer beauty services in Kenya.' } },
  },
  {
    path: '/providers/:id',
    name: 'provider-profile',
    component: () => import('@/views/client/ProviderProfileView.vue'),
    meta: { seo: { title: 'Beauty provider', description: 'View services, prices, photos, reviews and location, then book an appointment on Flairplace.' } },
  },

  // ── Client-facing ────────────────────────────────
  {
    path: '/my-appointments',
    name: 'my-appointments',
    component: () => import('@/views/client/MyAppointmentsView.vue'),
    meta: { requiresAuth: true, role: 'client' },
  },
  {
    path: '/messages/:userId?',
    name: 'messages',
    component: () => import('@/views/client/MessagesView.vue'),
    meta: { requiresAuth: true },
  },

  // ── Provider-facing ──────────────────────────────
  {
    path: '/provider/activate',
    name: 'provider-activate',
    component: () => import('@/views/provider/ActivateView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard',
    name: 'provider-dashboard',
    component: () => import('@/views/provider/DashboardView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/appointments',
    name: 'provider-appointments',
    component: () => import('@/views/provider/AppointmentsCalendarView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/catalogue',
    name: 'provider-catalogue',
    component: () => import('@/views/provider/CatalogueView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/procurement',
    name: 'provider-procurement',
    component: () => import('@/views/provider/ProcurementView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/gift-cards',
    name: 'provider-gift-cards',
    component: () => import('@/views/provider/GiftCardsView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/marketing',
    name: 'provider-marketing',
    component: () => import('@/views/provider/MarketingView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/finance',
    name: 'provider-finance',
    component: () => import('@/views/provider/FinanceView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/inventory-reports',
    name: 'provider-inventory-reports',
    component: () => import('@/views/provider/InventoryReportsView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/service-consumables',
    name: 'provider-service-consumables',
    component: () => import('@/views/provider/ServiceConsumablesView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/stock-control',
    name: 'provider-stock-control',
    component: () => import('@/views/provider/StockControlView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/inventory',
    name: 'provider-inventory',
    component: () => import('@/views/provider/InventoryView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/pos',
    name: 'provider-pos',
    component: () => import('@/views/provider/PosView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/clients',
    name: 'provider-clients',
    component: () => import('@/views/provider/ClientsView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/team',
    name: 'provider-team',
    component: () => import('@/views/provider/TeamView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/branches',
    name: 'provider-branches',
    component: () => import('@/views/provider/BranchesView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },
  {
    path: '/dashboard/profile',
    name: 'provider-profile-edit',
    component: () => import('@/views/provider/ProfileEditView.vue'),
    meta: { requiresAuth: true, role: 'provider' },
  },

  // ── Admin-facing ──────────────────────────────────
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: () => import('@/views/admin/DashboardView.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/providers',
    name: 'admin-providers',
    component: () => import('@/views/admin/ProvidersView.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/appointments',
    name: 'admin-appointments',
    component: () => import('@/views/admin/AppointmentsView.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: () => import('@/views/admin/SettingsView.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/** Where a logged-in user belongs by default — used for guest redirects and wrong-role bounces. */
export function homeRouteFor(role) {
  if (role === 'admin') return { name: 'admin-dashboard' }
  if (role === 'provider') return { name: 'provider-dashboard' }
  return { name: 'discover' }
}

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (auth.isAuthenticated && auth.user && !auth.user.email_verified_at && to.name !== 'verify-email') {
    return { name: 'verify-email', query: { email: auth.user.email } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return homeRouteFor(auth.user?.role)
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Preserve where they were headed so login/register can send them back
    // (used by the "log in to book" prompt on the public provider page).
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.role && auth.user?.role !== to.meta.role) {
    // logged in but wrong role for this route — send them to their own home
    return homeRouteFor(auth.user?.role)
  }

  // Providers must have an active (paid) monthly subscription to use anything
  // under /dashboard — the activation page itself is exempt, or this would loop.
  // Note: is_subscription_active is true unconditionally while the admin has
  // system-wide payments switched off (ProviderProfile::isSubscriptionActive),
  // so this guard never fires in that case — nothing extra to check here for it.
  if (auth.isProvider && to.name !== 'provider-activate' && to.path.startsWith('/dashboard') && !auth.isProviderSubscriptionActive) {
    return { name: 'provider-activate' }
  }

  return true
})

// Page-switch spinner: flag the navigation as in progress until the next page
// (including its lazy-loaded chunk) has resolved, failed, or been cancelled.
router.beforeEach((to, from) => {
  if (to.path !== from.path) useLoadingStore().startNavigation()
})
router.afterEach(() => useLoadingStore().stopNavigation())

// SEO: public pages get their own title/description; private and auth pages
// (no meta.seo) are marked noindex so they stay out of search results.
// The provider profile view refines this once the provider has loaded.
router.afterEach((to) => {
  const seo = to.meta.seo
  setSeo(seo ? { ...seo, path: to.path } : { path: to.path, noindex: true })
})
router.onError(() => useLoadingStore().stopNavigation())

export default router
