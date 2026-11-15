<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { extractErrorMessage } from '@/utils/errors'
import messagesApi from '@/api/messages'
import { getEcho } from '@/echo'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationsStore()

const conversations = ref([])
const thread = ref([])
const draft = ref('')
const sending = ref(false)
const scrollBox = ref(null)
let currentChannelName = null

async function loadConversations() {
  try {
    const { data } = await messagesApi.conversations()
    conversations.value = data
  } catch {
    // toasted globally by the axios interceptor
  }
}

async function scrollToBottom() {
  await nextTick()
  scrollBox.value?.scrollTo({ top: scrollBox.value.scrollHeight })
}

async function loadThread() {
  if (!route.params.userId) {
    thread.value = []
    return
  }
  try {
    const { data } = await messagesApi.thread(route.params.userId)
    thread.value = data.data
    await scrollToBottom()
  } catch {
    notifications.error('Could not load this conversation.')
  }
}

/** Both users compute the same sorted channel name — see routes/channels.php. */
function conversationChannelName(otherUserId) {
  const ids = [auth.user.id, Number(otherUserId)].sort((a, b) => a - b)
  return `conversation.${ids[0]}.${ids[1]}`
}

function subscribeToThread(otherUserId) {
  unsubscribeFromThread()
  if (!otherUserId) return

  currentChannelName = conversationChannelName(otherUserId)
  getEcho()
    ?.private(currentChannelName)
    .listen('.message.sent', (e) => {
      thread.value.push(e)
      scrollToBottom()
      loadConversations() // refresh last-message previews
    })
}

function unsubscribeFromThread() {
  if (currentChannelName) getEcho()?.leave(currentChannelName)
  currentChannelName = null
}

async function send() {
  if (!draft.value.trim() || sending.value) return
  sending.value = true
  const outgoing = draft.value
  try {
    const { data } = await messagesApi.send({ receiver_id: route.params.userId, body: outgoing })
    thread.value.push(data) // optimistic append — the .toOthers() on the backend means we won't get our own echo
    draft.value = ''
    await scrollToBottom()
  } catch (e) {
    // deliberately don't clear draft.value here — the person shouldn't have to retype a failed message
    notifications.error(extractErrorMessage(e, 'Message failed to send. Please try again.'))
  } finally {
    sending.value = false
  }
}

function openConversation(userId) {
  router.push(`/messages/${userId}`)
}

onMounted(() => {
  loadConversations()
  loadThread()
  subscribeToThread(route.params.userId)
})

watch(
  () => route.params.userId,
  (userId) => {
    loadThread()
    subscribeToThread(userId)
  }
)

onBeforeUnmount(unsubscribeFromThread)

const search = ref('')

const filteredConversations = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter((c) =>
    String(c.user?.name || '').toLowerCase().includes(q) || String(c.last_message || '').toLowerCase().includes(q)
  )
})

const activeConversation = computed(() =>
  conversations.value.find((c) => String(c.user.id) === String(route.params.userId)) || null
)

const unreadTotal = computed(() => conversations.value.reduce((n, c) => n + (Number(c.unread_count) || 0), 0))

function initial(name) {
  return String(name || '?').trim().charAt(0).toUpperCase()
}

const isMine = (m) => m.sender_id === auth.user.id

const validDate = (d) => d && !Number.isNaN(new Date(d).getTime())

function timeOf(d) {
  return validDate(d) ? new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
}

function dayLabel(d) {
  const date = new Date(d)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

// Show a day divider before the first message of each calendar day.
function showDayDivider(index) {
  const m = thread.value[index]
  if (!validDate(m?.created_at)) return false
  if (index === 0) return true
  const prev = thread.value[index - 1]
  return !validDate(prev?.created_at) || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
}

// Group consecutive messages from the same sender so bubbles stack tightly.
function isLastInGroup(index) {
  const next = thread.value[index + 1]
  return !next || next.sender_id !== thread.value[index].sender_id || showDayDivider(index + 1)
}

function onComposerKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col py-4 sm:py-8">
    <!-- Page header -->
    <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600">Inbox</p>
        <h1 class="mt-1 font-heading text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          <span class="font-accent font-bold text-clay-600">Messages</span>
        </h1>
      </div>
      <p v-if="unreadTotal" class="inline-flex items-center gap-2 rounded-full bg-clay-50 px-3 py-1.5 text-xs font-semibold text-clay-700 ring-1 ring-clay-100">
        <span class="h-1.5 w-1.5 rounded-full bg-clay-600" />
        {{ unreadTotal }} unread
      </p>
    </header>

    <!-- Mobile: list and thread are separate full-width screens, swapped by
         whether a conversation is selected. Desktop (md+): both panes side by side. -->
    <div class="grid h-[calc(100dvh-12rem)] min-h-[28rem] overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-xl shadow-ink/5 md:h-[75vh] md:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)]">
      <!-- Conversation list -->
      <aside
        aria-label="Conversations"
        :class="['min-h-0 flex-col border-ink/10 md:flex md:border-r', route.params.userId ? 'hidden' : 'flex']"
      >
        <div class="border-b border-ink/10 p-4">
          <label class="relative block">
            <span class="sr-only">Search conversations</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft">
              <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.8" />
              <path d="m16 16 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            <input
              v-model="search"
              type="search"
              placeholder="Search conversations"
              class="w-full rounded-xl border border-ink/10 bg-paper/50 py-2.5 pl-10 pr-3 text-base text-ink placeholder:text-ink-soft/60 transition focus:border-clay-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-100 sm:text-sm"
            />
          </label>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <button
            v-for="c in filteredConversations"
            :key="c.user.id"
            type="button"
            :aria-current="String(c.user.id) === String(route.params.userId) ? 'true' : undefined"
            :class="[
              'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-clay-400',
              String(c.user.id) === String(route.params.userId) ? 'bg-clay-50 ring-1 ring-clay-100' : 'hover:bg-paper',
            ]"
            @click="openConversation(c.user.id)"
          >
            <span
              :class="[
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                String(c.user.id) === String(route.params.userId) ? 'bg-clay-600 text-white shadow-md shadow-clay-600/25' : 'bg-ink text-white',
              ]"
            >{{ initial(c.user.name) }}</span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center justify-between gap-2">
                <span :class="['truncate text-sm', c.unread_count ? 'font-bold text-ink' : 'font-semibold text-ink']">{{ c.user.name }}</span>
                <span v-if="c.unread_count" class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-clay-600 px-1.5 text-[10px] font-bold text-white">{{ c.unread_count }}</span>
              </span>
              <span v-if="c.last_message" :class="['mt-0.5 block truncate text-xs', c.unread_count ? 'font-medium text-ink' : 'text-ink-soft']">{{ c.last_message }}</span>
            </span>
          </button>

          <div v-if="!conversations.length" class="px-4 py-12 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-clay-50 text-clay-600">
              <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
                <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-4 3V5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
            </div>
            <p class="mt-4 text-sm font-semibold text-ink">No conversations yet</p>
            <p class="mt-1 text-xs leading-5 text-ink-soft">Message a provider from their profile to start chatting.</p>
          </div>
          <p v-else-if="!filteredConversations.length" class="px-4 py-8 text-center text-sm text-ink-soft">
            No conversations match “{{ search.trim() }}”.
          </p>
        </div>
      </aside>

      <!-- Thread -->
      <section
        aria-label="Conversation"
        :class="['min-h-0 flex-col bg-paper/30 md:flex', route.params.userId ? 'flex' : 'hidden']"
      >
        <!-- Empty state (desktop, nothing selected) -->
        <div v-if="!route.params.userId" class="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-clay-50 text-clay-600 ring-8 ring-clay-50/50">
            <svg viewBox="0 0 20 20" fill="none" class="h-7 w-7" aria-hidden="true">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-4 3V5.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
            </svg>
          </div>
          <h2 class="mt-6 font-heading text-xl font-semibold text-ink">Your conversations</h2>
          <p class="mt-2 max-w-xs text-sm leading-6 text-ink-soft">Select a conversation on the left to start chatting.</p>
        </div>

        <template v-else>
          <!-- Thread header -->
          <div class="flex items-center gap-3 border-b border-ink/10 bg-white px-3 py-3 sm:px-5">
            <RouterLink
              to="/messages"
              aria-label="Back to conversations"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 md:hidden"
            >
              <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5" aria-hidden="true">
                <path d="M16 10H4m5 5-5-5 5-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </RouterLink>
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-600 text-sm font-bold text-white shadow-md shadow-clay-600/25">
              {{ initial(activeConversation?.user?.name) }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-ink sm:text-base">{{ activeConversation?.user?.name || 'Conversation' }}</p>
              <p class="text-xs text-ink-soft">Messages update live</p>
            </div>
          </div>

          <!-- Messages -->
          <div ref="scrollBox" class="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6" aria-live="polite">
            <p v-if="!thread.length" class="mx-auto mt-10 max-w-xs text-center text-sm text-ink-soft">
              No messages yet. Say hello 👋
            </p>

            <template v-for="(m, i) in thread" :key="m.id">
              <div v-if="showDayDivider(i)" class="my-5 flex items-center gap-3 first:mt-0" role="separator">
                <span class="h-px flex-1 bg-ink/10" />
                <span class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft ring-1 ring-ink/10">{{ dayLabel(m.created_at) }}</span>
                <span class="h-px flex-1 bg-ink/10" />
              </div>

              <div :class="['flex', isMine(m) ? 'justify-end' : 'justify-start', isLastInGroup(i) ? 'mb-3' : 'mb-1']">
                <div :class="['flex max-w-[85%] flex-col sm:max-w-[70%]', isMine(m) ? 'items-end' : 'items-start']">
                  <div
                    :class="[
                      'whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-6',
                      isMine(m)
                        ? ['bg-clay-600 text-white shadow-sm shadow-clay-600/20', isLastInGroup(i) ? 'rounded-2xl rounded-br-md' : 'rounded-2xl']
                        : ['bg-white text-ink ring-1 ring-ink/10', isLastInGroup(i) ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'],
                    ]"
                  >{{ m.body }}</div>
                  <span v-if="isLastInGroup(i) && timeOf(m.created_at)" class="mt-1 px-1 text-[11px] text-ink-soft">{{ timeOf(m.created_at) }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Composer -->
          <form class="border-t border-ink/10 bg-white p-3 sm:p-4" @submit.prevent="send">
            <div class="flex items-end gap-2 rounded-2xl border border-ink/10 bg-paper/40 p-1.5 pl-4 transition focus-within:border-clay-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-clay-100">
              <label class="flex-1">
                <span class="sr-only">Message</span>
                <textarea
                  v-model="draft"
                  :disabled="sending"
                  rows="1"
                  placeholder="Type a message…"
                  class="block max-h-32 min-h-[2.5rem] w-full resize-none bg-transparent py-2 text-base text-ink placeholder:text-ink-soft/60 focus:outline-none disabled:opacity-50 sm:text-sm"
                  @keydown="onComposerKeydown"
                />
              </label>
              <button
                type="submit"
                :disabled="sending || !draft.trim()"
                aria-label="Send message"
                class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 text-sm font-semibold text-white shadow-md shadow-clay-600/25 transition hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                <span class="hidden sm:inline">{{ sending ? 'Sending…' : 'Send' }}</span>
                <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
                  <path d="M3.5 10 16.5 3.5 13 16.5l-3-5.5-6.5-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
            <p class="mt-1.5 hidden px-1 text-[11px] text-ink-soft sm:block">Press Enter to send · Shift + Enter for a new line</p>
          </form>
        </template>
      </section>
    </div>
  </div>
</template>
