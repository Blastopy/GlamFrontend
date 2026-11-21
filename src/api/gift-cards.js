import api from './client'

export default {
  list(params = {}) { return api.get('/marketing/gift-cards', { params }) },
  create(payload) { return api.post('/marketing/gift-cards', payload) },
  show(id) { return api.get(`/marketing/gift-cards/${id}`) },
  disable(id) { return api.post(`/marketing/gift-cards/${id}/disable`) },
}
