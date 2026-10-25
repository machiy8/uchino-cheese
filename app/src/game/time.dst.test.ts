// 夏時間のある地域で gameDay がずれないこと（日本に夏時間は無いが、端末の地域は選べない）
// このファイルだけ TZ を切り替える（Vitest はファイルごとに別の環境で動く）
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { gameDay } from './time'

beforeAll(() => {
  vi.stubEnv('TZ', 'America/New_York')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('gameDay（夏時間：America/New_York）', () => {
  it('前提：TZ が切り替わっている', () => {
    // 2026-11-01 は夏時間の終わり（25時間の日）
    expect(new Date(2026, 10, 1, 12, 0).getTimezoneOffset()).toBe(300)
    expect(new Date(2026, 9, 31, 12, 0).getTimezoneOffset()).toBe(240)
  })

  it('夏時間の終わり（11/1・1時台が2回ある）：4時ちょうどで切り替わる', () => {
    // 固定4時間引きだと 3:00〜3:59 が当日扱いになっていた
    expect(gameDay(new Date(2026, 10, 1, 3, 0).getTime())).toBe('2026-10-31')
    expect(gameDay(new Date(2026, 10, 1, 3, 59).getTime())).toBe('2026-10-31')
    expect(gameDay(new Date(2026, 10, 1, 4, 0).getTime())).toBe('2026-11-01')
    // 2回目の 1:30（標準時）も前日
    expect(gameDay(Date.UTC(2026, 10, 1, 6, 30))).toBe('2026-10-31')
  })

  it('夏時間の始まり（3/8・2時台が無い）：4時ちょうどで切り替わる', () => {
    // 固定4時間引きだと 4:00〜4:59 が前日扱いになっていた
    expect(gameDay(new Date(2026, 2, 8, 3, 59).getTime())).toBe('2026-03-07')
    expect(gameDay(new Date(2026, 2, 8, 4, 0).getTime())).toBe('2026-03-08')
    expect(gameDay(new Date(2026, 2, 8, 4, 59).getTime())).toBe('2026-03-08')
  })
})
