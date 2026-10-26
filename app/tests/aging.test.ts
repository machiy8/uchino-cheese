// 熟成短縮の照合（実装計画 §5「熟成短縮の計算」）。答えは boost_table.json（Python の common.short_th）

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { boostPctOfLevel, shortThreshold, shortThresholds } from '../src/game/aging'
import type { TimeKey } from '../src/game/zukan'

interface BoostTable {
  pcts: number[]
  table: { time: TimeKey; boostPct: number; minutes: number }[]
}
const boost = JSON.parse(
  readFileSync(new URL('./golden/boost_table.json', import.meta.url), 'utf-8'),
) as BoostTable

describe('熟成短縮', () => {
  it('7段階×5（0・3・5・7・10%）の35個がすべて一致', () => {
    expect(boost.pcts).toEqual([0, 3, 5, 7, 10])
    expect(boost.table.length).toBe(35)
    for (const row of boost.table) {
      expect(shortThreshold(row.time, row.boostPct), `${row.time} ${row.boostPct}%`).toBe(row.minutes)
    }
  })

  it('例：T6・7%＝9,374分、T1 は 7% と 10% がどちらも27分', () => {
    expect(shortThreshold('T6', 7)).toBe(9_374)
    expect(shortThreshold('T1', 7)).toBe(27)
    expect(shortThreshold('T1', 10)).toBe(27)
    expect(shortThresholds(0).T7).toBe(20_160)
  })

  it('なつき度 Lv の短縮%（Lv1〜3 は0、最大10）', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(boostPctOfLevel)).toEqual([0, 0, 0, 3, 3, 5, 5, 7, 7, 10])
    expect(() => boostPctOfLevel(11)).toThrow()
  })

  it('短縮%は 0〜100 の整数だけ', () => {
    expect(() => shortThreshold('T1', 2.5)).toThrow()
    expect(() => shortThreshold('T1', -1)).toThrow()
  })
})
