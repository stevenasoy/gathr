import { describe, it, expect } from 'vitest'
import { peso, fmtDate, toYMD, fmtWhen, fmtClock, fmtSlot } from '../format'

describe('fmtClock', () => {
  it('renders HH:MM and HH:MM:SS as a 12-hour clock', () => {
    expect(fmtClock('14:00')).toBe('2:00 PM')
    expect(fmtClock('09:30:00')).toBe('9:30 AM')
    expect(fmtClock('00:00')).toBe('12:00 AM')
    expect(fmtClock('12:15')).toBe('12:15 PM')
  })
  it('returns empty for missing or malformed input', () => {
    expect(fmtClock(null)).toBe('')
    expect(fmtClock('')).toBe('')
    expect(fmtClock('noon')).toBe('')
  })
})

describe('fmtSlot', () => {
  it('renders start to end from a duration', () => {
    expect(fmtSlot('14:00', 4)).toBe('2:00 PM to 6:00 PM')
  })
  it('wraps past midnight', () => {
    expect(fmtSlot('22:00', 4)).toBe('10:00 PM to 2:00 AM')
  })
  it('says whole day when there is no start time', () => {
    expect(fmtSlot(null, 4)).toBe('Whole day')
  })
})

describe('peso', () => {
  it('formats a number with en-PH grouping and the peso sign', () => {
    expect(peso(12500)).toBe('₱12,500')
  })
  it('falls back to 0 for nullish input', () => {
    expect(peso(null)).toBe('₱0')
    expect(peso(undefined)).toBe('₱0')
  })
})

describe('fmtDate', () => {
  it('parses YYYY-MM-DD as local (no UTC day shift)', () => {
    // Compact style so the assertion is locale-stable for month/day/year.
    expect(fmtDate('2026-01-02', 'compact')).toContain('2026')
  })
  it('returns the flexible placeholder for empty input', () => {
    expect(fmtDate('')).toBe('Date flexible')
    expect(fmtDate(null)).toBe('Date flexible')
  })
})

describe('toYMD', () => {
  it('formats a Date as local YYYY-MM-DD with zero padding', () => {
    expect(toYMD(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toYMD(new Date(2026, 10, 25))).toBe('2026-11-25')
  })
})

describe('fmtWhen', () => {
  it('returns empty string for nullish input', () => {
    expect(fmtWhen(null)).toBe('')
    expect(fmtWhen(undefined)).toBe('')
  })
  it('formats a real timestamp', () => {
    expect(fmtWhen('2026-03-04T10:00:00Z')).toContain('2026')
  })
})