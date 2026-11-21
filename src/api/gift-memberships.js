import api from './client'

export default {
  giftCards(params = {}) { return api.get('/gift-cards', { params }) },
  issueGiftCard(payload) { return api.post('/gift-cards', payload) },
  deactivateGiftCard(id) { return api.post(`/gift-cards/${id}/deactivate`) },
  plans(params = {}) { return api.get('/memberships/plans', { params }) },
  createPlan(payload) { return api.post('/memberships/plans', payload) },
  updatePlan(id, payload) { return api.patch(`/memberships/plans/${id}`, payload) },
  subscriptions(params = {}) { return api.get('/memberships/subscriptions', { params }) },
  subscribe(payload) { return api.post('/memberships/subscriptions', payload) },
  cancelSubscription(id) { return api.post(`/memberships/subscriptions/${id}/cancel`) },
}
