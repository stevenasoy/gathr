import { describe, it, expect } from 'vitest'
import { normalizeVenue, unitWord } from '../venues'

const row = {
  id: 'uuid-1',
  owner_id: 'owner-uuid',
  name: 'The Glass House',
  city: 'Cebu City',
  area: 'Lahug',
  types: ['wedding'],
  capacity: 120,
  price_per_hour: 5000,
  blurb: 'Rooftop skyline views.',
  amenities: ['Parking', 'Bar'],
  image_urls: ['https://img/a.jpg'],
  host_name: 'Mara',
  host_type: 'individual',
  status: 'live',
  price_unit: 'hour',
  included_hours: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
}

describe('normalizeVenue', () => {
  it('maps snake_case DB columns to the app venue shape', () => {
    const v = normalizeVenue(row)
    expect(v.id).toBe('uuid-1')
    expect(v.ownerId).toBe('owner-uuid')
    expect(v.pricePerHour).toBe(5000)
    expect(v.priceUnit).toBe('hour')
    expect(v.isHostListing).toBe(true)
    expect(v.host.type).toBe('individual')
    expect(v.host.since).toBe(2026)
  })
  it('collapses area to null when it duplicates the city', () => {
    expect(normalizeVenue({ ...row, area: 'Cebu City' }).area).toBeNull()
  })
  it('falls back to the default image when image_urls is empty', () => {
    const v = normalizeVenue({ ...row, image_urls: [] })
    expect(v.images).toHaveLength(1)
    expect(v.images[0]).toMatch(/unsplash|images\.unsplash/)
  })
})

describe('unitWord', () => {
  it('maps unit codes to display words', () => {
    expect(unitWord('hour')).toBe('hour')
    expect(unitWord('head')).toBe('head')
    expect(unitWord('event')).toBe('event')
    expect(unitWord('whatever')).toBe('hour') // default
  })
})