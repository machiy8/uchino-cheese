// 相棒（うちの子）：誕生・経過の計算・操作6つ。どれも (state, …, now) → 新しい state の純粋な関数
// 数値は全部 game_params.json の buddy（正本は zukan_tools/common.py の BUDDY_*。決め方は「d裁定 10/30」のコメント）
// 仕様：相棒v2 §1・§2・§6・§10-4、実装計画 §5「起動時の経過計算」

import { levelOf } from './aging'
import { speciesById } from './judge'
import {
  emptyDaily,
  GameError,
  type BuddyOpKey,
  type BuddyState,
  type GameState,
  type HintScene,
} from './state'
import { elapsedHours, gameDay, HOUR_MS, localHour, parseIso, toIso } from './time'
import { gameParams, type Species } from './zukan'

export const BP = gameParams.buddy

export const STAGES = ['newborn', 'young', 'ripe', 'vintage'] as const
export type Stage = (typeof STAGES)[number]

/** 機嫌の顔5段階（MOOD_FACES の並び＝高い方から） */
export type MoodFace = 'ごきげん' | 'にこにこ' | 'ふつう' | 'しょんぼり' | 'すねすね'

export type CareKind = 'wipe' | 'turn'
export type SunKind = 'sun' | 'cool'

export type BuddyAction =
  | { op: 'pet' }
  | { op: 'talk' }
  | { op: 'feed' }
  | { op: 'care'; kind: CareKind }
  | { op: 'sleep' }
  | { op: 'wake' }
  | { op: 'sun'; kind: SunKind }

export type BuddyEvent =
  | { kind: 'reunion'; affection: number; hint: boolean }
  | { kind: 'sulk' }
  | { kind: 'wild'; level: number; first: boolean }

/**
 * 操作の結果。effect＝効果が付いた／cooldown・limit＝押した反応だけ（数値はそのまま）／
 * notNight＝昼に寝かせた（まだ眠くないよ）／notMorning＝4時より前のおはよう／sleeping＝寝ている間の操作／
 * awake＝起きているのにおはよう／wildOnly＝お手入れの上限・クールダウン中でワイルド度だけ下がった
 */
export type Outcome = 'effect' | 'cooldown' | 'limit' | 'notNight' | 'notMorning' | 'sleeping' | 'awake' | 'wildOnly'

export interface Delta {
  mood: number
  affection: number
  energy: number
  wild: number
}

export interface OpResult {
  state: GameState
  outcome: Outcome
  delta: Delta
  /** 日向ぼっこ／ひんやりで好きな方を選んだか */
  like?: boolean
  /** お手入れで好みの手入れを選んだか */
  prefCare?: boolean
  /** クールダウンの残り（秒・切り上げ） */
  waitSec?: number
  /** 操作の前にすねていたか・この操作ですねが解けたか */
  wasSulking: boolean
  sulkCleared: boolean
  /** この操作で起きたひらめきの場面（daily.hintsGiven に記録した。ヒントを開くのは W4） */
  hint: HintScene | null
  /** 操作の前に済ませた経過の計算で起きたこと（再会など） */
  events: BuddyEvent[]
}

const ms = (iso: string | null): number => (iso === null ? NaN : parseIso(iso))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const clampMood = (v: number) => clamp(v, BP.MOOD_MIN, BP.MOOD_MAX)
const clampEnergy = (v: number) => clamp(v, BP.ENERGY_MIN, BP.ENERGY_MAX)

export function hasBuddy(s: GameState): boolean {
  return s.buddy.speciesId !== null
}

/** 一緒に過ごした日数 → 段階（STAGE_FROM_DAY。保存しない） */
export function stageOf(days: number): Stage {
  let st: Stage = 'newborn'
  for (const k of STAGES) if (days >= BP.STAGE_FROM_DAY[k]) st = k
  return st
}

/** 機嫌 → 顔5段階（その値以上で、高い方から最初に当たったもの） */
export function moodFace(mood: number): MoodFace {
  for (const [name, th] of Object.entries(BP.MOOD_FACES)) if (mood >= th) return name as MoodFace
  return 'すねすね'
}

/** セリフ・好みを引くときのタイプ（実在＝タイプ、失敗種＝fail、工房オリジナル＝orig） */
export function typeKeyOf(sp: Species): string {
  return sp.kind === 'real' ? sp.type : sp.kind
}

/** 好みの表を引く。"infer" の工房オリジナルは species.json の type（推定タイプ）で引き直す */
function prefOf(table: Record<string, string>, sp: Species): string {
  const v = table[typeKeyOf(sp)]
  if (v === BP.PREF_INFER) {
    if (sp.kind !== 'orig') throw new GameError(`好みの表に infer が使えるのは工房オリジナルだけ: ${sp.id}`)
    return table[sp.type]
  }
  return v
}

export function tempPrefOf(sp: Species): SunKind {
  return prefOf(BP.TEMP_PREF, sp) as SunKind
}

export function carePrefOf(sp: Species): CareKind {
  return prefOf(BP.CARE_PREF, sp) as CareKind
}

/** 相棒の種（いなければ null） */
export function buddySpecies(s: GameState): Species | null {
  return s.buddy.speciesId ? speciesById(s.buddy.speciesId) : null
}

/** 相棒の誕生：相棒がいないときに熟成棚で取り出したら、そのチーズが相棒になる。なつき（累計）はそのまま */
export function birth(s: GameState, speciesId: string, now: number): GameState {
  if (hasBuddy(s)) return s
  speciesById(speciesId)
  const at = toIso(now)
  const today = gameDay(now)
  const buddy: BuddyState = {
    ...s.buddy,
    id: 'b_0001',
    speciesId,
    birthDate: today,
    daysTogether: BP.DAYS_AT_BIRTH,
    lastActiveDay: today,
    lastInteractionAt: at,
    mood: BP.MOOD_INIT,
    energy: BP.ENERGY_INIT,
    wild: 0,
    sulking: false,
    sulkClear: 0,
    sleep: { isSleeping: false, sleptAt: null },
    decayAt: { mood: at, energy: at },
    reunionHintPending: false,
    daily: emptyDaily(today),
    wildAlbum: [],
  }
  return { ...s, buddy }
}

/**
 * 経過の計算（起動・画面の更新・操作の前に呼ぶ）。相棒v2 §10-4 ＋ d裁定 10/30：
 * - 機嫌：最後の操作から6時間たった後、1時間に2ずつ（下限0）。元気：起きている間1時間に3ずつ（下限10）
 * - 寝ている間はどちらも減らない
 * - 減らした分は decayAt（機嫌・元気それぞれ）を1時間単位で進めて覚える。同じ時刻で何回計算しても二重に減らない
 * - 最後の操作から24時間ですね、72/168/336時間でワイルド度1/2/3（今より小さくはしない）
 * - 24時間以上あいていたら再会（なつき+10・1日1回）。72時間以上ならヒント1つの印
 * - 日付（4時区切り）が進んでいたら、その日の記録（daily）を新しくする
 * なつき・段階・日数は減らさない。変化が無ければ同じ state をそのまま返す
 */
export function advanceBuddy(s: GameState, now: number): { state: GameState; events: BuddyEvent[] } {
  const b0 = s.buddy
  if (!b0.speciesId) return { state: s, events: [] }
  const events: BuddyEvent[] = []
  let b = b0
  const today = gameDay(now)
  // 日付が進んだとき（時計が戻ったときは戻さない）
  if (today > b.daily.day) b = { ...b, daily: emptyDaily(today, b.daily.lastAt) }

  const last = ms(b.lastInteractionAt)
  if (!b.sleep.isSleeping || BP.MOOD_DECAY_WHILE_SLEEPING) {
    const from = decayFrom(ms(b.decayAt.mood), last, BP.MOOD_DECAY_AFTER_H)
    const h = elapsedHours(from, now)
    if (h > 0) {
      b = { ...b, mood: clampMood(b.mood - BP.MOOD_DECAY_PER_H * h), decayAt: { ...b.decayAt, mood: toIso(from + h * HOUR_MS) } }
    }
  }
  if (!b.sleep.isSleeping || BP.ENERGY_DECAY_WHILE_SLEEPING) {
    const from = decayFrom(ms(b.decayAt.energy), last, BP.ENERGY_DECAY_AFTER_H)
    const h = elapsedHours(from, now)
    if (h > 0) {
      b = {
        ...b,
        energy: clampEnergy(b.energy - BP.ENERGY_DECAY_PER_H * h),
        decayAt: { ...b.decayAt, energy: toIso(from + h * HOUR_MS) },
      }
    }
  }

  const away = elapsedHours(last, now)
  if (away >= BP.SULK_AFTER_H && !b.sulking) {
    b = { ...b, sulking: true, sulkClear: 0 }
    events.push({ kind: 'sulk' })
  }
  const wild = Math.min(BP.WILD_MAX, BP.WILD_AFTER_H.filter((th) => away >= th).length)
  if (wild > b.wild) {
    const first = !b.wildAlbum.includes(wild)
    b = { ...b, wild, wildAlbum: first ? [...b.wildAlbum, wild].sort((x, y) => x - y) : b.wildAlbum }
    events.push({ kind: 'wild', level: wild, first })
  }
  if (away >= BP.REUNION_AFTER_H && !b.daily.reunionBonusGiven) {
    const hint = away >= BP.REUNION_HINT_AFTER_H
    b = {
      ...b,
      affection: b.affection + BP.REUNION_AFFECTION,
      reunionHintPending: b.reunionHintPending || hint,
      daily: { ...b.daily, reunionBonusGiven: true, affectionGained: b.daily.affectionGained + BP.REUNION_AFFECTION },
    }
    events.push({ kind: 'reunion', affection: BP.REUNION_AFFECTION, hint })
  }
  return { state: b === b0 ? s : { ...s, buddy: b }, events }
}

/** 減らしはじめる時刻：済ませた所（cursor）と、猶予（最後の操作＋afterH 時間）の遅い方。猶予0なら済ませた所から */
function decayFrom(cursor: number, last: number, afterH: number): number {
  const c = Number.isNaN(cursor) ? last : cursor
  return afterH > 0 ? Math.max(c, last + afterH * HOUR_MS) : c
}

/** 寝かせられる時間帯（夜20時〜翌4時） */
export function isSleepWindow(now: number): boolean {
  const h = localHour(now)
  const w = BP.SLEEP_WINDOW
  return w.fromHour > w.toHour ? h >= w.fromHour || h < w.toHour : h >= w.fromHour && h < w.toHour
}

/** おはようを押せるか：寝た日（4時区切り）の次の日になったら（＝4時から） */
export function canWake(b: BuddyState, now: number): boolean {
  return b.sleep.isSleeping && b.sleep.sleptAt !== null && gameDay(now) > gameDay(ms(b.sleep.sleptAt))
}

/** クールダウンの残り（秒・切り上げ）。0＝押せる */
export function cooldownLeft(b: BuddyState, op: BuddyOpKey, now: number): number {
  const sec = BP.OPS[op].cooldownSec
  const at = b.daily.lastAt[op]
  if (!sec || !at) return 0
  const left = ms(at) + sec * 1000 - now
  return left > 0 ? Math.ceil(left / 1000) : 0
}

const NO_DELTA: Delta = { mood: 0, affection: 0, energy: 0, wild: 0 }

/**
 * 操作する。先に経過の計算（advanceBuddy）を済ませてから効果を当てる。
 * どの操作も、押せば「操作した」扱い（最後の操作の時刻・その日に1回目なら日数+1）。数値が変わるのは効果が付いたときだけ
 */
export function buddyOp(s: GameState, action: BuddyAction, now: number): OpResult {
  if (!hasBuddy(s)) throw new GameError('まだ相棒がいない')
  const adv = advanceBuddy(s, now)
  const before = adv.state.buddy
  const sp = speciesById(before.speciesId!)
  const lv = levelOf(before.affection)
  const today = gameDay(now)
  const at = toIso(now)
  const wasSulking = before.sulking

  // 操作した印
  let b: BuddyState = {
    ...before,
    lastInteractionAt: at,
    lastActiveDay: today,
    daysTogether: before.lastActiveDay !== null && before.lastActiveDay >= today ? before.daysTogether : before.daysTogether + 1,
  }

  let outcome: Outcome = 'effect'
  let like: boolean | undefined
  let prefCare: boolean | undefined
  let waitSec: number | undefined
  let hint: HintScene | null = null
  const add = (mood: number, affection: number, energy: number) => {
    b = {
      ...b,
      mood: clampMood(b.mood + mood),
      energy: clampEnergy(b.energy + energy),
      affection: b.affection + affection,
      daily: { ...b.daily, affectionGained: b.daily.affectionGained + affection },
    }
  }
  const used = (op: BuddyOpKey) => {
    b = { ...b, daily: { ...b.daily, counts: { ...b.daily.counts, [op]: b.daily.counts[op] + 1 }, lastAt: { ...b.daily.lastAt, [op]: at } } }
  }
  const recordHint = (scene: HintScene) => {
    if (lv < BP.HINT_SCENE_FROM_LV[scene] || b.daily.hintsGiven.includes(scene)) return
    if (b.daily.hintsGiven.length >= gameParams.HINTS_PER_DAY_BY_LV[String(lv)]) return
    b = { ...b, daily: { ...b.daily, hintsGiven: [...b.daily.hintsGiven, scene] } }
    hint = scene
  }

  if (b.sleep.isSleeping && action.op !== 'wake') {
    outcome = 'sleeping'
  } else if (action.op === 'wake') {
    if (!b.sleep.isSleeping) outcome = 'awake'
    else if (!canWake(b, now)) outcome = 'notMorning'
    else {
      const w = BP.OPS.sleep.wake
      b = { ...b, sleep: { isSleeping: false, sleptAt: null }, energy: clampEnergy(w.energySet), decayAt: { mood: at, energy: at } }
      add(w.mood, w.affection, 0)
      recordHint('morning')
    }
  } else if (action.op === 'sleep') {
    if (!isSleepWindow(now)) outcome = 'notNight'
    else if (b.daily.counts.sleep >= BP.OPS.sleep.dailyMax) outcome = 'limit'
    else {
      used('sleep')
      b = { ...b, sleep: { isSleeping: true, sleptAt: at } }
    }
  } else {
    const op = action.op
    const p = BP.OPS[op]
    if (b.daily.counts[op] >= p.dailyMax) outcome = 'limit'
    else if (cooldownLeft(b, op, now) > 0) {
      outcome = 'cooldown'
      waitSec = cooldownLeft(b, op, now)
    }
    const effective = outcome === 'effect'
    const clearsSulk = wasSulking && BP.SULK_CLEAR_OPS.includes(op) && outcome !== 'cooldown'
    if (effective && (!clearsSulk || BP.SULK_CLEAR_GIVES_EFFECTS)) {
      if (op === 'sun') {
        like = action.op === 'sun' && action.kind === tempPrefOf(sp)
        const e = like ? BP.OPS.sun.like : BP.OPS.sun.dislike
        add(e.mood, e.affection, e.energy)
        if (like) recordHint('sun')
      } else {
        const e = BP.OPS[op]
        add(e.mood, e.affection, e.energy)
        if (op === 'care' && action.op === 'care') {
          prefCare = action.kind === carePrefOf(sp)
          if (prefCare) add(BP.OPS.care.prefBonus.mood, BP.OPS.care.prefBonus.affection, 0)
          recordHint('care')
        }
        if (op === 'talk' && !wasSulking) recordHint('talk')
      }
      used(op)
    }
    if (op === 'care' && b.wild > 0) {
      const c = BP.OPS.care
      if (effective || (outcome === 'limit' && c.wildIgnoresDailyMax) || (outcome === 'cooldown' && c.wildIgnoresCooldown)) {
        b = { ...b, wild: Math.max(0, b.wild + c.wild) }
        if (!effective) outcome = 'wildOnly'
      }
    }
    if (clearsSulk) {
      const n = b.sulkClear + 1
      b = n >= BP.SULK_CLEAR_COUNT ? { ...b, sulking: false, sulkClear: 0 } : { ...b, sulkClear: n }
    }
  }

  const delta: Delta =
    outcome === 'effect' || outcome === 'wildOnly'
      ? { mood: b.mood - before.mood, affection: b.affection - before.affection, energy: b.energy - before.energy, wild: b.wild - before.wild }
      : NO_DELTA
  return {
    state: { ...adv.state, buddy: b },
    outcome,
    delta,
    like,
    prefCare,
    waitSec,
    wasSulking,
    sulkCleared: wasSulking && !b.sulking,
    hint,
    events: adv.events,
  }
}

// ---- デバッグ（設定 S8・DEBUG_TOOLS のときだけ画面から呼ぶ）

/** 相棒の種を選び直す（いなければ生まれる）。ほかの値はそのまま */
export function debugSetSpecies(s: GameState, speciesId: string, now: number): GameState {
  speciesById(speciesId)
  if (!hasBuddy(s)) return birth(s, speciesId, now)
  return { ...s, buddy: { ...s.buddy, speciesId } }
}

/** 機嫌・元気・なつきを直接入れる（範囲に収める。デバッグなので、なつきも下げられる） */
export function debugSetValues(s: GameState, v: Partial<Pick<BuddyState, 'mood' | 'energy' | 'affection'>>): GameState {
  const b = s.buddy
  return {
    ...s,
    buddy: {
      ...b,
      mood: v.mood === undefined ? b.mood : clampMood(Math.round(v.mood)),
      energy: v.energy === undefined ? b.energy : clampEnergy(Math.round(v.energy)),
      affection: v.affection === undefined ? b.affection : Math.max(0, Math.round(v.affection)),
    },
  }
}

/** 最後の操作を h 時間前にする（経過の計算も h 時間前から。次の advanceBuddy で、すね・ワイルド度・再会が起きる） */
export function debugSetLastInteraction(s: GameState, hoursAgo: number, now: number): GameState {
  if (!hasBuddy(s)) return s
  const at = toIso(now - Math.max(0, hoursAgo) * HOUR_MS)
  return { ...s, buddy: { ...s.buddy, lastInteractionAt: at, decayAt: { mood: at, energy: at } } }
}
