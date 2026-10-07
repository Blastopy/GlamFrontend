import { ref } from 'vue'
import pushApi from '@/api/push'

const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
const permission = ref(isSupported ? Notification.permission : 'unsupported') // 'default' | 'granted' | 'denied' | 'unsupported'
const subscribing = ref(false)

/** Browsers want the VAPID key as a Uint8Array, not the base64 string Laravel gives us. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications() {
  async function subscribe() {
    if (!isSupported) return false

    subscribing.value = true
    try {
      const registration = await navigator.serviceWorker.ready

      const result = await Notification.requestPermission()
      permission.value = result
      if (result !== 'granted') return false

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // required by the spec — every push must show a visible notification

        applicationServerKey: urlBase64ToUint8Array('BNYIv9SA2Cjb3zu0SuCBrS5hQRM4h9DcLN42WPCA_B_rpk0sb0QdlcHiKXAN0167y4qxNu0a3l665lusHlHrvu0'),
      })

      await pushApi.subscribe(subscription.toJSON())
      return true
    } catch (e) {
      console.error('Push subscription failed:', e)
      return false
    } finally {
      subscribing.value = false
    }
  }

  async function unsubscribe() {
    if (!isSupported) return
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await pushApi.unsubscribe(subscription.endpoint)
    await subscription.unsubscribe()
  }

  async function isCurrentlySubscribed() {
    if (!isSupported) return false
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  }

  return { isSupported, permission, subscribing, subscribe, unsubscribe, isCurrentlySubscribed }
}
