import api from './client'

export default {
  /** payload: { full_name, email, subject, message } */
  send(payload) {
    return api.post('/contact', payload)
  },
}
