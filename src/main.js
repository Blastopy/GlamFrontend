import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initEcho } from './echo'
import { useNotificationsStore } from './stores/notifications'
import './chartSetup'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Catches errors thrown inside component setup/render/watchers that nothing
// local caught — without this, a bug in one view can silently blank the page
// with only a console error and no feedback to the person using it.
app.config.errorHandler = (err, instance, info) => {
  console.error('Unhandled component error:', err, info)
  useNotificationsStore().error('Something went wrong displaying this page. Try refreshing.')
}

app.mount('#app')

// Reconnect the websocket on a hard page refresh if a session already exists
if (localStorage.getItem('auth_token')) {
  initEcho()
}

// Register the push-notification service worker. Registering early (not
// gated behind "is this a provider" — any role can land here) is harmless:
// the worker just sits idle until something actually subscribes via
// usePushNotifications().subscribe(). Silently no-ops on unsupported
// browsers/HTTP origins rather than throwing.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  })
}
