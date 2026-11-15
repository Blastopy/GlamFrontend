import { defineStore } from 'pinia'

export const useLoadingStore = defineStore('loading', {
  state: () => ({
    activeRequests: 0,
    navigating: false, // true while the router is resolving/lazy-loading the next page
  }),

  getters: {
    isLoading: (state) => state.activeRequests > 0,
  },

  actions: {
    start() {
      this.activeRequests++
    },
    stop() {
      this.activeRequests = Math.max(0, this.activeRequests - 1)
    },
    startNavigation() {
      this.navigating = true
    },
    stopNavigation() {
      this.navigating = false
    },
  },
})
