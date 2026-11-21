<script setup>
import { computed, onMounted, ref } from 'vue'
import appointmentsApi from '@/api/appointments'
import { useNotificationsStore } from '@/stores/notifications'
import { extractErrorMessage } from '@/utils/errors'

const notifications = useNotificationsStore()
const mode = ref('week')
const selectedDate = ref(localDate(new Date()))
const branchId = ref('')
const statusFilter = ref('')
const appointments = ref([])
const clients = ref([])
const guestCustomers = ref([])
const services = ref([])
const branches = ref([])
const loading = ref(false)
const saving = ref(false)
const formOpen = ref(false)
const rescheduleTarget = ref(null)
const error = ref('')
const form = ref(emptyForm())

function localDate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function emptyForm() {
  return { client_mode: 'registered', client_id: '', business_customer_id: '', guest_name: '', guest_phone: '', guest_email: '', service_ids: [], branch_id: '', scheduled_at: '', booking_source: 'staff', client_notes: '', provider_notes: '' }
}
function dateAt(value, hour = 0) {
  const d = new Date(value + 'T00:00:00')
  d.setHours(hour, 0, 0, 0)
  return d
}
function shift(date, amount, unit) {
  const d = new Date(date + 'T00:00:00')
  if (unit === 'day') d.setDate(d.getDate() + amount)
  if (unit === 'week') d.setDate(d.getDate() + amount * 7)
  if (unit === 'month') d.setMonth(d.getMonth() + amount)
  return localDate(d)
}
const range = computed(() => {
  const date = dateAt(selectedDate.value)
  if (mode.value === 'day') return { from: selectedDate.value, to: selectedDate.value }
  if (mode.value === 'week') {
    const weekday = (date.getDay() + 6) % 7
    const monday = new Date(date)
    monday.setDate(monday.getDate() - weekday)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    return { from: localDate(monday), to: localDate(sunday) }
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { from: localDate(first), to: localDate(last) }
})
const days = computed(() => {
  const start = dateAt(range.value.from)
  const end = dateAt(range.value.to)
  const list = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    list.push(new Date(d))
  }
  if (mode.value === 'month') {
    const offset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - offset)
    const endOffset = (6 - (end.getDay() + 6) % 7)
    end.setDate(end.getDate() + endOffset)
    list.length = 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) list.push(new Date(d))
  }
  return list
})
const title = computed(() => {
  const start = dateAt(range.value.from)
  const end = dateAt(range.value.to)
  if (mode.value === 'day') return start.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (mode.value === 'month') return start.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
  const a = start.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
  const b = end.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${a} – ${b}`
})
const visible = computed(() => appointments.value.filter((a) => !statusFilter.value || a.status === statusFilter.value))
function dayAppointments(date) {
  return visible.value.filter((a) => localDate(new Date(a.scheduled_at)) === localDate(date)).sort((a,b) => new Date(a.scheduled_at)-new Date(b.scheduled_at))
}
function timeOf(value) {
  return new Date(value).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })
}
function serviceNames(appt) {
  if (appt.services?.length) return appt.services.map(s => s.pivot?.service_name || s.name).join(', ')
  return appt.service?.name || 'Service'
}
const STATUS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  in_progress: 'In service',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}
const statusClass = (status) => ({
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  confirmed: 'border-purple-200 bg-purple-50 text-purple-800',
  checked_in: 'border-blue-200 bg-blue-50 text-blue-800',
  in_progress: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-600',
  no_show: 'border-red-200 bg-red-50 text-red-700',
}[status] || 'border-ink/10 bg-white text-ink-soft')
const nextStatuses = {
  pending: ['confirmed','cancelled','no_show'],
  confirmed: ['checked_in','in_progress','cancelled','no_show'],
  checked_in: ['in_progress','cancelled','no_show'],
  in_progress: ['completed','cancelled','no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
}
const statusActionLabel = (status) => ({ confirmed: 'Confirm', checked_in: 'Check in', in_progress: 'Start service', completed: 'Complete', cancelled: 'Cancel', no_show: 'Mark no-show' }[status] || STATUS[status])
async function loadOptions() {
  try {
    const { data } = await appointmentsApi.calendarOptions()
    clients.value = data.clients || []
    guestCustomers.value = data.guestCustomers || []
    services.value = data.services || []
    branches.value = data.branches || []
    if (!branchId.value && branches.value.length) branchId.value = String(branches.value.find(b => b.is_default)?.id || branches.value[0].id)
  } catch {
    // API interceptor displays errors.
  }
}
async function load() {
  loading.value = true
  try {
    const params = { from: range.value.from, to: range.value.to }
    if (branchId.value) params.branch_id = branchId.value
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await appointmentsApi.calendar(params)
    appointments.value = data
  } catch {
    appointments.value = []
  } finally {
    loading.value = false
  }
}
async function refresh() { await load() }
function move(direction) {
  const unit = mode.value === 'month' ? 'month' : mode.value === 'week' ? 'week' : 'day'
  selectedDate.value = shift(selectedDate.value, direction, unit)
}
function today() { selectedDate.value = localDate(new Date()) }
function selectDay(date) { selectedDate.value = localDate(date); mode.value = 'day' }
function newAppointment(date = selectedDate.value) {
  error.value = ''
  form.value = emptyForm()
  form.value.branch_id = branchId.value || ''
  form.value.scheduled_at = `${date}T10:00`
  formOpen.value = true
}
function closeForm() { formOpen.value = false; error.value = '' }
function selectGuestCustomer() {
  const guest = guestCustomers.value.find((c) => String(c.id) === String(form.value.business_customer_id))
  if (guest) { form.value.guest_name = guest.name; form.value.guest_phone = guest.phone || ''; form.value.guest_email = guest.email || '' }
  else { form.value.guest_name = ''; form.value.guest_phone = ''; form.value.guest_email = '' }
}
async function submitAppointment() {
  error.value = ''
  if (!form.value.service_ids.length) { error.value = 'Choose at least one service.'; return }
  saving.value = true
  try {
    const payload = { ...form.value, client_id: form.value.client_mode === 'registered' ? Number(form.value.client_id) : null, business_customer_id: form.value.client_mode === 'guest' && form.value.business_customer_id ? Number(form.value.business_customer_id) : null, branch_id: form.value.branch_id ? Number(form.value.branch_id) : null, booking_source: form.value.client_mode === 'guest' ? 'walk_in' : form.value.booking_source, service_ids: form.value.service_ids.map(Number), scheduled_at: form.value.scheduled_at.replace('T', ' ') + ':00' }
    const { data } = await appointmentsApi.createManaged(payload)
    notifications.success('Appointment created.')
    formOpen.value = false
    appointments.value.push(data)
    await load()
  } catch (e) {
    error.value = e.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(' ') : extractErrorMessage(e, 'Could not create appointment.')
  } finally { saving.value = false }
}
function startReschedule(appt) {
  rescheduleTarget.value = { id: appt.id, scheduled_at: localInput(appt.scheduled_at), branch_id: String(appt.branch_id || branchId.value || '') }
  error.value = ''
}
function localInput(value) {
  const d = new Date(value)
  const date = localDate(d)
  const h = String(d.getHours()).padStart(2,'0')
  const m = String(d.getMinutes()).padStart(2,'0')
  return `${date}T${h}:${m}`
}
async function saveReschedule() {
  if (!rescheduleTarget.value) return
  saving.value = true
  error.value = ''
  try {
    const target = rescheduleTarget.value
    await appointmentsApi.reschedule(target.id, { scheduled_at: target.scheduled_at.replace('T',' ') + ':00', branch_id: target.branch_id ? Number(target.branch_id) : null })
    notifications.success('Appointment rescheduled.')
    rescheduleTarget.value = null
    await load()
  } catch (e) {
    error.value = e.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(' ') : extractErrorMessage(e, 'Could not reschedule.')
  } finally { saving.value = false }
}
async function changeStatus(appt, status) {
  try {
    await appointmentsApi.updateManagedStatus(appt.id, { status })
    notifications.success(`Appointment ${STATUS[status]?.toLowerCase() || status}.`)
    await load()
  } catch (e) { notifications.error(extractErrorMessage(e, 'Could not update appointment.')) }
}
function dayNumber(d) { return d.getDate() }
function isCurrentMonth(d) { return d.getMonth() === dateAt(selectedDate.value).getMonth() }
function isToday(d) { return localDate(d) === localDate(new Date()) }
function dayHeading(d) { return d.toLocaleDateString('en-KE', { weekday: 'short' }) }
function daySubheading(d) { return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) }
function selectMode(value) { mode.value = value }
onMounted(async () => { await loadOptions(); await load() })
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-clay-600">Business management</p>
        <h1 class="mt-1 font-heading text-2xl text-ink sm:text-3xl">Appointments & calendar</h1>
        <p class="mt-2 text-sm text-ink-soft">Manage online bookings, staff bookings and walk-ins from one calendar.</p>
      </div>
      <button @click="newAppointment()" class="rounded-xl bg-clay-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-clay-700">+ New appointment</button>
    </header>

    <section class="rounded-2xl border border-ink/10 bg-white p-3 shadow-sm sm:p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button @click="move(-1)" class="rounded-lg border border-ink/10 px-3 py-2 text-sm hover:bg-paper" aria-label="Previous date">‹</button>
          <button @click="today" class="rounded-lg border border-ink/10 px-3 py-2 text-sm font-semibold hover:bg-paper">Today</button>
          <button @click="move(1)" class="rounded-lg border border-ink/10 px-3 py-2 text-sm hover:bg-paper" aria-label="Next date">›</button>
          <h2 class="ml-1 font-semibold text-ink">{{ title }}</h2>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="branchId" @change="load" class="rounded-lg border border-ink/10 px-3 py-2 text-sm">
            <option value="">All branches</option>
            <option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option>
          </select>
          <select v-model="statusFilter" @change="load" class="rounded-lg border border-ink/10 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option v-for="(label,key) in STATUS" :key="key" :value="key">{{ label }}</option>
          </select>
          <div class="inline-flex rounded-lg bg-paper p-1">
            <button v-for="view in ['day','week','month']" :key="view" @click="selectMode(view)" :class="['rounded-md px-3 py-1.5 text-sm capitalize', mode===view ? 'bg-white font-semibold text-ink shadow-sm' : 'text-ink-soft']">{{ view }}</button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="py-16 text-center text-sm text-ink-soft">Loading calendar…</div>
      <div v-else-if="mode==='day'" class="mt-4 space-y-3">
        <button @click="newAppointment(selectedDate)" class="w-full rounded-xl border border-dashed border-clay-300 py-3 text-sm font-medium text-clay-700 hover:bg-clay-50">+ Add appointment for this day</button>
        <div v-if="!dayAppointments(dateAt(selectedDate)).length" class="rounded-xl bg-paper py-12 text-center text-sm text-ink-soft">No appointments scheduled for this date.</div>
        <article v-for="appt in dayAppointments(dateAt(selectedDate))" :key="appt.id" class="rounded-xl border border-ink/10 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex gap-3">
              <div class="min-w-20 rounded-lg bg-paper px-3 py-2 text-center text-sm font-bold text-ink">{{ timeOf(appt.scheduled_at) }}</div>
              <div class="min-w-0">
                <h3 class="font-semibold text-ink">{{ appt.client?.name || appt.business_customer?.name || 'Guest customer' }}</h3>
                <p class="text-sm text-clay-700">{{ serviceNames(appt) }}</p>
                <p class="mt-1 text-xs text-ink-soft">{{ appt.client?.phone || appt.business_customer?.phone || 'No phone' }} · {{ appt.branch?.name || 'Branch' }} · {{ appt.booking_source || 'online' }}</p>
                <p v-if="appt.client_notes" class="mt-1 text-sm text-ink-soft">Note: {{ appt.client_notes }}</p>
                <p v-if="appt.provider_notes" class="mt-1 text-sm text-ink-soft">Staff note: {{ appt.provider_notes }}</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span :class="['rounded-full border px-2.5 py-1 text-xs font-medium', statusClass(appt.status)]">{{ STATUS[appt.status] || appt.status }}</span>
              <button v-if="!['completed','cancelled','no_show'].includes(appt.status)" @click="startReschedule(appt)" class="rounded-lg border px-3 py-2 text-xs font-semibold">Reschedule</button>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button v-for="status in nextStatuses[appt.status]" :key="status" @click="changeStatus(appt,status)" :class="['rounded-lg px-3 py-2 text-xs font-semibold', status==='completed' ? 'bg-emerald-600 text-white' : status==='cancelled' || status==='no_show' ? 'border border-red-200 text-red-700' : 'border border-ink/10 text-ink hover:bg-paper']">{{ statusActionLabel(status) }}</button>
          </div>
        </article>
      </div>

      <div v-else-if="mode==='week'" class="mt-4 grid gap-2 md:grid-cols-7">
        <section v-for="day in days" :key="localDate(day)" class="min-h-40 rounded-xl border border-ink/10 bg-paper/40 p-2">
          <button @click="selectDay(day)" :class="['mb-2 w-full rounded-lg px-2 py-2 text-left', isToday(day) ? 'bg-clay-600 text-white' : 'hover:bg-white']">
            <span class="block text-xs font-medium">{{ dayHeading(day) }}</span><span class="block text-lg font-semibold">{{ daySubheading(day) }}</span>
          </button>
          <button @click="newAppointment(localDate(day))" class="mb-2 w-full rounded border border-dashed border-ink/15 py-1 text-xs text-ink-soft hover:border-clay-300 hover:text-clay-700">+</button>
          <div class="space-y-1">
            <button v-for="appt in dayAppointments(day)" :key="appt.id" @click="selectDay(day)" class="w-full rounded-lg border p-2 text-left text-xs" :class="statusClass(appt.status)">
              <span class="font-semibold">{{ timeOf(appt.scheduled_at) }}</span>
              <span class="mt-0.5 block truncate">{{ appt.client?.name || appt.business_customer?.name || 'Guest customer' }}</span>
              <span class="block truncate">{{ serviceNames(appt) }}</span>
            </button>
          </div>
        </section>
      </div>

      <div v-else class="mt-4">
        <div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-soft">
          <div v-for="name in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="name" class="py-2">{{ name }}</div>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <button v-for="day in days" :key="localDate(day)" @click="selectDay(day)" :class="['min-h-24 rounded-lg border p-1.5 text-left sm:min-h-28', isCurrentMonth(day) ? 'border-ink/10 bg-white' : 'border-transparent bg-paper/50 text-ink/30', isToday(day) ? 'ring-2 ring-clay-500' : '']">
            <span class="text-xs font-semibold">{{ dayNumber(day) }}</span>
            <span v-if="dayAppointments(day).length" class="ml-1 rounded-full bg-clay-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{{ dayAppointments(day).length }}</span>
            <span class="mt-1 block space-y-1">
              <span v-for="appt in dayAppointments(day).slice(0,2)" :key="appt.id" class="block truncate rounded bg-purple-50 px-1 py-0.5 text-[10px] text-purple-800">{{ timeOf(appt.scheduled_at) }} {{ appt.client?.name }}</span>
              <span v-if="dayAppointments(day).length>2" class="block text-[10px] text-ink-soft">+{{ dayAppointments(day).length-2 }} more</span>
            </span>
          </button>
        </div>
      </div>
    </section>

    <section v-if="formOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3 sm:p-6" @click.self="closeForm">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div class="flex items-start justify-between gap-3"><h2 class="font-heading text-xl font-semibold">Create appointment</h2><button @click="closeForm" class="rounded-lg px-2 py-1 text-xl">×</button></div>
        <form class="mt-4 grid gap-4 sm:grid-cols-2" @submit.prevent="submitAppointment">
          <div class="grid gap-2 text-sm sm:col-span-2">
            <span class="font-medium">Customer type</span>
            <div class="flex flex-wrap gap-3">
              <label class="inline-flex items-center gap-2"><input v-model="form.client_mode" type="radio" value="registered" /> Registered customer</label>
              <label class="inline-flex items-center gap-2"><input v-model="form.client_mode" type="radio" value="guest" /> Walk-in guest</label>
            </div>
          </div>
          <label v-if="form.client_mode==='registered'" class="grid gap-1 text-sm">Client <select v-model="form.client_id" required class="rounded-lg border px-3 py-2.5"><option value="">Select a client</option><option v-for="client in clients" :key="client.id" :value="String(client.id)">{{ client.name }} {{ client.phone ? '· '+client.phone : '' }}</option></select><span v-if="!clients.length" class="text-xs text-ink-soft">Your client book is empty. Online bookings will appear here after they book.</span></label>
          <template v-else>
            <label class="grid gap-1 text-sm">Existing guest <select v-model="form.business_customer_id" @change="selectGuestCustomer" class="rounded-lg border px-3 py-2.5"><option value="">New walk-in guest</option><option v-for="guest in guestCustomers" :key="guest.id" :value="String(guest.id)">{{ guest.name }} {{ guest.phone ? '· '+guest.phone : '' }}</option></select></label>
            <label class="grid gap-1 text-sm">Guest name <input v-model="form.guest_name" required class="rounded-lg border px-3 py-2.5" /></label>
            <label class="grid gap-1 text-sm">Guest phone <input v-model="form.guest_phone" type="tel" class="rounded-lg border px-3 py-2.5" /></label>
            <label class="grid gap-1 text-sm">Guest email <input v-model="form.guest_email" type="email" class="rounded-lg border px-3 py-2.5" /></label>
          </template>
          <label class="grid gap-1 text-sm">Branch <select v-model="form.branch_id" class="rounded-lg border px-3 py-2.5"><option value="">Default branch</option><option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select></label>
          <div class="grid gap-2 sm:col-span-2"><p class="text-sm font-medium">Services *</p><label v-for="service in services" :key="service.id" class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"><span class="flex items-center gap-2"><input v-model="form.service_ids" type="checkbox" :value="String(service.id)" />{{ service.name }} <span class="text-xs text-ink-soft">{{ service.duration_minutes }} min</span></span><span class="text-sm font-semibold">KES {{ Number(service.price).toLocaleString() }}</span></label><p v-if="!services.length" class="text-sm text-ink-soft">Create active services in Catalogue first.</p></div>
          <label class="grid gap-1 text-sm">Date and time <input v-model="form.scheduled_at" type="datetime-local" required class="rounded-lg border px-3 py-2.5" /></label>
          <label class="grid gap-1 text-sm">Booking type <select v-model="form.booking_source" class="rounded-lg border px-3 py-2.5"><option value="staff">Staff booking</option><option value="walk_in">Walk-in</option></select></label>
          <label class="grid gap-1 text-sm sm:col-span-2">Client note <textarea v-model="form.client_notes" rows="2" class="rounded-lg border px-3 py-2.5" /></label>
          <label class="grid gap-1 text-sm sm:col-span-2">Staff note <textarea v-model="form.provider_notes" rows="2" class="rounded-lg border px-3 py-2.5" /></label>
          <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{{ error }}</p>
          <div class="flex justify-end gap-2 sm:col-span-2"><button type="button" @click="closeForm" class="rounded-lg border px-4 py-2.5 text-sm">Cancel</button><button type="submit" :disabled="saving" class="rounded-lg bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Create appointment' }}</button></div>
        </form>
      </div>
    </section>

    <section v-if="rescheduleTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3" @click.self="rescheduleTarget=null">
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 class="font-heading text-lg font-semibold">Reschedule appointment</h2>
        <form class="mt-4 grid gap-4" @submit.prevent="saveReschedule">
          <label class="grid gap-1 text-sm">New date and time <input v-model="rescheduleTarget.scheduled_at" type="datetime-local" required class="rounded-lg border px-3 py-2.5" /></label>
          <label class="grid gap-1 text-sm">Branch <select v-model="rescheduleTarget.branch_id" class="rounded-lg border px-3 py-2.5"><option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select></label>
          <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
          <div class="flex justify-end gap-2"><button type="button" @click="rescheduleTarget=null" class="rounded-lg border px-3 py-2 text-sm">Cancel</button><button type="submit" :disabled="saving" class="rounded-lg bg-clay-600 px-3 py-2 text-sm font-semibold text-white">{{ saving ? 'Saving…' : 'Save new time' }}</button></div>
        </form>
      </div>
    </section>
  </main>
</template>
