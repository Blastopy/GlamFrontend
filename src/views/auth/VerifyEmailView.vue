<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import authApi from '@/api/auth'
import { homeRouteFor } from '@/router'
import { extractErrorMessage } from '@/utils/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sending = ref(false)
const checking = ref(false)
const message = ref('')
const error = ref('')
const email = computed(() => String(route.query.email || auth.user?.email || 'your email address'))

async function checkVerification() {
  checking.value = true
  error.value = ''
  try {
    const user = await auth.fetchMe()
    if (user.email_verified_at) {
      router.replace(homeRouteFor(user.role))
    } else {
      message.value = 'Your email is not verified yet. Open the verification link sent to your inbox.'
    }
  } catch (e) {
    error.value = extractErrorMessage(e, 'Could not check verification status. Please sign in again.')
  } finally {
    checking.value = false
  }
}

async function resend() {
  sending.value = true
  message.value = ''
  error.value = ''
  try {
    await authApi.resendVerificationEmail()
    message.value = 'A new verification link has been sent. Check your inbox and spam folder.'
  } catch (e) {
    error.value = extractErrorMessage(e, 'Could not resend the verification email. Please try again.')
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  if (route.query.verified === '1' && auth.isAuthenticated) {
    await checkVerification()
  }
})
</script>

<template>
  <main class="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4 py-12">
    <section class="w-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <img src="/logo.png" alt="Flairplace" class="mx-auto mb-5 h-14 w-14 rounded-full object-cover" />
      <h1 class="text-2xl font-semibold text-ink">Verify your email</h1>
      <p class="mt-3 text-sm leading-6 text-gray-600">
        We sent a verification link to <strong>{{ email }}</strong>. Open that email and click the link to activate your account.
      </p>
      <p v-if="message" class="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">{{ message }}</p>
      <p v-if="error" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <div class="mt-6 flex flex-col gap-3">
        <button type="button" :disabled="sending || !auth.isAuthenticated" @click="resend"
          class="w-full rounded-lg bg-clay-600 px-4 py-3 text-sm font-semibold text-white hover:bg-clay-700 disabled:opacity-50">
          {{ sending ? 'Sending…' : 'Resend verification email' }}
        </button>
        <button type="button" :disabled="checking || !auth.isAuthenticated" @click="checkVerification"
          class="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {{ checking ? 'Checking…' : 'I have verified my email' }}
        </button>
      </div>
      <p class="mt-5 text-xs text-gray-500">If you cannot find the email, check your spam or junk folder.</p>
    </section>
  </main>
</template>
