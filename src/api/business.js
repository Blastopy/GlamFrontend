import api from './client'

export default {
  getBusiness() {
    return api.get('/business')
  },
  listBranches() {
    return api.get('/business/branches')
  },
  createBranch(payload) {
    return api.post('/business/branches', payload)
  },
  updateBranch(id, payload) {
    return api.patch(`/business/branches/${id}`, payload)
  },
}
