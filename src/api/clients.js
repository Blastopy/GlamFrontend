
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

  remove(clientId, type = 'registered') {
    return type === 'guest'
      ? api.delete(`/provider/clients/guests/${clientId}`)
      : api.delete(`/provider/clients/${clientId}`)
  },
  updateGuestNotes(guestId, notes) {
    return api.patch(`/provider/clients/guests/${guestId}`, { notes })
  },
}
