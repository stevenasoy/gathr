import { describe, it, expect } from 'vitest'
import { maskContactInfo, isPreConfirmation, MASK_PLACEHOLDER } from './contact-mask.js'

describe('maskContactInfo', () => {
  it('masks PH mobile numbers in common formats', () => {
    for (const s of ['text me 09171234567', 'viber 0917 123 4567', '+63 917-123-4567', '(02) 8123 4567 landline']) {
      const r = maskContactInfo(s)
      expect(r.masked, s).toBe(true)
      expect(r.body, s).toContain(MASK_PLACEHOLDER)
      expect(r.body, s).not.toMatch(/\d{4}/)
    }
  })

  it('masks emails, links, bare domains and handles', () => {
    const r = maskContactInfo('email juan@venue.ph or fb.com/thevenue or www.venue.com, IG @thevenue_ph')
    expect(r.masked).toBe(true)
    expect(r.body).not.toMatch(/@venue\.ph|fb\.com|venue\.com|@thevenue_ph/)
    expect(r.body.split(MASK_PLACEHOLDER).length - 1).toBe(4)
  })

  it('leaves dates, prices, guest counts and normal text alone', () => {
    const s = 'Sept 15, 2026 (09-15-2026) for 150 guests, ₱54,000 total, 8 hrs. Sta. Barbara side entrance ok?'
    const r = maskContactInfo(s)
    expect(r.masked).toBe(false)
    expect(r.body).toBe(s)
  })

  it('does not treat a short @mention as a handle', () => {
    expect(maskContactInfo('see you @ 5pm').masked).toBe(false)
  })
})

describe('isPreConfirmation', () => {
  it('is true for anything but confirmed or completed', () => {
    expect(isPreConfirmation('requested')).toBe(true)
    expect(isPreConfirmation('declined')).toBe(true)
    expect(isPreConfirmation('cancelled')).toBe(true)
    expect(isPreConfirmation(null)).toBe(true)
    expect(isPreConfirmation(undefined)).toBe(true)
    expect(isPreConfirmation('confirmed')).toBe(false)
    expect(isPreConfirmation('completed')).toBe(false)
  })
})
