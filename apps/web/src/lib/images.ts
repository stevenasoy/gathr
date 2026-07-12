// Image helpers for responsive images and CLS reduction.

const UNSPLASH_RE = /^https:\/\/images\.unsplash\.com\/photo-/

/**
 * Build a responsive srcset for an image URL if it supports a width parameter.
 * Currently supports Unsplash URLs (`w=`).
 */
export function srcSet(url: string, widths: number[] = [400, 800, 1200]): string | undefined {
  if (!url || !UNSPLASH_RE.test(url)) return undefined
  return widths.map((w) => `${withWidth(url, w)} ${w}w`).join(', ')
}

/**
 * Resize an image URL to a specific width if it supports width parameters.
 */
export function withWidth(url: string, w: number): string {
  if (!url || !UNSPLASH_RE.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  // Drop any existing width param and append the requested one.
  const base = url.replace(/([&?])w=\d+/, '')
  return `${base}${sep}w=${w}`
}

/**
 * Default sizes attribute for a venue card grid: roughly 1 column on small
 * screens, 2 on tablets, 3+ on desktops.
 */
export const cardSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'

/**
 * Default sizes attribute for a venue detail gallery main image: spans roughly
 * half the viewport on desktop, full width on mobile.
 */
export const gallerySizes = '(max-width: 1024px) 100vw, 60vw'
