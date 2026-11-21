import api from './client'

export default {
  sessions() { return api.get('/pos/cash-sessions') },
  loyaltyCustomers() { return api.get('/pos/loyalty-customers') },
  openSession(payload) { return api.post('/pos/cash-sessions/open', payload) },
  closeSession(id, payload) { return api.post(`/pos/cash-sessions/${id}/close`, payload) },
  checkout(payload) { return api.post('/pos/checkout', payload) },
  sales(params = {}) { return api.get('/pos/sales', { params }) },
  refund(id, payload) { return api.post(`/pos/sales/${id}/refund`, payload) },
  initiateMpesa(id, payload) { return api.post(`/pos/sales/${id}/payments/mpesa`, payload) },
  paymentStatus(saleId, paymentId) { return api.get(`/pos/sales/${saleId}/payments/${paymentId}`) },
}
