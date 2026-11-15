<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { extractErrorMessage } from '@/utils/errors'
import providersApi from '@/api/providers'
import servicesApi from '@/api/services'

const auth = useAuthStore()
const notifications = useNotificationsStore()
const services = ref([])
const form = ref({ name: '', description: '', price: '', duration_minutes: 30 })
const imageFile = ref(null)
const imagePreview = ref(null)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')
const loading = ref(true)
const brokenUrls = ref(new Set()) // image URLs that failed to load — fall back gracefully instead of a broken icon

function markBroken(url) {
  brokenUrls.value.add(url)
}

async function load() {
  loading.value = true
  try {
    const providerId = auth.user.providerProfile?.id || auth.user.provider_profile?.id
    const { data } = await providersApi.services(providerId)
    services.value = data
  } catch {
    // network/server failures are already toasted globally by the axios interceptor
  } finally {
    loading.value = false
  }
}

function onImageChange(e) {
  const file = e.target.files[0] || null
  if (file && file.size > 4 * 1024 * 1024) {
    formError.value = 'That photo is too large — please choose one under 4MB.'
    e.target.value = ''
    return
  }
  imageFile.value = file
  imagePreview.value = file ? URL.createObjectURL(file) : null
}

function resetForm() {
  form.value = { name: '', description: '', price: '', duration_minutes: 30 }
  editingId.value = null
  imageFile.value = null
  imagePreview.value = null
  formError.value = ''
}

function edit(service) {
  editingId.value = service.id
  form.value = {
    name: service.name,
    description: service.description,
    price: service.price,
    duration_minutes: service.duration_minutes,
  }
  imageFile.value = null
  imagePreview.value = service.image_url // show the existing photo until a new one is picked
  formError.value = ''
}

async function submit() {
  formError.value = ''
  saving.value = true
  try {
    const payload = { ...form.value }
    if (imageFile.value) payload.image = imageFile.value

    if (editingId.value) {
      await servicesApi.update(editingId.value, payload)
    } else {
      await servicesApi.create(payload)
    }
    resetForm()
    await load()
  } catch (e) {
    formError.value = extractErrorMessage(e, 'Could not save this style. Please check the details and try again.')
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  if (!confirm('Remove this style from your catalogue?')) return
  try {
    await servicesApi.remove(id)
    await load()
  } catch (e) {
    notifications.error(extractErrorMessage(e, 'Could not remove this style.'))
  }
}


onMounted(load)

const formEl = ref(null)

// Edit a style and bring the form into view — on phones it sits below the list.
async function startEdit(service) {
  edit(service)
  await nextTick()
  formEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function focusForm() {
  formEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const priceRange = computed(() => {
  const prices = services.value.map((s) => Number(s.price)).filter(Number.isFinite)
  if (!prices.length) return null
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `KES ${min.toLocaleString()}` : `KES ${min.toLocaleString()} – ${max.toLocaleString()}`
})

const withPhotos = computed(() => services.value.filter((s) => s.image_url && !brokenUrls.value.has(s.image_url)).length)

const inputClass = 'w-full rounded-xl border border-ink/10 bg-paper/40 px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 transition hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100 sm:text-sm'
</script>

<template>
  <div class="mx-auto max-w-7xl py-6 sm:py-10">
    <!-- Header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
      <div aria-hidden="true" class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl" />
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl" />

      <div class="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-clay-300">Styles &amp; pricing</p>
          <h1 class="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Your <span class="font-accent font-bold text-clay-400">catalogue</span>
          </h1>
          <p class="mt-3 max-w-lg text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            The styles, prices and photos clients see when they visit your profile.
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3 lg:w-[26rem]">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-white/50">Styles</p>
            <p class="mt-1 font-heading text-2xl font-bold sm:text-3xl">{{ loading ? '–' : services.length }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-white/50">With photo</p>
            <p class="mt-1 font-heading text-2xl font-bold sm:text-3xl">{{ loading ? '–' : withPhotos }}</p>
          </div>
          <div class="rounded-2xl border border-clay-400/30 bg-clay-600/20 p-4 backdrop-blur">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-clay-200">Prices</p>
            <p class="mt-1.5 text-xs font-semibold leading-5 sm:text-sm">{{ loading ? '–' : priceRange || '—' }}</p>
          </div>
        </div>
      </div>
    </header>

    <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
      <!-- Styles -->
      <section aria-labelledby="styles-title" class="min-w-0">
        <div class="mb-5 flex items-center justify-between gap-3">
          <h2 id="styles-title" class="font-heading text-xl font-semibold text-ink sm:text-2xl">All styles</h2>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 lg:hidden"
            @click="resetForm(); focusForm()"
          >
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
              <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            Add style
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="grid animate-pulse gap-4 sm:grid-cols-2" role="status" aria-label="Loading styles">
          <div v-for="n in 4" :key="n" class="overflow-hidden rounded-2xl border border-ink/10 bg-white">
            <div class="aspect-[16/10] bg-paper" />
            <div class="space-y-3 p-5">
              <div class="h-4 w-1/2 rounded-full bg-ink/10" />
              <div class="h-3 w-1/3 rounded-full bg-ink/5" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="!services.length" class="rounded-3xl border border-dashed border-clay-200 bg-white px-5 py-14 text-center sm:py-16">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
            <svg viewBox="0 0 24 24" fill="none" class="h-7 w-7" aria-hidden="true">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM4 15l4.5-4.5L14 16m-1.5-1.5L15 12l5 5M15.5 8.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h3 class="mt-6 font-heading text-xl font-semibold text-ink">No styles added yet</h3>
          <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">Add your first style with a photo and price so clients can book you.</p>
        </div>

        <!-- Grid -->
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <article
            v-for="s in services"
            :key="s.id"
            :class="[
              'group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm shadow-ink/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-clay-600/10',
              editingId === s.id ? 'border-clay-500 ring-4 ring-clay-100' : 'border-ink/10 hover:border-clay-200',
            ]"
          >
            <div class="relative aspect-[16/10] overflow-hidden bg-paper">
              <img
                v-if="s.image_url && !brokenUrls.has(s.image_url)"
                :src="s.image_url"
                :alt="s.name"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                @error="markBroken(s.image_url)"
              />
              <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-soft">
                <svg viewBox="0 0 24 24" fill="none" class="h-8 w-8 text-clay-300" aria-hidden="true">
                  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM4 15l4.5-4.5L14 16m-1.5-1.5L15 12l5 5M15.5 8.5h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span class="text-xs font-medium">{{ s.image_url ? "Photo didn't load" : 'No photo' }}</span>
              </div>
              <span v-if="editingId === s.id" class="absolute left-3 top-3 rounded-full bg-clay-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
                Editing
              </span>
              <span class="absolute bottom-3 right-3 rounded-lg bg-white/95 px-2.5 py-1 font-heading text-sm font-bold text-clay-700 shadow-sm">
                KES {{ Number(s.price).toLocaleString() }}
              </span>
            </div>

            <div class="flex flex-1 flex-col p-5">
              <h3 class="font-heading text-base font-semibold text-ink">{{ s.name }}</h3>
              <p v-if="s.description" class="mt-1 line-clamp-2 text-sm leading-6 text-ink-soft">{{ s.description }}</p>

              <div class="mt-auto flex items-center justify-between gap-3 pt-4">
                <span class="inline-flex items-center gap-1.5 rounded-md bg-paper px-2 py-1 text-xs font-medium text-ink-soft">
                  <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
                    <path d="M10 6v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  {{ s.duration_minutes }} min
                </span>
                <div class="flex gap-1.5">
                  <button
                    type="button"
                    :aria-label="`Edit ${s.name}`"
                    class="inline-flex items-center gap-1 rounded-lg border border-ink/10 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-clay-300 hover:text-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
                    @click="startEdit(s)"
                  >
                    <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                      <path d="m12.5 4.5 3 3L7 16H4v-3l8.5-8.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                    </svg>
                    Edit
                  </button>
                  <button
                    type="button"
                    :aria-label="`Remove ${s.name}`"
                    class="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    @click="remove(s.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Add / edit form -->
      <aside ref="formEl" class="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
        <form class="relative overflow-hidden rounded-3xl border border-ink/10 bg-white p-6 shadow-xl shadow-ink/5" novalidate @submit.prevent="submit">
          <div aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800" />
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">{{ editingId ? 'Editing' : 'New style' }}</p>
          <h2 class="mt-1 font-heading text-xl font-semibold text-ink">{{ editingId ? 'Edit style' : 'Add a style' }}</h2>

          <div class="mt-5 space-y-4">
            <div>
              <span class="mb-1.5 block text-sm font-medium text-ink">Style photo</span>
              <label class="group block cursor-pointer">
                <div v-if="imagePreview" class="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-ink/10">
                  <img :src="imagePreview" alt="Selected style photo" class="h-full w-full object-cover" />
                  <span class="absolute inset-0 flex items-center justify-center bg-ink/0 text-sm font-semibold text-white opacity-0 transition group-hover:bg-ink/40 group-hover:opacity-100">
                    Change photo
                  </span>
                </div>
                <div v-else class="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-clay-200 bg-clay-50/40 text-center transition group-hover:border-clay-400 group-hover:bg-clay-50">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-clay-600 shadow-sm">
                    <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
                      <path d="M10 13V4m-3.5 3.5L10 4l3.5 3.5M4 13v1.5A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5V13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                  <span class="text-sm font-semibold text-ink">Tap to add a photo</span>
                  <span class="text-xs text-ink-soft">JPG or PNG, up to 4MB</span>
                </div>
                <input type="file" accept="image/*" class="sr-only" @change="onImageChange" />
              </label>
            </div>

            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">Name</span>
              <input v-model="form.name" placeholder="e.g. Skin fade with beard trim" :class="inputClass" />
            </label>

            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">Description <span class="font-normal text-ink-soft">(optional)</span></span>
              <textarea v-model="form.description" rows="3" placeholder="What’s included, products used, etc." :class="[inputClass, 'resize-y']" />
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="mb-1.5 block text-sm font-medium text-ink">Price</span>
                <span class="relative block">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft">KES</span>
                  <input v-model="form.price" type="number" min="0" placeholder="500" :class="[inputClass, 'pl-12']" />
                </span>
              </label>
              <label class="block">
                <span class="mb-1.5 block text-sm font-medium text-ink">Duration</span>
                <span class="relative block">
                  <input v-model="form.duration_minutes" type="number" min="5" :class="[inputClass, 'pr-12']" />
                  <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-soft">min</span>
                </span>
              </label>
            </div>
          </div>

          <p v-if="formError" class="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100">{{ formError }}</p>

          <div class="mt-6 flex gap-2">
            <button
              v-if="editingId"
              type="button"
              class="flex-1 rounded-xl border border-ink/15 py-3 text-sm font-semibold text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
              @click="resetForm"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-clay-600 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg v-if="!saving && !editingId" viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
              {{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Add style' }}
            </button>
          </div>
        </form>
      </aside>
    </div>
  </div>
</template>
