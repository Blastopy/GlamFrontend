import api from './client'

export default {
  promotions(params = {}) { return api.get('/marketing/promotions', { params }) },
  createPromotion(payload) { return api.post('/marketing/promotions', payload) },
  updatePromotion(id, payload) { return api.patch(`/marketing/promotions/${id}`, payload) },
  deletePromotion(id) { return api.delete(`/marketing/promotions/${id}`) },
}
