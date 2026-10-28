// 熟成棚の通し（実装計画 §5「取り出しの窓」・相棒v2 §3・§6・§10-4）と、仕込み→手入れ→時間→仕上げ→判定→図鑑登録
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { levelOf } from '../src/game/aging'
import {
  addCare,
  decideCare,
  freeSlots,
  GameError,
  harvest,
  harvestStage,
  registeredCount,
  slotView,
  startAging,
  unlockedFinishes,
  type PrepInput,
} from '../src/game/cellar'
import { judge } from '../src/game/judge'
import { newGameState, type CareButton, type GameState } from '../src/game/state'
import { gameDay } from '../src/game/time'
import { gameParams, speciesFile, TIME_KEYS, type RealSpecies, type TimeKey } from '../src/game/zukan'

interface BoostTable {
  table: { time: TimeKey; boostPct: number; minutes: number }[]
}
const boost = JSON.parse(readFileSync(new URL('./golden/boost_table.json', import.meta.url), 'utf-8')) as BoostTable

const MIN = 60_000
const T0 = new Date(2026, 10, 2, 12, 0).getTime()
const prep: PrepInput = { milk: '牛', bac: 'なし', press: 0, room: 'しっとり', knead: false }

/** なつき（累計）を Lv のしきい値にした状態 */
function stateAtLevel(lv: number): GameState {
  const s = newGameState(T0, 'test')
  return { ...s, buddy: { affection: gameParams.LV_TH[lv - 1] } }
}
/** 短縮% → その%になる最小の Lv */
const LV_OF_PCT: Record<number, number> = { 0: 1, 3: 4, 5: 6, 7: 8, 10: 10 }

describe('なつき Lv（common.level_of と同じ）', () => {
  it('しきい値ちょうどで上がり、1つ手前では上がらない', () => {
    gameParams.LV_TH.forEach((t, i) => {
      expect(levelOf(t)).toBe(i + 1)
      if (t > 0) expect(levelOf(t - 1)).toBe(i)
    })
    expect(levelOf(999_999)).toBe(10)
  })
})

describe('取り出しの窓', () => {
  it.each([0, 3, 5, 7, 10])('boostPct %i%%：しきい値ちょうど・1分前・1分後が boost_table.json どおり', (pct) => {
    const s = startAging(stateAtLevel(LV_OF_PCT[pct]), prep, T0)
    const a = s.aging[0]
    expect(a.boostPct).toBe(pct)
    const rows = boost.table.filter((r) => r.boostPct === pct)
    expect(rows.map((r) => r.time)).toEqual([...TIME_KEYS])
    rows.forEach((r, i) => {
      const prev = i === 0 ? null : rows[i - 1].time
      expect(harvestStage(a, T0 + r.minutes * MIN), `${r.time} ちょうど`).toBe(r.time)
      expect(harvestStage(a, T0 + (r.minutes - 1) * MIN), `${r.time} の1分前`).toBe(prev)
      expect(harvestStage(a, T0 + (r.minutes + 1) * MIN), `${r.time} の1分後`).toBe(r.time)
      // 分未満は切り捨て：しきい値の1ミリ秒前はまだ前の段
      expect(harvestStage(a, T0 + r.minutes * MIN - 1), `${r.time} の1ms前`).toBe(prev)
    })
  })

  it('14日を超えても T7（14日もの）で止まる', () => {
    const a = startAging(stateAtLevel(1), prep, T0).aging[0]
    expect(harvestStage(a, T0 + 20_160 * MIN)).toBe('T7')
    expect(harvestStage(a, T0 + 365 * 1440 * MIN)).toBe('T7')
    expect(slotView(a, T0 + 30 * 1440 * MIN).next).toBeNull()
  })

  it('時計を戻した（経過がマイナス）は 0 分として扱い、取り出せない', () => {
    const a = startAging(stateAtLevel(1), prep, T0).aging[0]
    expect(harvestStage(a, T0 - 5 * 1440 * MIN)).toBeNull()
    const v = slotView(a, T0 - 90 * MIN)
    expect(v.elapsedMin).toBe(0)
    expect(v.next).toEqual({ stage: 'T1', inMin: 30 })
  })

  it('熟成中に Lv が上がっても、枠の boostPct と取り出しの段は変わらない。次に仕込む枠から効く', () => {
    let s = startAging(stateAtLevel(1), prep, T0)
    const before = s.aging[0]
    s = { ...s, buddy: { affection: gameParams.LV_TH[9] } }
    s = addCare(s, 1, '塩')
    expect(s.aging[0].boostPct).toBe(0)
    // 10% 短縮なら届く 1,296分（T4）でも、0% の枠はまだ T3
    expect(harvestStage(s.aging[0], T0 + 1_296 * MIN)).toBe('T3')
    expect(harvestStage(s.aging[0], T0 + 1_296 * MIN)).toBe(harvestStage(before, T0 + 1_296 * MIN))
    s = startAging(s, prep, T0)
    expect(s.aging.map((a) => a.boostPct)).toEqual([0, 10])
  })

  it('残り時間は短縮後のしきい値から数える', () => {
    const a = startAging(stateAtLevel(10), prep, T0).aging[0]
    // 10%：T4＝1,296分。経過 1,000分なら T3（648分）を過ぎて、あと296分で T4
    expect(slotView(a, T0 + 1_000 * MIN)).toMatchObject({ stage: 'T3', next: { stage: 'T4', inMin: 296 }, boostPct: 10 })
  })
})

describe('手入れの決め方', () => {
  const log = (p: Partial<Record<CareButton | '練る', number>>) => ({ 洗う: 0, 返す: 0, 針: 0, 塩: 0, 練る: 0, ...p })

  it('練るをしたら、他がどれだけ多くても「練る」', () => {
    expect(decideCare({ careLog: log({ 練る: 1, 洗う: 9 }), careLast: '洗う' })).toBe('練る')
  })

  it('一番多い手入れ', () => {
    expect(decideCare({ careLog: log({ 洗う: 1, 針: 3, 塩: 2 }), careLast: '洗う' })).toBe('針')
  })

  it('同数なら careLast の方', () => {
    expect(decideCare({ careLog: log({ 洗う: 2, 返す: 2 }), careLast: '返す' })).toBe('返す')
    expect(decideCare({ careLog: log({ 洗う: 2, 返す: 2 }), careLast: '洗う' })).toBe('洗う')
  })

  it('careLast が同数の中に無いときは 洗う→返す→針→塩 の順で先の方', () => {
    expect(decideCare({ careLog: log({ 返す: 2, 塩: 2, 針: 1 }), careLast: '針' })).toBe('返す')
  })

  it('0回なら「なし」', () => {
    expect(decideCare({ careLog: log({}), careLast: null })).toBe('なし')
  })

  it('お手入れの回数と careLast が枠に残る（回数と間隔の制限なし）', () => {
    let s = startAging(stateAtLevel(1), prep, T0)
    for (const c of ['洗う', '洗う', '返す', '返す', '返す', '洗う'] as const) s = addCare(s, 1, c)
    expect(s.aging[0].careLog).toEqual(log({ 洗う: 3, 返す: 3 }))
    expect(s.aging[0].careLast).toBe('洗う')
    expect(slotView(s.aging[0], T0).care).toBe('洗う')
  })
})

describe('仕込み', () => {
  it('空いている枠に入れる。3枠が埋まったら仕込めない', () => {
    let s = stateAtLevel(1)
    expect(freeSlots(s)).toEqual([1, 2, 3])
    s = startAging(s, prep, T0, 2)
    s = startAging(s, prep, T0)
    expect(s.aging.map((a) => a.slot)).toEqual([1, 2])
    s = startAging(s, prep, T0)
    expect(freeSlots(s)).toEqual([])
    expect(() => startAging(s, prep, T0)).toThrow(GameError)
  })

  it('選択肢に無い値は入らない（値は domains そのもの）', () => {
    expect(() => startAging(stateAtLevel(1), { ...prep, milk: 'cow' }, T0)).toThrow(GameError)
    expect(() => startAging(stateAtLevel(1), { ...prep, press: 4 }, T0)).toThrow(GameError)
  })

  it('仕込みの文書の形（仕上げは null・練るは careLog に1）', () => {
    const a = startAging(stateAtLevel(4), { ...prep, knead: true }, T0).aging[0]
    expect(a).toEqual({
      slot: 1,
      startedAt: new Date(T0).toISOString(),
      input: { milk: '牛', bac: 'なし', press: 0, room: 'しっとり', finish: null },
      careLog: { 洗う: 0, 返す: 0, 針: 0, 塩: 0, 練る: 1 },
      careLast: null,
      boostPct: 3,
    })
  })
})

/** 仕込み→手入れ→時間→仕上げ→判定 を通す。仕上げを全部使えるよう、ほかの種を27種登録しておく */
function brew(r: RealSpecies['recipe'], harvestAt: number, extra?: (s: GameState) => GameState) {
  let s = stateAtLevel(1)
  const others = speciesFile.species.filter((x) => recipeOf(x) !== r).slice(0, 27)
  s = { ...s, zukan: { registered: Object.fromEntries(others.map((x) => [x.id, { firstAt: '2026-01-01', count: 1 }])) } }
  const start = harvestAt - gameParams.TH_MIN[r.time] * MIN
  s = startAging(s, { milk: r.milk, bac: r.bac, press: r.press, room: r.room, knead: r.care === '練る' }, start)
  if (r.care !== 'なし' && r.care !== '練る') {
    s = addCare(s, 1, r.care as CareButton)
    s = addCare(s, 1, r.care as CareButton)
  }
  if (extra) s = extra(s)
  return harvest(s, 1, r.finish, harvestAt)
}
const recipeOf = (x: (typeof speciesFile.species)[number]) => (x.kind === 'real' ? x.recipe : null)

describe('仕込み→手入れ→時間→仕上げ→判定の通し', () => {
  const reals = speciesFile.species.filter((s): s is RealSpecies => s.kind === 'real')

  it('実在は65種', () => {
    expect(reals).toHaveLength(65)
  })

  it.each(reals.map((s) => [s.id, s.name, s] as const))('%s %s：レシピどおりに作るとその種になる', (_id, _n, sp) => {
    // 季節限定種は窓のはじめの日の翌日に取り出す。そのほかは 2026-07-15
    const at = sp.season
      ? new Date(2026, sp.season.from.month - 1, sp.season.from.day + 1, 12).getTime()
      : new Date(2026, 6, 15, 12).getTime()
    const r = brew(sp.recipe, at)
    expect(r.species.id).toBe(sp.id)
    expect(r.recipe).toEqual(sp.recipe)
    expect(r.isNew).toBe(true)
    expect(r.state.zukan.registered[sp.id]).toEqual({ firstAt: gameDay(at), count: 1 })
    expect(r.state.aging).toEqual([])
  })

  it('季節限定種（r63）は季節の外では別の種になる', () => {
    const r63 = reals.find((s) => s.id === 'r63')!
    const r = brew(r63.recipe, new Date(2026, 6, 15, 12).getTime())
    expect(r.species.id).not.toBe('r63')
  })

  it('取り出した時のゲーム日（4時区切り）で季節を見る', () => {
    const r65 = reals.find((s) => s.id === 'r65')!
    // r65 の窓は 6/1〜10/31。11/1 の 3:59 はゲーム上まだ 10/31
    expect(brew(r65.recipe, new Date(2026, 10, 1, 3, 59).getTime()).species.id).toBe('r65')
    expect(brew(r65.recipe, new Date(2026, 10, 1, 4, 0).getTime()).species.id).not.toBe('r65')
  })

  it('失敗種が出る：青カビなのに「返す」→ あおくなれず（f66）', () => {
    let s = startAging(stateAtLevel(1), { milk: '牛', bac: '青カビ', press: 0, room: 'しっとり', knead: false }, T0)
    s = addCare(s, 1, '返す')
    const r = harvest(s, 1, 'なし', T0 + 1440 * MIN)
    expect(r.species.kind).toBe('fail')
    expect(r.species.id).toBe('f66')
    expect(r.species.id).toBe(judge(r.recipe, { month: 11, day: 3 }).id)
  })

  it('工房オリジナルが出る（どれにも当たらない組み合わせ）', () => {
    // 判定の表から、手入れなし・仕上げなしで仕込める工房オリジナルの組を1つ探す
    const d = gameParams.domains
    let found: { input: PrepInput; time: TimeKey } | null = null
    outer: for (const milk of d.milk as string[])
      for (const bac of d.bac as string[])
        for (const press of d.press as number[])
          for (const room of d.room as string[])
            for (const time of TIME_KEYS) {
              const sp = judge({ milk, bac, press, room, time, care: 'なし', finish: 'なし' }, { month: 11, day: 2 })
              if (sp.kind === 'orig') {
                found = { input: { milk, bac, press, room, knead: false }, time }
                break outer
              }
            }
    expect(found).not.toBeNull()
    const s = startAging(stateAtLevel(1), found!.input, T0)
    const r = harvest(s, 1, 'なし', T0 + gameParams.TH_MIN[found!.time] * MIN)
    expect(r.species.kind).toBe('orig')
    expect(r.species.id).toMatch(/^o(7[5-9]|8[0-2])$/)
  })

  it('30分もの の前は取り出せない', () => {
    const s = startAging(stateAtLevel(1), prep, T0)
    expect(() => harvest(s, 1, 'なし', T0 + 29 * MIN)).toThrow(GameError)
    expect(harvest(s, 1, 'なし', T0 + 30 * MIN).species.id).toBe('r01')
  })
})

describe('仕上げの解放と図鑑の登録数', () => {
  const withCount = (n: number): GameState => {
    const s = stateAtLevel(1)
    const ids = speciesFile.species.slice(0, n).map((x) => x.id)
    return { ...s, zukan: { registered: Object.fromEntries(ids.map((id) => [id, { firstAt: '2026-11-01', count: 2 }])) } }
  }

  it.each([0, 2, 3, 26, 27])('登録数 %i：解放される仕上げが FIN_UNLOCK どおり', (n) => {
    const want = Object.entries(gameParams.FIN_UNLOCK)
      .filter(([, need]) => n >= need)
      .map(([f]) => f)
    expect(registeredCount(withCount(n))).toBe(n)
    expect([...unlockedFinishes(n)].sort()).toEqual(want.sort())
  })

  it('例：0種は なし・燻製・葉・木炭、3種で 木、27種で全13', () => {
    expect(unlockedFinishes(0)).toEqual(['なし', '燻製', '葉', '木炭'])
    expect(unlockedFinishes(2)).toEqual(['なし', '燻製', '葉', '木炭'])
    expect(unlockedFinishes(3)).toContain('木')
    expect(unlockedFinishes(26)).not.toContain('布')
    expect(unlockedFinishes(27)).toHaveLength(13)
  })

  it('解放前の仕上げでは取り出せない', () => {
    const s = startAging(withCount(2), prep, T0)
    expect(() => harvest(s, 1, '木', T0 + 30 * MIN)).toThrow(GameError)
    const s3 = startAging(withCount(3), prep, T0)
    expect(() => harvest(s3, 1, '木', T0 + 30 * MIN)).not.toThrow()
  })

  it('同じ種を2回作っても登録数は1（作った回数は2）。失敗種・工房も1種と数える', () => {
    let s = stateAtLevel(1)
    for (let i = 0; i < 2; i++) {
      s = startAging(s, prep, T0)
      const r = harvest(s, 1, 'なし', T0 + 30 * MIN)
      expect(r.isNew).toBe(i === 0)
      s = r.state
    }
    expect(registeredCount(s)).toBe(1)
    expect(s.zukan.registered.r01).toEqual({ firstAt: gameDay(T0 + 30 * MIN), count: 2 })
    s = addCare(startAging(s, { ...prep, bac: '青カビ' }, T0), 1, '返す')
    s = harvest(s, 1, 'なし', T0 + 1440 * MIN).state
    expect(Object.keys(s.zukan.registered).sort()).toEqual(['f66', 'r01'])
    expect(registeredCount(s)).toBe(2)
  })
})
