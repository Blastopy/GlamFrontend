import api from './client'

export default {
  roles() { return api.get('/business/team/roles') },
  list() { return api.get('/business/team') },
  add(payload) { return api.post('/business/team', payload) },
  update(id, payload) { return api.patch(`/business/team/${id}`, payload) },
  remove(id) { return api.delete(`/business/team/${id}`) },
}
