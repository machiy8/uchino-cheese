import { afterEach, describe, expect, it, vi } from 'vitest'
import { elapsedMinutes, gameDay, now, parseIso, toIso } from './time'

describe('time', () => {
  // 途中で失敗しても Date.now の差し替えを後のテストに残さない
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('now は端末の時刻に「時間を進める」分を足す。進めた分は累積し、0 と負の値は無視する', async () => {
    // 進めた分はモジュールの中に残るので、このテスト専用に読み直したモジュールで試す（後のテストに残さない）
    vi.resetModules()
    const { advanceDebugClock, now: freshNow } = await import('./time')
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    expect(freshNow()).toBe(1_000_000)
    advanceDebugClock(60_000)
    advanceDebugClock(120_000)
    expect(freshNow()).toBe(1_180_000)
    advanceDebugClock(0)
    advanceDebugClock(-500_000)
    expect(freshNow()).toBe(1_180_000)
  })

  it('進めた分を読める・元に戻すと端末の時刻', async () => {
    vi.resetModules()
    const t = await import('./time')
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000)
    t.advanceDebugClock(90_000)
    expect(t.debugClockOffset()).toBe(90_000)
    t.resetDebugClock()
    expect(t.debugClockOffset()).toBe(0)
    expect(t.now()).toBe(2_000_000)
  })

  it('保存する時刻の書き方（ISO 8601）と読み方は往復する。読めなければ NaN', () => {
    const t = new Date(2026, 10, 2, 12, 34, 56).getTime()
    expect(parseIso(toIso(t))).toBe(t)
    expect(parseIso('2026-11-13T08:00:00+09:00')).toBe(Date.UTC(2026, 10, 12, 23, 0))
    expect(parseIso('きのう')).toBeNaN()
  })

  it('前のテストで進めた分が残らない', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000_000)
    expect(now()).toBe(5_000_000)
  })
})
