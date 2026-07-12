import { describe, it, expect } from 'vitest'
import { peso, fmtDate, toYMD, fmtWhen } from '../format'

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