import { describe, it, expect } from 'vitest'
import { CreateBookingSchema } from './validation.js'

const base = {
  venue_id: '11111111-1111-4111-8111-111111111111',
  event_date: '2026-12-05',
  hours: 4,
}

describe('CreateBookingSchema start_time', () => {
  it('accepts a 24-hour HH:MM start time', () => {
    for (const t of ['00:00', '09:30', '14:00', '23:59']) {
      const r = CreateBookingSchema.safeParse({ ...base, start_time: t })
      expect(r.success, t).toBe(true)
    }
  })
  it('accepts a missing or null start time (whole day)', () => {
    expect(CreateBookingSchema.safeParse(base).success).toBe(true)
    expect(CreateBookingSchema.safeParse({ ...base, start_time: null }).success).toBe(true)
  })
  it('rejects anything that is not HH:MM', () => {
    for (const t of ['2pm', '14', '24:00', '9:30', '14:60', '14:00:00']) {
      const r = CreateBookingSchema.safeParse({ ...base, start_time: t })
      expect(r.success, t).toBe(false)
    }
  })
})
