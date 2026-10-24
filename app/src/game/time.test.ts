import { describe, expect, it } from 'vitest'
import { elapsedMinutes, gameDay } from './time'

describe('time', () => {
  it('4時で日付が切り替わる', () => {
    expect(gameDay(new Date(2026, 9, 26, 3, 59).getTime())).toBe('2026-10-25')
    expect(gameDay(new Date(2026, 9, 26, 4, 0).getTime())).toBe('2026-10-26')
  })

  it('経過は分単位で切り捨て、時計が戻ったら 0', () => {
    const t = new Date(2026, 9, 26, 12, 0).getTime()
    expect(elapsedMinutes(t, t + 59_999)).toBe(0)
    expect(elapsedMinutes(t, t + 60_000)).toBe(1)
    expect(elapsedMinutes(t, t - 60_000)).toBe(0)
  })
})
