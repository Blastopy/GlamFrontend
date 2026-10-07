// Service worker for push notifications. Lives at the site root (not under
// /src) so its scope covers the whole origin — a service worker can only
// control pages at or below the path it's served from.

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    return // malformed payload — nothing sensible to show
  }

  const title = payload.title || 'SalonBook'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.jpg',
    badge: '/logo.jpg',
    data: payload.data || {},
    actions: payload.actions || [], // [{ action: 'accept', title: 'Accept' }, ...] — set by NewAppointmentBookedPush
    requireInteraction: true, // a booking request shouldn't auto-dismiss before they've seen it
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  event.notification.close()

  // Accept/Decline: fire the signed quick-action URL directly in the background.
  // No window needs to open — the provider sees the result next time they check
  // the dashboard, same as any other push-driven background action.
  if (event.action === 'accept' && data.accept_url) {
    event.waitUntil(fetch(data.accept_url).catch(() => {}))
    return
  }

  if (event.action === 'decline' && data.decline_url) {
    event.waitUntil(fetch(data.decline_url).catch(() => {}))
    return
  }

  // Tapping the notification body itself (not a button) — open/focus the dashboard.
  const targetUrl = data.open_url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
