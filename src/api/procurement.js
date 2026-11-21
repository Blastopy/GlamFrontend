import api from './client'

export default {
  suppliers() { return api.get('/suppliers') },
  createSupplier(payload) { return api.post('/suppliers', payload) },
  updateSupplier(id, payload) { return api.patch(`/suppliers/${id}`, payload) },
  purchaseOrders(params = {}) { return api.get('/purchase-orders', { params }) },
  createPurchaseOrder(payload) { return api.post('/purchase-orders', payload) },
  purchaseOrder(id) { return api.get(`/purchase-orders/${id}`) },
  receive(id, payload) { return api.post(`/purchase-orders/${id}/receive`, payload) },
}
