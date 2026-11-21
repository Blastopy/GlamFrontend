import api from './client'

export default {
  transfers() { return api.get('/inventory/transfers') },
  createTransfer(payload) { return api.post('/inventory/transfers', payload) },
  dispatchTransfer(id) { return api.post(`/inventory/transfers/${id}/dispatch`) },
  receiveTransfer(id) { return api.post(`/inventory/transfers/${id}/receive`) },
  stocktakes() { return api.get('/inventory/stocktakes') },
  createStocktake(payload) { return api.post('/inventory/stocktakes', payload) },
  finalizeStocktake(id) { return api.post(`/inventory/stocktakes/${id}/finalize`) },
}
