<script setup>
import { computed, reactive, ref } from 'vue'
import contactApi from '@/api/contact'
import { extractErrorMessage, extractFieldErrors } from '@/utils/errors'

const email = 'info@flairplace.com'
const phone = '+254 716 065 893'
const phoneLink = phone.replace(/\s/g, '')

const TOPICS = [
  'Booking help',
  'Account & sign in',
  'Becoming a provider',
  'Payments & subscriptions',
  'Partnerships',
  'Something else',
]

const AUDIENCES = [
  { title: 'Clients', text: 'Help finding a provider, booking or managing an appointment.' },
  { title: 'Providers', text: 'Setting up your profile, services, payments and subscriptions.' },
  { title: 'Partners', text: 'Brands and businesses interested in working with Flairplace.' },
]

const form = reactive({ name: '', email: '', topic: TOPICS[0], message: '' })
const touched = ref(false)
const sent = ref(false)

const errors = computed(() => ({
  name: !form.name.trim() ? 'Please enter your name.' : '',
  email: !/^\S+@\S+\.\S+$/.test(form.email.trim()) ? 'Please enter a valid email address.' : '',
  message: form.message.trim().length < 10 ? 'Please tell us a little more (at least 10 characters).' : '',
}))
const isValid = computed(() => !Object.values(errors.value).some(Boolean))

const sending = ref(false)
const submitError = ref('')
const serverErrors = ref({})

// Map the API's field names back onto the form's fields for inline errors.
const fieldError = (field) => {
  const apiField = { name: 'full_name', topic: 'subject' }[field] ?? field
  return serverErrors.value[apiField]?.[0] || (touched.value ? errors.value[field] : '')
}

async function submit() {
  touched.value = true
  submitError.value = ''
  serverErrors.value = {}
  if (!isValid.value || sending.value) return

  sending.value = true
  try {
    await contactApi.send({
      full_name: form.name.trim(),
      email: form.email.trim(),
      subject: form.topic,
      message: form.message.trim(),
    })
    sent.value = true
  } catch (e) {
    serverErrors.value = extractFieldErrors(e)
    submitError.value = extractErrorMessage(e, 'We couldn’t send your message. Please try again.')
  } finally {
    sending.value = false
  }
}

function reset() {
  Object.assign(form, { name: '', email: '', topic: TOPICS[0], message: '' })
  touched.value = false
  sent.value = false
  submitError.value = ''
  serverErrors.value = {}
}

const faqs = [
  {
    q: 'How do I book an appointment?',
    a: 'Browse providers, open a profile, pick a service and choose a time that suits you. You’ll find all your bookings under My Appointments.',
  },
  {
    q: 'How do I list my business as a provider?',
    a: 'Create an account and choose the provider option during sign up. You can then add your services, prices, photos and location.',
  },
  {
    q: 'I can’t sign in to my account.',
    a: 'Use “Forgot password” on the sign-in page to reset it. If you still can’t get in, email us from the address on your account.',
  },
]
const openFaq = ref(0)

const inputClass = (field) => [
  'w-full rounded-xl border bg-paper/40 px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 transition focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100 sm:text-sm',
  fieldError(field) ? 'border-red-400 bg-red-50/40' : 'border-ink/10 hover:border-ink/20',
]
</script>

<template>
  <div class="mx-auto max-w-7xl py-8 sm:py-12">
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-14">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative grid items-end gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <p class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-clay-300">
            <span class="h-1.5 w-1.5 rounded-full bg-clay-400" />
            Contact us
          </p>
          <h1 class="mt-5 font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            We’re here to
            <span class="font-accent font-bold text-clay-400">help.</span>
          </h1>
          <p class="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            Questions about finding a provider, managing a booking, or setting up your professional profile?
            Reach out and our team will get back to you.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <a
            :href="`mailto:${email}`"
            class="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:border-clay-400/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
          >
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay-600 text-white shadow-lg shadow-clay-600/30">
              <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7" />
                <path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-medium uppercase tracking-wide text-white/50">Email us</span>
              <span class="mt-0.5 block truncate text-sm font-semibold text-white sm:text-base">{{ email }}</span>
            </span>
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-clay-300" aria-hidden="true">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>

          <a
            :href="`tel:${phoneLink}`"
            class="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:border-clay-400/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
          >
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay-600 text-white shadow-lg shadow-clay-600/30">
              <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
                <path d="M7.2 3.5H5a1.5 1.5 0 0 0-1.5 1.6c.7 8.1 7.2 14.6 15.3 15.4a1.5 1.5 0 0 0 1.7-1.5v-2.3a1.5 1.5 0 0 0-1.2-1.5l-3.1-.6a1.5 1.5 0 0 0-1.4.4l-1.4 1.4a16 16 0 0 1-6.3-6.3l1.4-1.4a1.5 1.5 0 0 0 .4-1.4l-.6-3.1a1.5 1.5 0 0 0-1.1-1.2Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-medium uppercase tracking-wide text-white/50">Call us</span>
              <span class="mt-0.5 block text-sm font-semibold text-white sm:text-base">{{ phone }}</span>
            </span>
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-clay-300" aria-hidden="true">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>

    <div class="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
      <!-- Side column -->
      <aside class="space-y-8 lg:pt-2">
        <div>
          <h2 class="font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Let’s <span class="font-accent font-bold text-clay-600">talk</span>
          </h2>
          <p class="mt-3 text-sm leading-6 text-ink-soft sm:text-base sm:leading-7">
            Choose a topic and tell us what’s going on. The more detail you share, the faster we can help.
          </p>
        </div>

        <ul class="space-y-5">
          <li v-for="(item, i) in AUDIENCES" :key="item.title" class="flex gap-4">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-50 text-xs font-bold text-clay-700 ring-1 ring-clay-100">
              {{ String(i + 1).padStart(2, '0') }}
            </span>
            <span>
              <span class="block text-sm font-semibold text-ink">{{ item.title }}</span>
              <span class="mt-0.5 block text-sm leading-6 text-ink-soft">{{ item.text }}</span>
            </span>
          </li>
        </ul>

        <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-clay-500 to-clay-700 p-6 text-white shadow-lg shadow-clay-600/20">
          <div aria-hidden="true" class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div aria-hidden="true" class="pointer-events-none absolute -bottom-12 right-8 h-24 w-24 rounded-full bg-white/10" />
          <h3 class="relative text-lg font-semibold">Are you a beauty professional?</h3>
          <p class="relative mt-2 text-sm leading-6 text-white/85">
            List your services, show off your work and take bookings from clients near you.
          </p>
          <RouterLink
            to="/register"
            class="relative mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-clay-700 shadow-sm transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-clay-600"
          >
            Join as a provider
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
        </div>
      </aside>

      <!-- Form -->
      <section aria-labelledby="contact-form-title" class="relative overflow-hidden rounded-3xl border border-ink/10 bg-white p-6 shadow-xl shadow-ink/5 sm:p-10">
        <div aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800" />

        <template v-if="!sent">
          <h2 id="contact-form-title" class="font-heading text-xl font-semibold text-ink sm:text-2xl">Send us a message</h2>
          <p class="mt-1.5 text-sm text-ink-soft">Fill in the form and we’ll reply to the email address you provide.</p>

          <form class="mt-8 grid gap-6 sm:grid-cols-2" novalidate @submit.prevent="submit">
            <fieldset class="sm:col-span-2">
              <legend class="mb-2.5 block text-sm font-medium text-ink">What can we help with?</legend>
              <div class="flex flex-wrap gap-2">
                <label v-for="topic in TOPICS" :key="topic" class="cursor-pointer">
                  <input v-model="form.topic" type="radio" name="topic" :value="topic" class="peer sr-only" />
                  <span class="inline-flex items-center rounded-full border border-ink/10 bg-white px-3.5 py-2 text-xs font-medium text-ink-soft transition hover:border-clay-300 hover:text-ink peer-checked:border-clay-600 peer-checked:bg-clay-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-clay-400 peer-focus-visible:ring-offset-2 sm:text-sm">
                    {{ topic }}
                  </span>
                </label>
              </div>
            </fieldset>

            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">Full name</span>
              <input v-model="form.name" type="text" autocomplete="name" placeholder="Jane Wanjiku" :class="inputClass('name')" />
              <span v-if="fieldError('name')" class="mt-1.5 block text-xs text-red-600">{{ fieldError('name') }}</span>
            </label>

            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">Email address</span>
              <input v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" :class="inputClass('email')" />
              <span v-if="fieldError('email')" class="mt-1.5 block text-xs text-red-600">{{ fieldError('email') }}</span>
            </label>

            <label class="block sm:col-span-2">
              <span class="mb-1.5 flex items-baseline justify-between">
                <span class="text-sm font-medium text-ink">Message</span>
                <span class="text-xs text-ink-soft">{{ form.message.trim().length }} characters</span>
              </span>
              <textarea v-model="form.message" rows="6" placeholder="How can we help?" :class="[...inputClass('message'), 'resize-y']" />
              <span v-if="fieldError('message')" class="mt-1.5 block text-xs text-red-600">{{ fieldError('message') }}</span>
            </label>

            <p
              v-if="submitError"
              role="alert"
              class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2"
            >
              <svg viewBox="0 0 20 20" fill="none" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M10 6v4.5M10 13.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              {{ submitError }}
            </p>

            <div class="flex flex-col-reverse gap-4 border-t border-ink/10 pt-6 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p class="flex items-center gap-2 text-xs text-ink-soft">
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0 text-clay-600" aria-hidden="true">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" />
                  <path d="M10 9v4.5M10 6.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
                We’ll reply to the email address you provide.
              </p>
              <button
                type="submit"
                :disabled="sending"
                :aria-busy="sending"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:-translate-y-0.5 hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <template v-if="sending">
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  Sending…
                </template>
                <template v-else>
                  Send message
                  <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                    <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </template>
              </button>
            </div>
          </form>
        </template>

        <div v-else class="flex flex-col items-center py-12 text-center" role="status">
          <span class="flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
            <svg viewBox="0 0 24 24" fill="none" class="h-8 w-8" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <h2 class="mt-6 font-heading text-2xl font-semibold text-ink">Message sent</h2>
          <p class="mt-2 max-w-sm text-sm leading-6 text-ink-soft">
            Thanks for getting in touch. We’ll reply to the email address you gave us. For anything urgent, write to
            <a :href="`mailto:${email}`" class="font-medium text-clay-600 underline-offset-2 hover:text-clay-700 hover:underline">{{ email }}</a>.
          </p>
          <button type="button" class="mt-8 rounded-xl border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-clay-300 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400" @click="reset">
            Write another message
          </button>
        </div>
      </section>
    </div>

    <!-- FAQ -->
    <section class="mt-16 rounded-3xl bg-paper px-6 py-12 sm:mt-24 sm:px-10 sm:py-16" aria-labelledby="faq-title">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-clay-600 sm:text-sm">FAQ</p>
          <h2 id="faq-title" class="mt-3 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Common <span class="font-accent font-bold text-clay-600">questions</span>
          </h2>
          <p class="mt-3 text-sm leading-6 text-ink-soft">
            Quick answers to what people ask us most. Can’t find what you need?
            <a :href="`mailto:${email}`" class="font-medium text-clay-600 underline-offset-2 hover:text-clay-700 hover:underline">Email us</a>.
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(faq, index) in faqs"
            :key="faq.q"
            :class="['overflow-hidden rounded-2xl border bg-white transition', openFaq === index ? 'border-clay-200 shadow-md shadow-clay-600/5' : 'border-ink/10']"
          >
            <h3>
              <button
                type="button"
                class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-clay-400 sm:px-6 sm:py-5 sm:text-base"
                :aria-expanded="openFaq === index"
                :aria-controls="`faq-panel-${index}`"
                @click="openFaq = openFaq === index ? -1 : index"
              >
                {{ faq.q }}
                <span :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition', openFaq === index ? 'bg-clay-600 text-white' : 'bg-paper text-ink-soft']">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" :class="['h-4 w-4 transition-transform', openFaq === index ? 'rotate-45' : '']">
                    <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <div v-show="openFaq === index" :id="`faq-panel-${index}`" class="px-5 pb-5 text-sm leading-6 text-ink-soft sm:px-6 sm:pb-6">
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
