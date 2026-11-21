import api from './client'

export default {
  summary(params = {}) { return api.get('/inventory/reports/summary', { params }) },
}
