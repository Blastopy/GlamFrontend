import api from './client'

export default {
  settings() { return api.get('/loyalty/settings') },
  updateSettings(payload) { return api.put('/loyalty/settings', payload) },
  customers(params = {}) { return api.get('/loyalty/customers', { params }) },
  history(customerId, params = {}) { return api.get(`/loyalty/customers/${customerId}/history`, { params }) },
}
