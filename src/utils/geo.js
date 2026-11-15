// Great-circle distance between two lat/lng points, in kilometres.
export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Distance from a point to a provider, or null if the provider has no coordinates.
export function providerDistanceKm(lat, lng, provider) {
  const pLat = parseFloat(provider.latitude)
  const pLng = parseFloat(provider.longitude)
  if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) return null
  return haversineKm(lat, lng, pLat, pLng)
}
