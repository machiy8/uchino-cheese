// 相棒のセリフ（src/data/lines/lines.json・手で書くデータ）を条件で引く
// 条件：タイプ（工房オリジナルは orig と推定タイプの両方）×段階×時間帯×状態×場面。同じ行が続かないように選ぶ
// 仕様：相棒v2 §8（性格×段階×時間帯×状態のタグで引く）

import linesJson from '../data/lines/lines.json'
import { BP, moodFace, stageOf, typeKeyOf, type Outcome, type Stage } from './buddy'
import type { BuddyState } from './state'
import { localHour } from './time'
import type { Species } from './zukan'

export const LINE_TIMES = ['morning', 'day', 'night'] as const
export type LineTime = (typeof LINE_TIMES)[number]
export const LINE_STATES = ['normal', 'sulking', 'sleepy', 'happy', 'sad'] as const
export type LineState = (typeof LINE_STATES)[number]
export const LINE_SCENES = ['pet', 'talk', 'feed', 'care', 'sleep', 'wake', 'sun', 'reunion'] as const
export type LineScene = (typeof LINE_SCENES)[number]

type Tag<T> = T[] | 'all'

export interface Line {
  id: string
  text: string
  types: Tag<string>
  stages: Tag<Stage>
  times: Tag<LineTime>
  states: Tag<LineState>
  scenes: Tag<LineScene>
}

export interface LinesFile {
  lines: Line[]
  reactions: Record<string, string>
}

export const linesFile = linesJson as unknown as LinesFile

export interface LineQuery {
  /** typeKeyOf の値（実在のタイプ・fail・orig） */
  type: string
  /** 工房オリジナルの推定タイプ（その性格の行も使う） */
  inferredType?: string
  stage: Stage
  time: LineTime
  state: LineState
  scene: LineScene
}

/** 時間帯：朝 4:00〜9:59／昼 10:00〜17:59／夜 18:00〜3:59（端末のローカル時刻） */
export function timeOfDay(now: number): LineTime {
  const h = localHour(now)
  if (h >= 4 && h < 10) return 'morning'
  if (h >= 10 && h < 18) return 'day'
  return 'night'
}

/** セリフの状態：すね＞ねむい（寝ている・元気30未満）＞しょんぼり（機嫌40未満）＞ごきげん（機嫌60以上）＞ふつう */
export function lineState(b: Pick<BuddyState, 'sulking' | 'energy' | 'mood' | 'sleep'>): LineState {
  if (b.sulking) return 'sulking'
  if (b.sleep.isSleeping || b.energy < BP.ENERGY_SLEEPY_BELOW) return 'sleepy'
  const f = moodFace(b.mood)
  if (f === 'しょんぼり' || f === 'すねすね') return 'sad'
  if (f === 'ごきげん' || f === 'にこにこ') return 'happy'
  return 'normal'
}

/** いまの相棒からセリフの条件を作る */
export function lineQuery(b: BuddyState, sp: Species, scene: LineScene, now: number): LineQuery {
  return {
    type: typeKeyOf(sp),
    inferredType: sp.kind === 'orig' ? sp.type : undefined,
    stage: stageOf(b.daysTogether),
    time: timeOfDay(now),
    state: lineState(b),
    scene,
  }
}

const has = <T>(tag: Tag<T>, v: T) => tag === 'all' || tag.includes(v)

export function matchingLines(q: LineQuery, lines: Line[] = linesFile.lines): Line[] {
  return lines.filter(
    (l) =>
      (has(l.types, q.type) || (q.inferredType !== undefined && has(l.types, q.inferredType))) &&
      has(l.stages, q.stage) &&
      has(l.times, q.time) &&
      has(l.states, q.state) &&
      has(l.scenes, q.scene),
  )
}

/** 条件に合う行から1本選ぶ。合う行が2本以上あれば、直前の行（lastId）は選ばない。rng は 0 以上 1 未満 */
export function pickLine(q: LineQuery, lastId: string | null, rng: () => number, lines: Line[] = linesFile.lines): Line | null {
  const all = matchingLines(q, lines)
  const pool = all.length > 1 ? all.filter((l) => l.id !== lastId) : all
  if (pool.length === 0) return null
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}

/** 押した反応だけのときの一言（op.outcome → *.outcome の順に探す） */
export function reactionText(op: string, outcome: Outcome): string {
  const r = linesFile.reactions
  return r[`${op}.${outcome}`] ?? r[`*.${outcome}`] ?? '…'
}
