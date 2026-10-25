import { describe, expect, it, vi } from 'vitest'
import { advanceDebugClock, elapsedMinutes, gameDay, now } from './time'

describe('time', () => {
  it('4時で日付が切り替わる', () => {
    expect(gameDay(new Date(2026, 9, 26, 3, 59).getTime())).toBe('2026-10-25')
    expect(gameDay(new Date(2026, 9, 26, 4, 0).getTime())).toBe('2026-10-26')
  })

  it('月・年の変わり目も4時区切りで前日になる', () => {
    expect(gameDay(new Date(2027, 0, 1, 3, 59).getTime())).toBe('2026-12-31')
    expect(gameDay(new Date(2026, 10, 1, 0, 0).getTime())).toBe('2026-10-31')
  })

  it('経過は分単位で切り捨て、時計が戻ったら 0', () => {
    const t = new Date(2026, 9, 26, 12, 0).getTime()
    expect(elapsedMinutes(t, t + 59_999)).toBe(0)
    expect(elapsedMinutes(t, t + 60_000)).toBe(1)
    expect(elapsedMinutes(t, t - 60_000)).toBe(0)
  })

  it('now は端末の時刻に「時間を進める」分を足す。進めた分は累積し、0 と負の値は無視する', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    expect(now()).toBe(1_000_000)
    advanceDebugClock(60_000)
    advanceDebugClock(120_000)
    expect(now()).toBe(1_180_000)
    advanceDebugClock(0)
    advanceDebugClock(-500_000)
    expect(now()).toBe(1_180_000)
    vi.restoreAllMocks()
  })
})
