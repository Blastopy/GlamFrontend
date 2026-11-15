import api from './client'

export default {
  register(payload) {
    return api.post('/register', payload)
  },
  login(payload) {
    return api.post('/login', payload)
  },
  logout() {
    return api.post('/logout')
  },
  me() {
    return api.get('/me')
  },
  google(credential) {
    return api.post('/auth/google', { credential })
  },
  resendVerificationEmail() {
    return api.post('/email/verification-notification')
  },
  forgotPassword(email) {
    return api.post('/forgot-password', { email })
  },
  resetPassword(payload) {
    return api.post('/reset-password', payload)
  },
}
