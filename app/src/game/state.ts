// ゲームの状態＝セーブ文書（相棒仕様 v2 §10-2 の schemaVersion 2 ＋ 実装計画 §2-1 の足した項目）。
// W2 で使う項目だけを型に入れる（settings・buddy の残り・hallOfFame などは W3 以降で足す）。
// 入力の値は game_params.json の domains の値そのもの（「牛」「青カビ」など）。英語の名前には置き換えない

import { toIso } from './time'

export const SCHEMA_VERSION = 2

/** お手入れのボタンで足せる4つ（domains.care のうち「なし」「練る」以外） */
export const CARE_BUTTONS = ['洗う', '返す', '針', '塩'] as const
export type CareButton = (typeof CARE_BUTTONS)[number]
/** 枠の careLog に数えるもの。「練る」は仕込みのとき（W7 でミニゲーム）に1回だけ入る */
export type CareKey = CareButton | '練る'
export const CARE_KEYS: readonly CareKey[] = [...CARE_BUTTONS, '練る']

/** 仕込みで決める入力（乳・菌・圧搾・熟成庫）。仕上げは取り出すときに選ぶので null のまま */
export interface AgingInput {
  milk: string
  bac: string
  press: number
  room: string
  finish: null
}

export interface AgingSlot {
  /** 熟成棚の枠の番号（1〜AGING_SLOTS） */
  slot: number
  /** 仕込んだ時刻（ISO 8601） */
  startedAt: string
  input: AgingInput
  /** 手入れごとの回数 */
  careLog: Record<CareKey, number>
  /** 最後に行った手入れ（同数のときの決め手）。まだなら null。計画 §2-1 に足した項目 */
  careLast: CareButton | null
  /** 仕込んだ時点のなつき Lv の短縮%（相棒v2 §3-1。熟成中に Lv が上がっても変えない） */
  boostPct: number
}

export interface Registered {
  /** はじめて登録したゲーム上の日付（YYYY-MM-DD・4時区切り） */
  firstAt: string
  /** 作った回数 */
  count: number
}

export interface GameState {
  schemaVersion: number
  meta: { appVersion: string; saveSeq: number }
  createdAt: string
  lastSavedAt: string
  buddy: { affection: number }
  zukan: { registered: Record<string, Registered> }
  aging: AgingSlot[]
}

export function newGameState(now: number, appVersion: string): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { appVersion, saveSeq: 0 },
    createdAt: toIso(now),
    lastSavedAt: toIso(now),
    buddy: { affection: 0 },
    zukan: { registered: {} },
    aging: [],
  }
}
