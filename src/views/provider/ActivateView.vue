<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import subscriptionApi from '@/api/subscription'
import { extractErrorMessage } from '@/utils/errors'
import { getEcho } from '@/echo'

const auth = useAuthStore()
const router = useRouter()

const status = ref(null)
const loading = ref(true)
const phone = ref('')
const paying = ref(false)
const stage = ref('form') // form | waiting | success | failed
const errorMsg = ref('')
const paymentId = ref(null)
const redirectIn = ref(3)

let pollTimer = null
let redirectTimer = null
let subscribedChannelName = null

// Keep waiting for the M-Pesa transaction for 2 minutes.
const MAX_POLL_ATTEMPTS = 40
const POLL_INTERVAL = 3000

// Prevent Echo + polling from both processing success.
let paymentResolved = false

async function loadStatus() {
  loading.value = true

  try {
    const { data } = await subscriptionApi.status()
    status.value = data
  } catch (e) {
    errorMsg.value = extractErrorMessage(
      e,
      'Could not load your subscription status.'
    )
  } finally {
    loading.value = false
  }
}

onMounted(loadStatus)

async function submit() {
  if (!phone.value.trim()) {
    errorMsg.value = 'Enter the M-Pesa number to pay from.'
    return
  }

  errorMsg.value = ''
  paying.value = true
  paymentResolved = false

  // Clean up anything left over from an earlier attempt.
  stopPolling()
  unsubscribeFromChannel()

  try {
    const { data } = await subscriptionApi.pay(phone.value.trim())

    paymentId.value = data.payment_id
    stage.value = 'waiting'

    subscribeForInstantConfirmation()

    // Start polling immediately instead of waiting 3 seconds
    // for the first status check.
    pollStatus()
  } catch (e) {
    errorMsg.value = extractErrorMessage(
      e,
      'Could not start M-Pesa payment. Please try again.'
    )
  } finally {
    paying.value = false
  }
}

function subscribeForInstantConfirmation() {
  const providerProfileId =
    auth.user?.providerProfile?.id ||
    auth.user?.provider_profile?.id

  if (!providerProfileId) return

  subscribedChannelName = `provider.${providerProfileId}`

  const echo = getEcho()

  if (!echo) return

  echo
    .private(subscribedChannelName)
    .listen('.subscription.confirmed', (e) => {
      if (stage.value !== 'waiting') return
      if (paymentResolved) return

      // If the event contains a payment ID, make sure it belongs
      // to the payment currently being processed.
      if (
        e.payment_id &&
        paymentId.value &&
        String(e.payment_id) !== String(paymentId.value)
      ) {
        return
      }

      handleSuccess(e.expires_at)
    })
}

function unsubscribeFromChannel() {
  if (subscribedChannelName) {
    getEcho()?.leave(subscribedChannelName)
  }

  subscribedChannelName = null
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function handleSuccess(expiresAt) {
  // This is important because both polling and Echo can receive
  // the successful transaction around the same time.
  if (paymentResolved) return

  paymentResolved = true

  stopPolling()
  unsubscribeFromChannel()

  stage.value = 'success'

  status.value = {
    ...status.value,
    is_active: true,
    expires_at: expiresAt,
    days_left: null,
  }

  // Immediately update the cached auth state so the dashboard
  // route guard sees the provider as active.
  auth.setProviderSubscriptionActive(expiresAt)

  try {
    await auth.refreshUser()

    const { data } = await subscriptionApi.status()
    status.value = data
  } catch {
    // Non-critical.
    // The optimistic auth update above is enough for navigation.
  }

  startRedirectCountdown()
}

function pollStatus() {
  stopPolling()

  let attempts = 0
  let consecutiveFailures = 0

  const check = async () => {
    if (stage.value !== 'waiting') return
    if (paymentResolved) return

    attempts++

    try {
      const { data } = await subscriptionApi.poll(paymentId.value)

      consecutiveFailures = 0

      /*
       * IMPORTANT:
       *
       * M-Pesa/STK transactions commonly spend time in an intermediate
       * state. Do NOT treat unknown/pending states as failures.
       *
       * We only finish the payment when the backend explicitly says
       * successful, failed, or cancelled.
       */

      const paymentStatus = String(data.status || '')
        .trim()
        .toLowerCase()

      if (
        paymentStatus === 'successful' ||
        paymentStatus === 'success' ||
        paymentStatus === 'completed'
      ) {
        await handleSuccess(data.period_end || data.expires_at)
        return
      }

      if (
        paymentStatus === 'failed' ||
        paymentStatus === 'cancelled' ||
        paymentStatus === 'canceled'
      ) {
        stopPolling()
        unsubscribeFromChannel()

        stage.value = 'failed'

        errorMsg.value =
          data.result_desc ||
          'The M-Pesa payment was not completed. You may have cancelled the prompt.'

        return
      }

      /*
       * Everything else is considered pending.
       *
       * Examples:
       * pending
       * processing
       * in_progress
       * initiated
       * queued
       * sent
       * unknown
       *
       * We deliberately do NOT fail here.
       */

      if (attempts >= MAX_POLL_ATTEMPTS) {
        stopPolling()
        unsubscribeFromChannel()

        stage.value = 'failed'

        errorMsg.value =
          'The M-Pesa payment is taking longer than expected. Check your phone for the M-Pesa confirmation message before trying again.'
        
        return
      }

      // Keep polling.
      pollTimer = setTimeout(check, POLL_INTERVAL)
    } catch (e) {
      consecutiveFailures++

      /*
       * A temporary API/network failure should NOT cancel the payment.
       *
       * Give the backend several chances to respond because the actual
       * M-Pesa transaction may still be processing successfully.
       */

      if (attempts >= MAX_POLL_ATTEMPTS) {
        stopPolling()
        unsubscribeFromChannel()

        stage.value = 'failed'

        errorMsg.value =
          extractErrorMessage(
            e,
            'We could not confirm the payment yet. Check your M-Pesa messages before trying again.'
          )

        return
      }

      // Continue polling even after temporary failures.
      pollTimer = setTimeout(check, POLL_INTERVAL)
    }
  }

  check()
}

function startRedirectCountdown() {
  if (redirectTimer) {
    clearInterval(redirectTimer)
  }

  redirectIn.value = 3

  redirectTimer = setInterval(() => {
    redirectIn.value--

    if (redirectIn.value <= 0) {
      clearInterval(redirectTimer)
      redirectTimer = null
      goToDashboard()
    }
  }, 1000)
}

onBeforeUnmount(() => {
  stopPolling()

  if (redirectTimer) {
    clearInterval(redirectTimer)
    redirectTimer = null
  }

  unsubscribeFromChannel()
})

async function goToDashboard() {
  stopPolling()
  unsubscribeFromChannel()

  try {
    await auth.refreshUser()
  } catch {
    // Local optimistic subscription state remains the fallback.
  }

  if (stage.value === 'success') {
    window.location.href = '/dashboard'
    return
  }

  router.push({ name: 'provider-dashboard' })
}

function retry() {
  errorMsg.value = ''
  stage.value = 'form'
  paymentId.value = null
  paymentResolved = false
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <img
        src="/logo.jpg"
        alt="SalonBook"
        class="w-14 h-14 rounded-full object-cover mx-auto mb-4"
      />

      <p v-if="loading" class="text-center text-sm text-gray-500">
        Loading…
      </p>

      <template v-else>

        <!-- Payments disabled -->
        <template v-if="status?.payments_enabled === false">
          <h1 class="text-xl font-semibold mb-2 text-center">
            You're active
          </h1>

          <p class="text-sm text-gray-500 text-center mb-6">
            Payments are currently disabled platform-wide — your account is
            fully active with no fee required.
          </p>

          <button
            @click="goToDashboard"
            class="w-full bg-clay-600 text-white py-2 rounded-lg hover:bg-clay-700"
          >
            Go to dashboard
          </button>
        </template>

        <!-- Already active -->
        <template
          v-else-if="status?.is_active && stage === 'form'"
        >
          <h1 class="text-xl font-semibold mb-2 text-center">
            You're active
          </h1>

          <p class="text-sm text-gray-500 text-center mb-1">
            Your subscription is active until
            <strong>{{ formatDate(status.expires_at) }}</strong>.
          </p>

          <p class="text-xs text-sage-600 text-center mb-6">
            {{ status.days_left }}
            day{{ status.days_left === 1 ? '' : 's' }} left
          </p>

          <button
            @click="goToDashboard"
            class="w-full bg-clay-600 text-white py-2 rounded-lg hover:bg-clay-700 mb-3"
          >
            Go to dashboard
          </button>

          <p class="text-xs text-center text-gray-400">
            Want to renew early? Paying now adds another 30 days on top
            of your current expiry.
          </p>
        </template>

        <!-- Payment form -->
        <template v-else-if="stage === 'form'">
          <h1 class="text-xl font-semibold mb-2 text-center">
            {{
              status?.expires_at
                ? 'Your subscription has expired'
                : 'Activate your account'
            }}
          </h1>

          <p class="text-sm text-gray-500 text-center mb-6">
            Pay KES {{ status?.fee ?? 70 }} via M-Pesa to be listed and
            start accepting bookings for the next 30 days.
          </p>

          <label class="block text-sm mb-1 text-gray-600">
            M-Pesa phone number
          </label>

          <input
            v-model="phone"
            placeholder="07XXXXXXXX"
            :disabled="paying"
            class="w-full mb-4 px-3 py-2 border rounded-lg disabled:opacity-50"
          />

          <p
            v-if="errorMsg"
            class="text-red-600 text-sm mb-4"
          >
            {{ errorMsg }}
          </p>

          <button
            :disabled="paying"
            @click="submit"
            class="w-full bg-clay-600 text-white py-2 rounded-lg hover:bg-clay-700 disabled:opacity-50"
          >
            {{
              paying
                ? 'Starting payment…'
                : `Pay KES ${status?.fee ?? 70}`
            }}
          </button>
        </template>

        <!-- Waiting for M-Pesa -->
        <template v-else-if="stage === 'waiting'">
          <div class="text-center py-4">
            <div
              class="animate-spin h-8 w-8 border-2 border-clay-500 border-t-transparent rounded-full mx-auto mb-3"
            ></div>

            <p class="text-sm text-gray-600 mb-2">
              Check your phone and enter your M-Pesa PIN to approve
              the payment prompt…
            </p>

            <p class="text-xs text-gray-400">
              We're waiting for M-Pesa to confirm the transaction.
              Please don't close this page.
            </p>
          </div>
        </template>

        <!-- Success -->
        <template v-else-if="stage === 'success'">
          <div class="text-center py-4">
            <p class="text-green-600 text-2xl mb-2">
              ✓
            </p>

            <p class="text-sm text-gray-700 mb-1">
              You're activated!
            </p>

            <p class="text-xs text-gray-500 mb-4">
              Active until {{ formatDate(status.expires_at) }}

              <template v-if="status.days_left != null">
                · {{ status.days_left }} days left
              </template>
            </p>

            <button
              @click="goToDashboard"
              class="w-full py-2 rounded-lg bg-clay-600 text-white mb-2"
            >
              Go to dashboard now
            </button>

            <p class="text-xs text-gray-400">
              Redirecting in {{ redirectIn }}s…
            </p>
          </div>
        </template>

        <!-- Failed -->
        <template v-else-if="stage === 'failed'">
          <div class="text-center py-2">
            <p class="text-red-600 text-2xl mb-2">
              ✕
            </p>

            <p class="text-red-600 text-sm mb-4">
              {{ errorMsg }}
            </p>

            <button
              @click="retry"
              class="w-full py-2 rounded-lg bg-clay-600 text-white"
            >
              Try again
            </button>
          </div>
        </template>

      </template>
    </div>
  </div>
</template>