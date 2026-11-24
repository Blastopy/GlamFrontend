import api from './client'

export default {
  suppliers(params = {}) { return api.get('/suppliers', { params }) },
  createSupplier(payload) { return api.post('/suppliers', payload) },
  updateSupplier(id, payload) { return api.patch(`/suppliers/${id}`, payload) },
  orders(params = {}) { return api.get('/purchase-orders', { params }) },
  createOrder(payload) { return api.post('/purchase-orders', payload) },
  submitOrder(id) { return api.post(`/purchase-orders/${id}/submit`) },
  receiveOrder(id, payload) { return api.post(`/purchase-orders/${id}/receive`, payload) },
}
