// 判定の全件照合（実装計画 §5「判定（87,360通り）」）
// 答えは app/tools/export_app_data.py が Python の common.judge で作った judge_<MMDD>.bin（1バイト＝種の No）

import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { judge, monthDayOf, recipeKey } from '../src/game/judge'
import {
  gameParams,
  SLOTS,
  speciesFile,
  TIME_KEYS,
  type MonthDay,
  type RealSpecies,
  type Recipe,
} from '../src/game/zukan'

const GOLDEN = new URL('./golden/', import.meta.url)
// §5 の16日付（季節の内外がそろう4日＋季節の境目12日）
const DATES = [
  '0115', '0501', '0715', '1120',
  '0414', '0415', '0510', '0511', '0531', '0601',
  '0909', '0910', '1031', '1101', '1115', '1116',
]
const TOTAL = 87_360

const md = (mmdd: string): MonthDay => ({ month: Number(mmdd.slice(0, 2)), day: Number(mmdd.slice(2)) })

/** 全入力を Python（common.all_inputs）と同じ順に並べる。仕上げがいちばん速く回る */
function allInputs(): Recipe[] {
  const d = gameParams.domains
  const out: Recipe[] = []
  for (const milk of d.milk)
    for (const bac of d.bac)
      for (const press of d.press)
        for (const room of d.room)
          for (const time of d.time)
            for (const care of d.care)
              for (const finish of d.finish)
                out.push({ milk, bac, press, room, time, care, finish } as Recipe)
  return out
}

const inputs = allInputs()
const reals = speciesFile.species.filter((s): s is RealSpecies => s.kind === 'real')
const nameOfNo = new Map(speciesFile.species.map((s) => [s.no, s.name]))

describe('判定の前提', () => {
  it('入力の並びと選択肢が Python と同じ（4×5×4×2×7×6×13＝87,360）', () => {
    expect(speciesFile.inputOrder).toEqual([...SLOTS])
    expect(gameParams.inputOrder).toEqual([...SLOTS])
    expect(gameParams.slotsHintOrder).toEqual(['milk', 'bac', 'press', 'room', 'care', 'time', 'finish'])
    expect(gameParams.timeKeys).toEqual([...TIME_KEYS])
    expect(gameParams.domains.time).toEqual([...TIME_KEYS])
    expect(SLOTS.map((s) => gameParams.domains[s].length)).toEqual([4, 5, 4, 2, 7, 6, 13])
    expect(inputs.length).toBe(TOTAL)
  })

  it('答えのファイルは §5 の16日付だけで、どれも87,360バイト', () => {
    const files = readdirSync(GOLDEN).filter((f) => f.startsWith('judge_')).sort()
    expect(files).toEqual(DATES.map((d) => `judge_${d}.bin`).sort())
    for (const d of DATES) expect(readFileSync(new URL(`judge_${d}.bin`, GOLDEN)).length).toBe(TOTAL)
  })
})

describe('判定の全件一致（16日付×87,360通り）', () => {
  for (const d of DATES) {
    it(`${d.slice(0, 2)}/${d.slice(2)}`, () => {
      const gold = readFileSync(new URL(`judge_${d}.bin`, GOLDEN))
      const date = md(d)
      const diffs: string[] = []
      for (let i = 0; i < TOTAL; i++) {
        const got = judge(inputs[i], date).no
        if (got !== gold[i] && diffs.length < 10) {
          diffs.push(`${recipeKey(inputs[i])}: TS=${nameOfNo.get(got)} Python=${nameOfNo.get(gold[i])}`)
        }
      }
      expect(diffs).toEqual([])
    })
  }
})

describe('分岐表 §6', () => {
  it('内訳が分岐表 §6 の表と一致する（季節内＝季節限定3種がすべて季節に入る 10/31）', () => {
    const cnt = new Map<string, number>()
    let real = 0
    for (const r of inputs) {
      const s = judge(r, { month: 10, day: 31 })
      if (s.kind === 'real') real++
      else cnt.set(s.name, (cnt.get(s.name) ?? 0) + 1)
    }
    expect(real).toBe(65)
    expect(Object.fromEntries(cnt)).toEqual({
      あおくなれず: 14_560,
      ひびわれ: 13_104,
      ふくれっつら: 13_104,
      ほったらかし: 11_648,
      きまぐれハード: 6_709,
      きまぐれ白カビ: 5_034,
      きまぐれセミハード: 3_771,
      きまぐれシェーブル: 3_196,
      きまぐれウォッシュ: 2_838,
      のびきらず: 2_704,
      とろけすぎ: 2_496,
      きまぐれフレッシュ: 2_080,
      きまぐれのびのび: 1_920,
      カビもじゃ: 1_424,
      きまぐれ青カビ: 1_418,
      けむりまみれ: 704,
      すっぱすぎ: 585,
    })
  })

  it('到達する種の数：10/31 は82種すべて、1/15 は80種（季節限定はモン・ドールだけ）、7/15 は81種（モン・ドールが季節外）', () => {
    // 季節限定3種がそろって季節外になる日は無い（分岐表 §6 の「季節外79種」は3種を除いた仮の数え方）
    const reached = (date: MonthDay) => new Set(inputs.map((r) => judge(r, date).id)).size
    expect(reached({ month: 10, day: 31 })).toBe(82)
    expect(reached({ month: 1, day: 15 })).toBe(80)
    expect(reached({ month: 7, day: 15 })).toBe(81)
  })

  it('実在のレシピは必ずその実在種になる（季節限定は季節の中の日付で）', () => {
    expect(reals.length).toBe(65)
    for (const s of reals) {
      const date = s.season ? s.season.from : { month: 1, day: 15 }
      expect(judge(s.recipe, date).id, s.name).toBe(s.id)
      if (s.season) expect(judge(s.recipe, s.season.to).id, s.name).toBe(s.id)
    }
  })

  it('1か所違いで別の実在種になる組は128（向きあり）', () => {
    const keys = new Set(reals.map((s) => recipeKey(s.recipe)))
    let n = 0
    for (const s of reals) {
      for (const slot of SLOTS) {
        for (const v of gameParams.domains[slot]) {
          if (v === s.recipe[slot]) continue
          if (keys.has(recipeKey({ ...s.recipe, [slot]: v } as Recipe))) n++
        }
      }
    }
    expect(n).toBe(128)
  })
})

describe('日付', () => {
  it('ゲーム上の日付から月日を取り出す', () => {
    expect(monthDayOf('2026-09-10')).toEqual({ month: 9, day: 10 })
    expect(() => monthDayOf('2026/09/10')).toThrow()
  })
})
