// 熟成棚：仕込み → お手入れ → 取り出し（仕上げ → 判定 → 図鑑に登録）。
// どれも (state, …, now) → 新しい state の純粋な関数。時刻は引数で受け取る（time.ts の now() は画面側で呼ぶ）
// 窓の計算は相棒v2 §10-4 の擬似コードどおり

import { boostPctOfLevel, levelOf, shortThresholds } from './aging'
import { judge, monthDayOf } from './judge'
import { elapsedMinutes, gameDay, parseIso, toIso } from './time'
import { CARE_BUTTONS, type AgingSlot, type CareButton, type CareKey, type GameState } from './state'
import { gameParams, TIME_KEYS, type Recipe, type Species, type TimeKey } from './zukan'

export interface PrepInput {
  milk: string
  bac: string
  press: number
  room: string
  /** 練る（する／しない）。W2 はミニゲームなしで「する」＝成功 */
  knead: boolean
}

export class GameError extends Error {}

function checkDomain(slot: 'milk' | 'bac' | 'press' | 'room', v: string | number): void {
  if (!gameParams.domains[slot].includes(v)) throw new GameError(`${slot} の値が選択肢に無い: ${v}`)
}

/** 空いている枠の番号（小さい順） */
export function freeSlots(s: GameState): number[] {
  const used = new Set(s.aging.map((a) => a.slot))
  const out: number[] = []
  for (let i = 1; i <= gameParams.AGING_SLOTS; i++) if (!used.has(i)) out.push(i)
  return out
}

export function slotOf(s: GameState, slot: number): AgingSlot {
  const a = s.aging.find((x) => x.slot === slot)
  if (!a) throw new GameError(`枠 ${slot} は空いている`)
  return a
}

/** 仕込む。slot を省くと空いている一番小さい枠。枠の boostPct はいまのなつき Lv の短縮%で固定する */
export function startAging(s: GameState, input: PrepInput, now: number, slot?: number): GameState {
  checkDomain('milk', input.milk)
  checkDomain('bac', input.bac)
  checkDomain('press', input.press)
  checkDomain('room', input.room)
  const free = freeSlots(s)
  const target = slot ?? free[0]
  if (target === undefined || !free.includes(target)) throw new GameError('空いている枠が無い')
  const entry: AgingSlot = {
    slot: target,
    startedAt: toIso(now),
    input: { milk: input.milk, bac: input.bac, press: input.press, room: input.room, finish: null },
    careLog: { 洗う: 0, 返す: 0, 針: 0, 塩: 0, 練る: input.knead ? 1 : 0 },
    careLast: null,
    boostPct: boostPctOfLevel(levelOf(s.buddy.affection)),
  }
  const aging = [...s.aging, entry].sort((a, b) => a.slot - b.slot)
  return { ...s, aging }
}

/** お手入れを1回足す。回数と間隔の制限なし */
export function addCare(s: GameState, slot: number, care: CareButton): GameState {
  if (!CARE_BUTTONS.includes(care)) throw new GameError(`お手入れの値が違う: ${care}`)
  const a = slotOf(s, slot)
  const next: AgingSlot = { ...a, careLog: { ...a.careLog, [care]: a.careLog[care] + 1 }, careLast: care }
  return { ...s, aging: s.aging.map((x) => (x.slot === slot ? next : x)) }
}

/**
 * 判定に使う手入れ。練るをしたら「練る」（他より優先）。そうでなければ一番多い手入れ、
 * 同数なら careLast の方、0回なら「なし」。
 * careLast が同数の中に無いとき（例：洗う2・返す2・最後は針）は CARE_BUTTONS の順（洗う→返す→針→塩）で先の方
 */
export function decideCare(a: Pick<AgingSlot, 'careLog' | 'careLast'>): CareKey | 'なし' {
  if (a.careLog['練る'] > 0) return '練る'
  const max = Math.max(...CARE_BUTTONS.map((c) => a.careLog[c]))
  if (max <= 0) return 'なし'
  const top = CARE_BUTTONS.filter((c) => a.careLog[c] === max)
  if (a.careLast && top.includes(a.careLast)) return a.careLast
  return top[0]
}

export function startedAtMs(a: AgingSlot): number {
  const t = parseIso(a.startedAt)
  if (Number.isNaN(t)) throw new GameError(`仕込んだ時刻が読めない: ${a.startedAt}`)
  return t
}

/** 取り出しの段階。経過分（切り捨て・マイナスは0）が短縮後のしきい値以上の最大の段。T1 未満は null。14日以上は T7 */
export function harvestStage(a: AgingSlot, now: number): TimeKey | null {
  const th = shortThresholds(a.boostPct)
  const el = elapsedMinutes(startedAtMs(a), now)
  let stage: TimeKey | null = null
  for (const k of TIME_KEYS) if (el >= th[k]) stage = k
  return stage
}

export interface SlotView {
  slot: number
  /** 経過分 */
  elapsedMin: number
  /** いま取り出したときの段階（T1 未満は null） */
  stage: TimeKey | null
  /** 次の段階と、そこまでの残り分（T7 なら null） */
  next: { stage: TimeKey; inMin: number } | null
  boostPct: number
  care: CareKey | 'なし'
}

/** 熟成棚に出す値（短縮後の値で数える） */
export function slotView(a: AgingSlot, now: number): SlotView {
  const th = shortThresholds(a.boostPct)
  const el = elapsedMinutes(startedAtMs(a), now)
  const stage = harvestStage(a, now)
  const ni = stage === null ? 0 : TIME_KEYS.indexOf(stage) + 1
  const nk = TIME_KEYS[ni]
  return {
    slot: a.slot,
    elapsedMin: el,
    stage,
    next: nk ? { stage: nk, inMin: th[nk] - el } : null,
    boostPct: a.boostPct,
    care: decideCare(a),
  }
}

/** 図鑑の登録数＝登録済みの種の数（失敗種・工房を含む。同じ種は1） */
export function registeredCount(s: GameState): number {
  return Object.keys(s.zukan.registered).length
}

/** 仕上げが解放されているか（登録数から毎回計算する。保存しない） */
export function isFinishUnlocked(finish: string, count: number): boolean {
  const need = gameParams.FIN_UNLOCK[finish]
  if (need === undefined) throw new GameError(`仕上げの値が違う: ${finish}`)
  return count >= need
}

/** 解放済みの仕上げ（domains.finish の並び） */
export function unlockedFinishes(count: number): string[] {
  return (gameParams.domains.finish as string[]).filter((f) => isFinishUnlocked(f, count))
}

export interface HarvestResult {
  state: GameState
  species: Species
  recipe: Recipe
  /** はじめて図鑑に登録した種か */
  isNew: boolean
}

/** 取り出す：仕上げを選ぶ → 判定（月日は取り出した時のゲーム日）→ 図鑑に登録 → 枠を空ける */
export function harvest(s: GameState, slot: number, finish: string, now: number): HarvestResult {
  const a = slotOf(s, slot)
  const stage = harvestStage(a, now)
  if (stage === null) throw new GameError('まだ取り出せない（30分もの の前）')
  if (!isFinishUnlocked(finish, registeredCount(s))) throw new GameError(`仕上げ「${finish}」はまだ解放されていない`)
  const recipe: Recipe = {
    milk: a.input.milk,
    bac: a.input.bac,
    press: a.input.press,
    room: a.input.room,
    time: stage,
    care: decideCare(a),
    finish,
  }
  const day = gameDay(now)
  const species = judge(recipe, monthDayOf(day))
  const prev = s.zukan.registered[species.id]
  const registered = {
    ...s.zukan.registered,
    [species.id]: prev ? { ...prev, count: prev.count + 1 } : { firstAt: day, count: 1 },
  }
  return {
    state: { ...s, zukan: { ...s.zukan, registered }, aging: s.aging.filter((x) => x.slot !== slot) },
    species,
    recipe,
    isNew: !prev,
  }
}
