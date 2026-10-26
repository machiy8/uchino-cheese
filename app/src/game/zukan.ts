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
}

// JSON の型推定は配列の要素ごとに形が割れるので、上の型として読む（形の確かめは tests/ の照合で行う）
export const speciesFile = speciesJson as unknown as SpeciesFile
export const gameParams = gameParamsJson as unknown as GameParams
