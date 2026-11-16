
import api from './client'

export default {
  list(params = {}) {
    return api.get('/provider/clients', { params })
  },

  add(payload) {
    return api.post('/provider/clients', payload)
  },

  updateNotes(clientId, notes) {
    return api.patch(`/provider/clients/${clientId}`, { notes })
  },

  remove(clientId, type) {
    return api.delete(`/provider/clients/${type}/${clientId}`)
  },
}
