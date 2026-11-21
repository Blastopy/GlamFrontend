import api from './client'

export default {
  summary(params = {}) { return api.get('/finance/summary', { params }) },
  expenses(params = {}) { return api.get('/finance/expenses', { params }) },
  createExpense(payload) { return api.post('/finance/expenses', payload) },
  updateExpense(id, payload) { return api.patch(`/finance/expenses/${id}`, payload) },
  deleteExpense(id) { return api.delete(`/finance/expenses/${id}`) },
}
