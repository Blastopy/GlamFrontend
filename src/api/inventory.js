import api from './client'

export default {
  list(params = {}) { return api.get('/inventory', { params }) },
  valuation() { return api.get('/inventory/valuation') },
  create(payload) { return api.post('/inventory', payload) },
  update(id, payload) { return api.patch(`/inventory/${id}`, payload) },
  adjust(id, payload) { return api.post(`/inventory/${id}/adjust`, payload) },
  movements(id, params = {}) { return api.get(`/inventory/${id}/movements`, { params }) },
}
