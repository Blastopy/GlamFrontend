```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import { extractErrorMessage } from '@/utils/errors'
import clientsApi from '@/api/clients'

const notifications = useNotificationsStore()

const clients = ref([])
const newClientName = ref('')
const notes = ref('')
const loading = ref(true)
const addError = ref('')
const search = ref('')

async function load() {
  loading.value = true

  try {
    const { data } = await clientsApi.list()
    clients.value = data.data || []
  } catch {
    // Network/server failures are handled by the Axios interceptor.
  } finally {
    loading.value = false
  }
}

async function addClient() {
  const clientName = newClientName.value.trim()

  if (!clientName) return

  addError.value = ''

  try {
    await clientsApi.add({
      client_name: clientName,
      notes: notes.value.trim() || null,
      source: 'manual_add'
    })

    newClientName.value = ''
    notes.value = ''

    await load()
  } catch (e) {
    addError.value = extractErrorMessage(
      e,
      'Could not add this client.'
    )
  }
}

async function removeClient(client) {
  if (!confirm(`Remove ${client.name} from your client book?`)) {
    return
  }

  try {
    await clientsApi.remove(client.id, client.type)
    await load()
  } catch (e) {
    notifications.error(
      extractErrorMessage(e, 'Could not remove this client.')
    )
  }
}

const filteredClients = computed(() => {
  const q = search.value.trim().toLowerCase()

  if (!q) return clients.value

  return clients.value.filter((client) =>
    String(client.name || '').toLowerCase().includes(q) ||
    String(client.phone || '').toLowerCase().includes(q)
  )
})

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

const inputClass =
  'w-full min-w-0 rounded-xl border border-ink/10 bg-paper/40 px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 transition hover:border-ink/20 focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100 sm:text-sm'

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-7xl py-6 sm:py-10">

    <!-- Header -->
    <header class="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-clay-600/40 blur-3xl"
      />

      <div
        aria-hidden="true"
        class="pointer-events-none absolute -bottom-36 left-1/4 h-72 w-72 rounded-full bg-clay-500/20 blur-3xl"
      />

      <div class="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-clay-300">
            Client book
          </p>

          <h1 class="mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Your <span class="font-accent font-bold text-clay-400">clients</span>
          </h1>

          <p class="mt-3 max-w-lg text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            Everyone you’ve served, in one place. Message them or keep your book tidy.
          </p>
        </div>

        <div class="rounded-2xl border border-clay-400/30 bg-clay-600/20 px-5 py-4 backdrop-blur sm:min-w-40">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-clay-200">
            In your book
          </p>

          <p class="mt-1 font-heading text-3xl font-bold">
            {{ loading ? '–' : clients.length }}
          </p>
        </div>
      </div>
    </header>

    <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">

      <!-- Client list -->
      <section aria-labelledby="list-title" class="min-w-0 lg:order-1">

        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="list-title" class="font-heading text-xl font-semibold text-ink sm:text-2xl">
            All clients
          </h2>

          <label class="relative block sm:w-72">
            <span class="sr-only">Search clients</span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            >
              <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.8" />
              <path d="m16 16 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>

            <input
              v-model="search"
              type="search"
              placeholder="Search name or phone"
              class="w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-10 pr-3 text-base text-ink shadow-sm shadow-ink/5 placeholder:text-ink-soft/60 transition focus:border-clay-500 focus:outline-none focus:ring-4 focus:ring-clay-100 sm:text-sm"
            />
          </label>
        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="space-y-3"
          role="status"
          aria-label="Loading clients"
        >
          <div
            v-for="n in 4"
            :key="n"
            class="flex animate-pulse items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4"
          >
            <div class="h-11 w-11 rounded-full bg-clay-100" />

            <div class="flex-1 space-y-2">
              <div class="h-4 w-1/3 rounded-full bg-ink/10" />
              <div class="h-3 w-1/4 rounded-full bg-ink/5" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!clients.length"
          class="rounded-3xl border border-dashed border-clay-200 bg-white px-5 py-14 text-center sm:py-16"
        >
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
            <svg viewBox="0 0 20 20" fill="none" class="h-7 w-7" aria-hidden="true">
              <circle cx="7.5" cy="7" r="2.75" stroke="currentColor" stroke-width="1.4" />
              <path d="M2.5 16c.5-2.6 2.5-4 5-4s4.5 1.4 5 4M13 4.5a2.5 2.5 0 0 1 0 5M14.5 12.2c1.6.5 2.7 1.8 3 3.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </div>

          <h3 class="mt-6 font-heading text-xl font-semibold text-ink">
            No clients in your book yet
          </h3>

          <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
            Clients are added automatically once you mark their appointment as completed.
          </p>
        </div>

        <!-- No search results -->
        <p
          v-else-if="!filteredClients.length"
          class="rounded-2xl border border-ink/10 bg-white px-5 py-10 text-center text-sm text-ink-soft"
        >
          No clients match “{{ search.trim() }}”.
        </p>

        <!-- Client list -->
        <ul v-else class="space-y-3">
          <li
            v-for="c in filteredClients"
            :key="`${c.type}-${c.id}`"
            class="group flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm shadow-ink/5 transition hover:border-clay-200 hover:shadow-md hover:shadow-ink/5 sm:flex-row sm:items-center sm:px-5"
          >
            <div class="flex min-w-0 flex-1 items-center gap-4">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-500 to-clay-700 text-sm font-bold text-white shadow-md shadow-clay-600/20">
                {{ initials(c.name) }}
              </span>

              <div class="min-w-0">
                <p class="truncate font-semibold text-ink">
                  {{ c.name }}
                </p>

                <a
                  v-if="c.phone"
                  :href="`tel:${c.phone}`"
                  class="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-clay-700"
                >
                  <svg viewBox="0 0 24 24" fill="none" class="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                    <path d="M7.2 3.5H5a1.5 1.5 0 0 0-1.5 1.6c.7 8.1 7.2 14.6 15.3 15.4a1.5 1.5 0 0 0 1.7-1.5v-2.3a1.5 1.5 0 0 0-1.2-1.5l-3.1-.6a1.5 1.5 0 0 0-1.4.4l-1.4 1.4a16 16 0 0 1-6.3-6.3l1.4-1.4a1.5 1.5 0 0 0 .4-1.4l-.6-3.1a1.5 1.5 0 0 0-1.1-1.2Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                  {{ c.phone }}
                </a>

                <p v-else class="mt-0.5 text-sm text-ink-soft/70">
                  No phone on file
                </p>

                <span class="mt-1 inline-block text-xs text-ink-soft">
                  {{ c.type === 'guest' ? 'Walk-in guest' : 'Registered client' }}
                </span>
              </div>
            </div>

            <div class="flex gap-2 sm:shrink-0">
              <RouterLink
                v-if="c.type !== 'guest'"
                :to="`/messages/${c.id}`"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-clay-600/20 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 sm:flex-none"
              >
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-4 3V5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                </svg>

                Message
              </RouterLink>

              <button
                type="button"
                class="inline-flex flex-1 items-center justify-center rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 sm:flex-none"
                @click="removeClient(c)"
              >
                Remove
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Add client -->
      <aside class="lg:order-2 lg:sticky lg:top-24 lg:self-start">
        <form
          class="relative overflow-hidden rounded-3xl border border-ink/10 bg-white p-6 shadow-xl shadow-ink/5"
          novalidate
          @submit.prevent="addClient"
        >
          <div
            aria-hidden="true"
            class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-clay-400 via-clay-600 to-clay-800"
          />

          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">
            Manual add
          </p>

          <h2 class="mt-1 font-heading text-xl font-semibold text-ink">
            Add a client
          </h2>

          <div class="mt-5 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">
                Client name
              </span>

              <input
                v-model="newClientName"
                type="text"
                maxlength="255"
                required
                placeholder="Enter client name"
                :class="inputClass"
              />
            </label>

            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-ink">
                Notes
                <span class="font-normal text-ink-soft">(optional)</span>
              </span>

              <textarea
                v-model="notes"
                rows="3"
                maxlength="1000"
                placeholder="Preferences, allergies, usual style…"
                :class="[inputClass, 'resize-y']"
              />
            </label>
          </div>

          <p
            v-if="addError"
            class="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100"
          >
            {{ addError }}
          </p>

          <button
            type="submit"
            :disabled="!newClientName.trim()"
            class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-3 text-sm font-semibold text-white shadow-lg shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
              <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>

            Add client
          </button>

          <p class="mt-4 flex gap-2 rounded-xl bg-paper/70 px-3 py-2.5 text-xs leading-5 text-ink-soft">
            <svg viewBox="0 0 20 20" fill="none" class="mt-0.5 h-4 w-4 shrink-0 text-clay-600" aria-hidden="true">
              <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" />
              <path d="M10 9v4.5M10 6.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>

            Clients are also added automatically once you mark their appointment as completed.
          </p>
        </form>
      </aside>
    </div>
  </div>
</template>
```