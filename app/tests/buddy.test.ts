// 相棒（実装計画 §5「起動時の経過計算」・相棒v2 §1・§2・§6・§10-4 ＋ d裁定 10/30）
// 経過の計算：6時間・24時間・72/168/336時間の境目、元気の下限10、寝ている間は減らない、4時の切り替え、
// 何日あいても日数+1だけ、同じ時刻で2回計算しても同じ。操作：効果・クールダウン・上限・好み・すね・ワイルド度・おはよう・再会。
// なつき・段階・日数が減らないことは、各テストで通った状態の並びを最後に確かめる（afterEach）
import { afterEach, describe, expect, it } from 'vitest'
import { levelOf } from '../src/game/aging'
import {
  advanceBuddy,
  birth,
  BP,
  buddyOp,
  canWake,
  carePrefOf,
  debugSetLastInteraction,
  debugSetSpecies,
  debugSetValues,
  isSleepWindow,
  moodFace,
  stageOf,
  tempPrefOf,
  typeKeyOf,
  type BuddyAction,
  type OpResult,
} from '../src/game/buddy'
import { harvest, startAging } from '../src/game/cellar'
import { speciesById } from '../src/game/judge'
import { newGameState, type GameState } from '../src/game/state'
import { DAY_START_HOUR, gameDay, HOUR_MS } from '../src/game/time'
import { gameParams, speciesFile } from '../src/game/zukan'

const H = HOUR_MS
const SEC = 1000
/** 2026-11-02（月）12:00（端末のローカル時刻） */
const T0 = new Date(2026, 10, 2, 12, 0).getTime()
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()

// ---- 経過の計算と操作の前後（from → to）を全部覚えて、最後に「減っていない」を確かめる
const pairs: [GameState, GameState][] = []
let checked = 0
afterEach(() => {
  const list = pairs.splice(0)
  for (const [x, y] of list) {
    const a = x.buddy
    const b = y.buddy
    if (a.speciesId === null) continue
    checked++
    expect(b.affection, 'なつきが減った').toBeGreaterThanOrEqual(a.affection)
    expect(b.daysTogether, '日数が減った').toBeGreaterThanOrEqual(a.daysTogether)
    expect(BP.STAGE_FROM_DAY[stageOf(b.daysTogether)], '段階が戻った').toBeGreaterThanOrEqual(BP.STAGE_FROM_DAY[stageOf(a.daysTogether)])
    expect(b.wildAlbum.length, 'ワイルドアルバムが減った').toBeGreaterThanOrEqual(a.wildAlbum.length)
  }
})
/** r07 カマンベール（白カビ：ひんやり好き・拭く好き）を T0 に誕生させた状態 */
function born(id = 'r07', t = T0): GameState {
  return birth(newGameState(t, 'test'), id, t)
}
function adv(s: GameState, t: number): GameState {
  const r = advanceBuddy(s, t).state
  pairs.push([s, r])
  return r
}
function op(s: GameState, a: BuddyAction | BuddyAction['op'], t: number): OpResult {
  const r = buddyOp(s, typeof a === 'string' ? ({ op: a } as BuddyAction) : a, t)
  pairs.push([s, r.state])
  return r
}
/** 最後の操作を t に置いた状態（経過の計算もそこから） */
function lastAt(s: GameState, t: number): GameState {
  const iso = new Date(t).toISOString()
  return { ...s, buddy: { ...s.buddy, lastInteractionAt: iso, decayAt: { mood: iso, energy: iso } } }
}

describe('数値は game_params.json の buddy から', () => {
  it('日付の切り替えは time.ts と同じ4時・おはようも4時から', () => {
    expect(BP.DAY_BOUNDARY_HOUR).toBe(DAY_START_HOUR)
    expect(BP.WAKE_FROM_HOUR).toBe(DAY_START_HOUR)
  })

  it('誕生：日数＝DAYS_AT_BIRTH（1日目・うまれたて）、機嫌・元気は初期値、なつきはそのまま', () => {
    const s0 = newGameState(T0, 'test')
    const s = birth({ ...s0, buddy: { ...s0.buddy, affection: 120 } }, 'r07', T0)
    expect(s.buddy).toMatchObject({ speciesId: 'r07', daysTogether: BP.DAYS_AT_BIRTH, mood: 70, energy: 80, affection: 120, birthDate: '2026-11-02' })
    expect(stageOf(s.buddy.daysTogether)).toBe('newborn')
    // もういれば変えない
    expect(birth(s, 'r01', T0)).toBe(s)
  })

  it('段階は日数から（1・2・15・61日目）、Lv は累計から', () => {
    expect([1, 2, 14, 15, 60, 61, 300].map(stageOf)).toEqual(['newborn', 'young', 'young', 'ripe', 'ripe', 'vintage', 'vintage'])
    expect([0, 49, 50, 3599, 3600].map(levelOf)).toEqual([1, 1, 2, 9, 10])
  })

  it('機嫌の顔5段階（80・60・40・20・0）', () => {
    expect([100, 80, 79, 60, 59, 40, 39, 20, 19, 0].map(moodFace)).toEqual([
      'ごきげん', 'ごきげん', 'にこにこ', 'にこにこ', 'ふつう', 'ふつう', 'しょんぼり', 'しょんぼり', 'すねすね', 'すねすね',
    ])
  })
})

describe('経過の計算', () => {
  it('機嫌：最後の操作から6時間までは減らず、そこから1時間に2（時間は切り捨て）', () => {
    const s = born()
    expect(adv(s, T0 + 6 * H).buddy.mood).toBe(70)
    expect(adv(s, T0 + 7 * H - 1).buddy.mood).toBe(70)
    expect(adv(s, T0 + 7 * H).buddy.mood).toBe(68)
    expect(adv(s, T0 + 10 * H + 59 * 60 * SEC).buddy.mood).toBe(62)
    // 下限0
    expect(adv(s, T0 + 100 * H).buddy.mood).toBe(0)
  })

  it('元気：起きている間1時間に3（猶予なし）、下限10', () => {
    const s = born()
    expect(adv(s, T0 + H - 1).buddy.energy).toBe(80)
    expect(adv(s, T0 + H).buddy.energy).toBe(77)
    expect(adv(s, T0 + 23 * H).buddy.energy).toBe(11)
    expect(adv(s, T0 + 24 * H).buddy.energy).toBe(10)
    expect(adv(s, T0 + 500 * H).buddy.energy).toBe(10)
  })

  it('操作のたびに元気の減りは止まらない（機嫌の6時間だけが操作で延びる）', () => {
    let s = born()
    for (let i = 1; i <= 10; i++) s = op(s, 'pet', T0 + i * 30 * 60 * SEC).state
    // 5時間：元気は 80-15、機嫌は 70+50→100（上限）のまま
    expect(s.buddy.energy).toBe(65)
    expect(s.buddy.mood).toBe(100)
  })

  it('寝ている間は機嫌も元気も減らない（すね・ワイルド度は進む）', () => {
    let s = born('r07', at(2, 21))
    s = op(s, 'sleep', at(2, 21)).state
    expect(s.buddy.sleep.isSleeping).toBe(true)
    const later = adv(s, at(2, 21) + 30 * H)
    expect(later.buddy).toMatchObject({ mood: 70, energy: 80, sulking: true })
    // おはようの後は、そこから減りはじめる
    const w = op(later, 'wake', at(4, 3)).state
    expect(w.buddy).toMatchObject({ energy: 100, mood: 80 })
    expect(adv(w, at(4, 3) + 2 * H).buddy.energy).toBe(94)
    expect(adv(w, at(4, 3) + 7 * H).buddy.mood).toBe(78)
  })

  it('すね：最後の操作から24時間（23時間59分ではまだ）', () => {
    const s = born()
    expect(adv(s, T0 + 24 * H - 1).buddy.sulking).toBe(false)
    expect(adv(s, T0 + 24 * H).buddy.sulking).toBe(true)
    expect(advanceBuddy(s, T0 + 24 * H).events).toContainEqual({ kind: 'sulk' })
  })

  it('ワイルド度：72/168/336時間の境目で1/2/3', () => {
    const s = born()
    const w = (h: number) => adv(s, T0 + h * H).buddy.wild
    expect([71, 72, 167, 168, 335, 336, 1000].map(w)).toEqual([0, 1, 1, 2, 2, 3, 3])
    expect(adv(s, T0 + 72 * H - 1).buddy.wild).toBe(0)
  })

  it('ワイルド度は今より小さくしない・はじめてなった段階をアルバムに記録', () => {
    let s = born()
    s = adv(s, T0 + 200 * H)
    expect(s.buddy).toMatchObject({ wild: 2, wildAlbum: [2] })
    // ワイルド度3のままで最後の操作が 80時間前でも、1 に戻さない
    s = lastAt({ ...s, buddy: { ...s.buddy, wild: 3, wildAlbum: [2, 3] } }, T0 + 120 * H)
    expect(adv(s, T0 + 200 * H).buddy.wild).toBe(3)
  })

  it('同じ時刻で2回計算しても同じ（2回目は何も変えない）', () => {
    const s = born()
    for (const h of [0, 5, 7, 24, 30, 73, 200, 400]) {
      const once = adv(s, T0 + h * H)
      const twice = advanceBuddy(once, T0 + h * H)
      expect(twice.state).toBe(once)
      expect(twice.events).toEqual([])
    }
  })

  it('15分ごとに何回計算しても、まとめて1回計算したのと同じ（二重に減らない・端数で減り損ねない）', () => {
    const s = born()
    let step = s
    for (let t = T0; t <= T0 + 30 * H; t += 15 * 60 * SEC) step = adv(step, t)
    const once = adv(s, T0 + 30 * H)
    expect(step.buddy).toEqual(once.buddy)
    expect(once.buddy).toMatchObject({ mood: 70 - 2 * 24, energy: 10, sulking: true })
  })

  it('時計が戻っても減らさない・何も起きない', () => {
    const s = born()
    expect(advanceBuddy(s, T0 - 50 * H).state).toBe(s)
  })

  it('相棒がいなければ何もしない', () => {
    const s = newGameState(T0, 'test')
    expect(advanceBuddy(s, T0 + 999 * H).state).toBe(s)
  })
})

describe('日付（4時切り替え）と一緒に過ごした日数', () => {
  it('3:59 は前の日・4:00 から次の日（その日に1回でも操作すれば+1）', () => {
    let s = born('r07', at(2, 23))
    expect(s.buddy.daysTogether).toBe(1)
    s = op(s, 'pet', at(3, 3, 59)).state
    expect(s.buddy.daysTogether).toBe(1)
    expect(s.buddy.daily.day).toBe('2026-11-02')
    s = op(s, 'pet', at(3, 4, 0)).state
    expect(s.buddy.daysTogether).toBe(2)
    expect(s.buddy.daily.day).toBe('2026-11-03')
    // 同じ日に何回操作しても+1は1回
    s = op(op(s, 'talk', at(3, 12)).state, 'feed', at(3, 23)).state
    expect(s.buddy.daysTogether).toBe(2)
  })

  it('何日あいても+1だけ（暦の日数ではなく一緒に過ごした日数）', () => {
    let s = born()
    s = op(s, 'pet', T0 + 10 * 24 * H).state
    expect(s.buddy.daysTogether).toBe(2)
    expect(stageOf(s.buddy.daysTogether)).toBe('young')
  })

  it('上限・クールダウンで反応だけのときも「操作した」扱い（日数・最後の操作）', () => {
    let s = born()
    s = op(s, 'feed', T0).state
    const r = op(s, 'feed', T0 + 25 * H)
    expect(r.outcome).toBe('effect')
    const r2 = op(r.state, 'feed', T0 + 25 * H + 60 * SEC)
    expect(r2.outcome).toBe('cooldown')
    expect(r2.state.buddy.lastInteractionAt).toBe(new Date(T0 + 25 * H + 60 * SEC).toISOString())
  })

  it('日付が変わると、その日の回数・再会・ひらめきの記録は0から（クールダウンの時刻は残す）', () => {
    let s = born('r07', at(2, 22))
    s = op(op(s, 'talk', at(2, 22)).state, 'feed', at(3, 3)).state
    expect(s.buddy.daily).toMatchObject({ day: '2026-11-02', counts: { feed: 1, talk: 1 }, hintsGiven: ['talk'] })
    const next = adv(s, at(3, 4))
    expect(next.buddy.daily).toMatchObject({ day: '2026-11-03', counts: { feed: 0, talk: 0 }, affectionGained: 0, hintsGiven: [] })
    expect(next.buddy.daily.lastAt.feed).toBe(new Date(at(3, 3)).toISOString())
    // クールダウン3時間は日付をまたいでも続く
    expect(op(next, 'feed', at(3, 4)).outcome).toBe('cooldown')
  })
})

describe('操作', () => {
  it('なでる：機嫌+5・なつき+1、クールダウン10秒、1日20回（超えたら数値は変えず反応だけ）', () => {
    let s = born()
    let r = op(s, 'pet', T0)
    expect(r).toMatchObject({ outcome: 'effect', delta: { mood: 5, affection: 1, energy: 0 } })
    s = r.state
    r = op(s, 'pet', T0 + 10 * SEC - 1)
    expect(r).toMatchObject({ outcome: 'cooldown', delta: { mood: 0, affection: 0 }, waitSec: 1 })
    expect(r.state.buddy.mood).toBe(s.buddy.mood)
    for (let i = 1; i < 20; i++) s = op(s, 'pet', T0 + i * 10 * SEC).state
    expect(s.buddy.daily.counts.pet).toBe(20)
    expect(s.buddy.affection).toBe(20)
    r = op(s, 'pet', T0 + 999 * SEC)
    expect(r.outcome).toBe('limit')
    expect(r.state.buddy.affection).toBe(20)
    expect(r.state.buddy.daily.counts.pet).toBe(20)
  })

  it('話しかける：機嫌+3・なつき+2、クールダウン1分、1日10回', () => {
    let s = born()
    expect(op(s, 'talk', T0).delta).toMatchObject({ mood: 3, affection: 2 })
    s = op(s, 'talk', T0).state
    expect(op(s, 'talk', T0 + 59 * SEC).outcome).toBe('cooldown')
    for (let i = 1; i < 10; i++) s = op(s, 'talk', T0 + i * 60 * SEC).state
    expect(op(s, 'talk', T0 + 3 * H).outcome).toBe('limit')
  })

  it('ごはん：元気+30（上限100）・機嫌+5・なつき+5、クールダウン3時間、1日3回', () => {
    let s = born()
    const r = op(s, 'feed', T0)
    expect(r.delta).toEqual({ mood: 5, affection: 5, energy: 20, wild: 0 })
    s = r.state
    expect(op(s, 'feed', T0 + 3 * H - 1).outcome).toBe('cooldown')
    s = op(op(s, 'feed', T0 + 3 * H).state, 'feed', T0 + 6 * H).state
    expect(s.buddy.daily.counts.feed).toBe(3)
    expect(op(s, 'feed', T0 + 9 * H).outcome).toBe('limit')
  })

  it('お手入れ：機嫌+5・なつき+5、好みの手入れならなつき+3、クールダウン6時間、1日2回', () => {
    const s = born() // 白カビ＝拭く好き
    expect(carePrefOf(speciesById('r07'))).toBe('wipe')
    const like = op(s, { op: 'care', kind: 'wipe' }, T0)
    expect(like).toMatchObject({ outcome: 'effect', prefCare: true, delta: { mood: 5, affection: 8 } })
    const other = op(s, { op: 'care', kind: 'turn' }, T0)
    expect(other).toMatchObject({ outcome: 'effect', prefCare: false, delta: { mood: 5, affection: 5 } })
    expect(op(like.state, { op: 'care', kind: 'wipe' }, T0 + 6 * H - 1).outcome).toBe('cooldown')
    const two = op(like.state, { op: 'care', kind: 'wipe' }, T0 + 6 * H).state
    expect(op(two, { op: 'care', kind: 'wipe' }, T0 + 12 * H).outcome).toBe('limit')
  })

  it('お手入れのワイルド度を下げる効果は上限・クールダウンなし（1回で1）', () => {
    let s = adv(born(), T0 + 400 * H)
    expect(s.buddy.wild).toBe(3)
    const t = T0 + 400 * H
    let r = op(s, { op: 'care', kind: 'turn' }, t)
    expect(r).toMatchObject({ outcome: 'effect', delta: { wild: -1 } })
    s = r.state
    r = op(s, { op: 'care', kind: 'turn' }, t + SEC)
    expect(r).toMatchObject({ outcome: 'wildOnly', delta: { mood: 0, affection: 0, wild: -1 } })
    s = op(r.state, { op: 'care', kind: 'turn' }, t + 2 * SEC).state
    expect(s.buddy.wild).toBe(0)
    // 0 なら下げない（反応だけ）
    expect(op(s, { op: 'care', kind: 'turn' }, t + 3 * SEC).outcome).toBe('cooldown')
    expect(s.buddy.wildAlbum).toEqual([3])
  })

  it('日向ぼっこ／ひんやり：好きな方は機嫌+10・なつき+5、苦手な方は機嫌+2。クールダウン4時間を共有・苦手でも1日2回の上限を使う', () => {
    const s = born() // 白カビ＝ひんやり好き
    expect(tempPrefOf(speciesById('r07'))).toBe('cool')
    const like = op(s, { op: 'sun', kind: 'cool' }, T0)
    expect(like).toMatchObject({ outcome: 'effect', like: true, delta: { mood: 10, affection: 5 } })
    const dis = op(s, { op: 'sun', kind: 'sun' }, T0)
    expect(dis).toMatchObject({ outcome: 'effect', like: false, delta: { mood: 2, affection: 0 } })
    expect(op(dis.state, { op: 'sun', kind: 'cool' }, T0 + 4 * H - 1).outcome).toBe('cooldown')
    const two = op(dis.state, { op: 'sun', kind: 'cool' }, T0 + 4 * H).state
    expect(two.buddy.daily.counts.sun).toBe(2)
    expect(op(two, { op: 'sun', kind: 'cool' }, T0 + 8 * H).outcome).toBe('limit')
  })

  it('好みの表：82種すべてで引ける。工房オリジナルは推定タイプ（species.json の type）で引く', () => {
    for (const sp of speciesFile.species) {
      expect(['sun', 'cool']).toContain(tempPrefOf(sp))
      expect(['wipe', 'turn']).toContain(carePrefOf(sp))
    }
    const o78 = speciesById('o78') // きまぐれウォッシュ
    expect(typeKeyOf(o78)).toBe('orig')
    expect([tempPrefOf(o78), carePrefOf(o78)]).toEqual([BP.TEMP_PREF.washed, BP.CARE_PREF.washed])
    const o81 = speciesById('o81') // きまぐれハード
    expect([tempPrefOf(o81), carePrefOf(o81)]).toEqual([BP.TEMP_PREF.hard, BP.CARE_PREF.hard])
    const f66 = speciesById('f66')
    expect([tempPrefOf(f66), carePrefOf(f66)]).toEqual([BP.TEMP_PREF.fail, BP.CARE_PREF.fail])
  })

  it('寝かせる：夜20時〜翌4時だけ（19:59・4:00 は「まだ眠くないよ」）。1日1回', () => {
    expect([at(2, 19, 59), at(2, 20), at(3, 0), at(3, 3, 59), at(3, 4)].map(isSleepWindow)).toEqual([false, true, true, true, false])
    const s = born('r07', at(2, 19))
    const r = op(s, 'sleep', at(2, 19, 59))
    expect(r).toMatchObject({ outcome: 'notNight', delta: { mood: 0 } })
    expect(r.state.buddy.sleep.isSleeping).toBe(false)
    const slept = op(s, 'sleep', at(3, 3, 59))
    expect(slept.outcome).toBe('effect')
    expect(slept.state.buddy.sleep).toEqual({ isSleeping: true, sleptAt: new Date(at(3, 3, 59)).toISOString() })
  })

  it('おはよう：寝た翌朝の4時から。元気100・機嫌+10・なつき+10', () => {
    let s = born('r07', at(2, 20))
    s = op(s, 'sleep', at(2, 23)).state
    const early = op(s, 'wake', at(3, 3, 59))
    expect(early.outcome).toBe('notMorning')
    expect(early.state.buddy.sleep.isSleeping).toBe(true)
    expect(canWake(s.buddy, at(3, 4))).toBe(true)
    const w = op(s, 'wake', at(3, 4))
    expect(w).toMatchObject({ outcome: 'effect', hint: 'morning' })
    expect(w.state.buddy).toMatchObject({ energy: 100, sleep: { isSleeping: false, sleptAt: null } })
    expect(w.delta).toMatchObject({ mood: 10, affection: 10 })
    // 自動では起きない（夕方でも寝たまま）
    expect(adv(s, at(3, 18)).buddy.sleep.isSleeping).toBe(true)
    // 起きていればおはようは反応だけ
    expect(op(w.state, 'wake', at(3, 5)).outcome).toBe('awake')
  })

  it('寝ている間のほかの操作は反応だけ（すやすや）', () => {
    let s = born('r07', at(2, 21))
    s = op(s, 'sleep', at(2, 21)).state
    for (const a of ['pet', 'talk', 'feed', 'sleep'] as const) {
      const r = op(s, a, at(2, 22))
      expect(r.outcome).toBe('sleeping')
      expect(r.state.buddy.mood).toBe(s.buddy.mood)
    }
  })
})

describe('すね', () => {
  const sulky = () => adv(born(), T0 + 30 * H)

  it('なでる・話しかけるの合計2回で解ける。その2回にも通常の効果が付き、上限も使う', () => {
    let s = sulky()
    const t = T0 + 30 * H
    expect(s.buddy.sulking).toBe(true)
    let r = op(s, 'pet', t)
    expect(r).toMatchObject({ outcome: 'effect', wasSulking: true, sulkCleared: false, delta: { mood: 5, affection: 1 } })
    expect(r.state.buddy).toMatchObject({ sulking: true, sulkClear: 1 })
    r = op(r.state, 'talk', t + SEC)
    expect(r).toMatchObject({ outcome: 'effect', sulkCleared: true, delta: { mood: 3, affection: 2 } })
    expect(r.state.buddy).toMatchObject({ sulking: false, sulkClear: 0 })
    expect(r.state.buddy.daily.counts).toMatchObject({ pet: 1, talk: 1 })
    s = r.state
  })

  it('クールダウン中の連打は数えない・ほかの操作では解けない', () => {
    let s = sulky()
    const t = T0 + 30 * H
    s = op(s, 'pet', t).state
    expect(op(s, 'pet', t + SEC).state.buddy.sulkClear).toBe(1)
    s = op(s, 'feed', t + 2 * SEC).state
    s = op(s, { op: 'care', kind: 'wipe' }, t + 3 * SEC).state
    expect(s.buddy).toMatchObject({ sulking: true, sulkClear: 1 })
    expect(op(s, 'pet', t + 10 * SEC).state.buddy.sulking).toBe(false)
  })
})

describe('再会（24時間以上あいて戻った）', () => {
  it('おかえり：なつき+10（1日1回）。23時間ではまだ', () => {
    const s = born()
    expect(adv(s, T0 + 24 * H - 1).buddy.affection).toBe(0)
    const r = advanceBuddy(s, T0 + 24 * H)
    expect(r.events).toContainEqual({ kind: 'reunion', affection: 10, hint: false })
    expect(r.state.buddy).toMatchObject({ affection: 10, reunionHintPending: false, daily: { reunionBonusGiven: true, affectionGained: 10 } })
    // 同じ日はもう出ない（何回計算しても・操作しても）
    expect(adv(r.state, T0 + 26 * H).buddy.affection).toBe(10)
    const o = op(lastAt(r.state, T0), 'pet', T0 + 27 * H)
    expect(o.events.some((e) => e.kind === 'reunion')).toBe(false)
  })

  it('72時間以上ならヒント1つの印（71時間では付かない）', () => {
    const s = born()
    expect(adv(s, T0 + 71 * H).buddy.reunionHintPending).toBe(false)
    const r = advanceBuddy(s, T0 + 72 * H)
    expect(r.events).toContainEqual({ kind: 'reunion', affection: 10, hint: true })
    expect(r.state.buddy.reunionHintPending).toBe(true)
  })

  it('最初の操作で戻ってきたときも、操作の前に再会が済む', () => {
    const r = op(born(), 'pet', T0 + 48 * H)
    expect(r.events).toContainEqual({ kind: 'reunion', affection: 10, hint: false })
    expect(r.state.buddy.affection).toBe(11)
  })
})

describe('ひらめきの場面（その日に起きた場面を daily.hintsGiven に記録するだけ）', () => {
  it('話しかける：その日最初の1回（Lv1〜）。2回目は記録しない', () => {
    let s = born()
    let r = op(s, 'talk', T0)
    expect(r.hint).toBe('talk')
    s = r.state
    r = op(s, 'talk', T0 + 60 * SEC)
    expect(r.hint).toBeNull()
    expect(r.state.buddy.daily.hintsGiven).toEqual(['talk'])
  })

  it('すね中の話しかけるは、すねが解けた後の最初の1回', () => {
    let s = adv(born(), T0 + 30 * H)
    const t = T0 + 30 * H
    s = op(s, 'pet', t).state
    const clear = op(s, 'talk', t + SEC)
    expect(clear).toMatchObject({ sulkCleared: true, hint: null })
    expect(op(clear.state, 'talk', t + 61 * SEC).hint).toBe('talk')
  })

  it('日向ぼっこ／ひんやりは Lv4〜・その日に初めて好きな方を選んだとき。お手入れは Lv7〜', () => {
    const lv = (n: number) => debugSetValues(born(), { affection: gameParams.LV_TH[n - 1] })
    expect(op(lv(3), { op: 'sun', kind: 'cool' }, T0).hint).toBeNull()
    const s4 = lv(4)
    const dis = op(s4, { op: 'sun', kind: 'sun' }, T0)
    expect(dis.hint).toBeNull()
    expect(op(dis.state, { op: 'sun', kind: 'cool' }, T0 + 4 * H).hint).toBe('sun')
    expect(op(lv(6), { op: 'care', kind: 'turn' }, T0).hint).toBeNull()
    expect(op(lv(7), { op: 'care', kind: 'turn' }, T0).hint).toBe('care')
  })
})

describe('相棒の誕生（熟成棚で取り出す）', () => {
  const prep = { milk: '牛', bac: 'なし', press: 0, room: 'しっとり', knead: false }

  it('相棒がいないときに取り出すと、そのチーズが相棒になる（1日目）。2回目からは変わらない', () => {
    let s = startAging(newGameState(T0, 'test'), prep, T0)
    const r = harvest(s, 1, 'なし', T0 + 30 * 60 * SEC)
    expect(r.born).toBe(true)
    expect(r.state.buddy).toMatchObject({ speciesId: r.species.id, daysTogether: 1, birthDate: gameDay(T0) })
    s = startAging(r.state, { ...prep, milk: '山羊' }, T0 + H)
    const r2 = harvest(s, 1, 'なし', T0 + 2 * H)
    expect(r2.born).toBe(false)
    expect(r2.state.buddy.speciesId).toBe(r.species.id)
  })
})

describe('デバッグの道具', () => {
  it('種を選び直す（いなければ生まれる）・値を直接入れる（範囲に収める）', () => {
    let s = debugSetSpecies(newGameState(T0, 'test'), 'o79', T0)
    expect(s.buddy).toMatchObject({ speciesId: 'o79', daysTogether: 1 })
    s = debugSetSpecies(s, 'r12', T0)
    expect(s.buddy.speciesId).toBe('r12')
    const v = debugSetValues(s, { mood: 150, energy: 0, affection: 500 })
    expect(v.buddy).toMatchObject({ mood: 100, energy: 10, affection: 500 })
  })

  it('最後の操作を30時間前にすると、次の計算ですねる', () => {
    const s = debugSetLastInteraction(born(), 30, T0 + H)
    expect(adv(s, T0 + H).buddy).toMatchObject({ sulking: true, mood: 70 - 2 * 24, energy: 10 })
  })
})

describe('なつき・段階・日数は決して減らない（このファイルの全テストで通った状態を確かめた）', () => {
  it('確かめた前後の組の数', () => {
    expect(checked).toBeGreaterThan(150)
  })
})
