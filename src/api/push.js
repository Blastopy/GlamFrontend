import api from './client'

export default {
  subscribe(subscription) {
    return api.post('/push/subscribe', subscription)
  },
  unsubscribe(endpoint) {
    return api.delete('/push/unsubscribe', { data: { endpoint } })
  },
}
