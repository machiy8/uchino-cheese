// 図鑑データ（app/src/data/generated/ の書き出し結果）の型と読み込み
// 書き出しは app/tools/export_app_data.py。ここで値を手で直さない（正本は zukan_tools/data.py）

import gameParamsJson from '../data/generated/game_params.json'
import speciesJson from '../data/generated/species.json'

// 入力の並び（判定・答えのバイト位置）。ヒントで開く順（gameParams.slotsHintOrder）とは time と care が逆
export const SLOTS = ['milk', 'bac', 'press', 'room', 'time', 'care', 'finish'] as const
export type Slot = (typeof SLOTS)[number]

export const TIME_KEYS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const
export type TimeKey = (typeof TIME_KEYS)[number]

/** レシピの7つの穴。値は data.py の選択肢（乳・菌などは日本語の文字列、圧搾は 0〜3） */
export interface Recipe {
  milk: string
  bac: string
  press: number
  room: string
  time: TimeKey
  care: string
  finish: string
}

type SlotValue = string | number
/** 宣言形の条件：値（等しい）／値の配列（どれか）／{ not: [...] }（どれでもない）。穴どうしは「かつ」 */
export type Cond = SlotValue | SlotValue[] | { not: SlotValue[] }
export type When = Partial<Record<Slot, Cond>>

export interface MonthDay {
  month: number
  day: number
}

export interface SeasonWindow {
  from: MonthDay
  to: MonthDay
}

interface SpeciesBase {
  id: string
  no: number
  name: string
  persona: string
  detail: string | null
}

export interface RealSpecies extends SpeciesBase {
  kind: 'real'
  origin: string
  type: string
  rare: number
  expl: string
  season: SeasonWindow | null
  seasonText: string | null
  recipe: Recipe
}

export interface FailSpecies extends SpeciesBase {
  kind: 'fail'
  failId: string
  condText: string
  expl: string
  when: When
}

export interface OrigSpecies extends SpeciesBase {
  kind: 'orig'
  type: string
}

export type Species = RealSpecies | FailSpecies | OrigSpecies

export interface InferTypeRule {
  when: When
  type: string
  id: string
}

export interface SpeciesFile {
  dataSha256: string
  sourceSha256: Record<string, string>
  exportedAt: string
  inputOrder: Slot[]
  inferType: InferTypeRule[]
  species: Species[]
}

export interface GameParams {
  types: { id: string; ja: string }[]
  inputOrder: Slot[]
  slotsHintOrder: Slot[]
  domains: Record<Slot, SlotValue[]>
  timeKeys: TimeKey[]
  timeLabel: Record<TimeKey, string>
  TH_MIN: Record<TimeKey, number>
  LV_TH: number[]
  BOOST_BY_LV: Record<string, number>
  HINTS_PER_DAY_BY_LV: Record<string, number>
  AD_HINTS_PER_DAY: number
  AGING_SLOTS: number
  FIN_UNLOCK: Record<string, number>
  starterCards: string[]
  tutorialCard: string
  buddy: BuddyParams
}

interface OpEffect {
  mood: number
  affection: number
  energy: number
}

/** game_params.json の buddy（正本は zukan_tools/common.py の BUDDY_*。決め方は「d裁定 10/30」のコメント） */
export interface BuddyParams {
  MOOD_INIT: number
  MOOD_MIN: number
  MOOD_MAX: number
  MOOD_DECAY_AFTER_H: number
  MOOD_DECAY_PER_H: number
  MOOD_DECAY_WHILE_SLEEPING: boolean
  MOOD_FACES: Record<string, number>
  ENERGY_INIT: number
  ENERGY_MIN: number
  ENERGY_MAX: number
  ENERGY_DECAY_AFTER_H: number
  ENERGY_DECAY_PER_H: number
  ENERGY_DECAY_WHILE_SLEEPING: boolean
  ENERGY_SLEEPY_BELOW: number
  SULK_AFTER_H: number
  SULK_CLEAR_OPS: string[]
  SULK_CLEAR_COUNT: number
  SULK_CLEAR_GIVES_EFFECTS: boolean
  WILD_AFTER_H: number[]
  WILD_MAX: number
  WILD_DOWN_PER_CARE: number
  DAY_BOUNDARY_HOUR: number
  DAYS_AT_BIRTH: number
  STAGE_FROM_DAY: Record<string, number>
  STAGE_JA: Record<string, string>
  OPS: {
    pet: OpEffect & { cooldownSec: number; dailyMax: number }
    talk: OpEffect & { cooldownSec: number; dailyMax: number }
    feed: OpEffect & { cooldownSec: number; dailyMax: number }
    care: OpEffect & {
      cooldownSec: number
      dailyMax: number
      wild: number
      wildIgnoresDailyMax: boolean
      wildIgnoresCooldown: boolean
      prefBonus: { affection: number; mood: number }
    }
    sleep: OpEffect & { cooldownSec: number; dailyMax: number; wake: { energySet: number; mood: number; affection: number } }
    sun: { cooldownSec: number; dailyMax: number; dislikeUsesDailyMax: boolean; hintOn: string; like: OpEffect; dislike: OpEffect }
    photo: OpEffect & { cooldownSec: number; dailyMax: number }
  }
  SLEEP_WINDOW: { fromHour: number; toHour: number }
  WAKE_FROM_HOUR: number
  SLEEP_UNTIL_WAKE: boolean
  PREF_INFER: string
  TEMP_PREF: Record<string, string>
  CARE_PREF: Record<string, string>
  HINT_SCENE_FROM_LV: Record<string, number>
  REUNION_AFTER_H: number
  REUNION_AFFECTION: number
  REUNION_PER_DAY: number
  REUNION_HINT_AFTER_H: number
  REUNION_HINTS: number
  REUNION_HINT_COUNTS_IN_DAILY: boolean
  types: string[]
}

// JSON の型推定は配列の要素ごとに形が割れるので、上の型として読む（形の確かめは tests/ の照合で行う）
export const speciesFile = speciesJson as unknown as SpeciesFile
export const gameParams = gameParamsJson as unknown as GameParams
