import api from './client'

export default {
  show(serviceId) { return api.get(`/services/${serviceId}/consumables`) },
  update(serviceId, payload) { return api.put(`/services/${serviceId}/consumables`, payload) },
}
