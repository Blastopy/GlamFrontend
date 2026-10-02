import api from './client'

export default {
  clients(days = 30) {
    return api.get('/provider/analytics/clients', { params: { days } })
  },
}
