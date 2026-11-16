// Lightweight per-page SEO for the SPA: title, description, canonical URL,
// Open Graph / Twitter tags, robots and optional JSON-LD structured data.
// Google renders JavaScript, so tags set here are picked up when it indexes.

export const SITE_NAME = 'Flairplace'
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://flairplace.com').replace(/\/$/, '')
export const DEFAULT_DESCRIPTION =
  'Find and book trusted barbers, salons and nail specialists near you in Kenya. Browse real work, compare upfront prices and book in minutes on Flairplace.'
export const DEFAULT_IMAGE = `${SITE_URL}/logo.png`

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (content == null || content === '') {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setPageJsonLd(data) {
  const id = 'page-jsonld'
  document.getElementById(id)?.remove()
  if (!data) return
  const script = document.createElement('script')
  script.id = id
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

/**
 * @param {object} opts
 * @param {string} [opts.title]        Page title without the brand suffix.
 * @param {string} [opts.description]
 * @param {string} [opts.path]         Path for the canonical URL (defaults to current path, no query).
 * @param {string} [opts.image]        Absolute image URL for social previews.
 * @param {boolean} [opts.noindex]     Keep private/utility pages out of search results.
 * @param {object} [opts.jsonLd]       Page-specific structured data.
 */
export function setSeo({ title, description, path, image, noindex = false, jsonLd = null } = {}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Book barbers, salons & nail specialists in Kenya`
  const desc = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 160)
  const url = `${SITE_URL}${path ?? window.location.pathname}`
  const img = image || DEFAULT_IMAGE

  document.title = fullTitle
  upsertMeta('name', 'description', desc)
  upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
  upsertCanonical(url)

  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', desc)
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:image', img)
  upsertMeta('name', 'twitter:title', fullTitle)
  upsertMeta('name', 'twitter:description', desc)
  upsertMeta('name', 'twitter:image', img)

  setPageJsonLd(jsonLd)
}
