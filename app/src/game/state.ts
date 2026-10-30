// ゲームの状態＝セーブ文書（相棒仕様 v2 §10-2 の schemaVersion 2 ＋ 実装計画 §2-1 の足した項目）。
// 使う項目だけを型に入れる（settings・名前・着せ替え・写真・hallOfFame などは W5 以降で足す）。
// 入力の値は game_params.json の domains の値そのもの（「牛」「青カビ」など）。英語の名前には置き換えない

import { gameDay, toIso } from './time'
import { gameParams } from './zukan'

export const SCHEMA_VERSION = 2

export class GameError extends Error {}

const BUDDY_INIT = { mood: gameParams.buddy.MOOD_INIT, energy: gameParams.buddy.ENERGY_INIT }

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
  /** 手入れごとに「最後に行ったのが枠の中で何回目の手入れか」（1〜。まだなら 0）。同数のときの決め手（計画 §2-1） */
  careSeq: Record<CareButton, number>
  /** 仕込んだ時点のなつき Lv の短縮%（相棒v2 §3-1。熟成中に Lv が上がっても変えない） */
  boostPct: number
}

export interface Registered {
  /** はじめて登録したゲーム上の日付（YYYY-MM-DD・4時区切り） */
  firstAt: string
  /** 作った回数 */
  count: number
}

/** 相棒の操作（daily.counts のキー）。記念撮影 photo は W6 */
export const BUDDY_OPS = ['pet', 'talk', 'feed', 'care', 'sleep', 'sun'] as const
export type BuddyOpKey = (typeof BUDDY_OPS)[number]

/** ひらめきが出る場面（daily.hintsGiven に入る値。ヒントを開くのは W4） */
export type HintScene = 'talk' | 'morning' | 'sun' | 'care'

/** その日（4時区切り）の記録。日付が変わったら counts などを0に戻す（lastAt はクールダウンのため残す） */
export interface BuddyDaily {
  /** ゲーム上の日付（YYYY-MM-DD） */
  day: string
  /** 効果が付いた回数 */
  counts: Record<BuddyOpKey, number>
  /** 最後に効果が付いた時刻（ISO 8601）。クールダウンに使う */
  lastAt: Partial<Record<BuddyOpKey, string>>
  affectionGained: number
  reunionBonusGiven: boolean
  hintsGiven: HintScene[]
}

/**
 * 相棒（相棒v2 §10-2 の buddy のうち W3 の分）。speciesId が null＝まだ相棒がいない（affection だけ使う）。
 * 段階・なつき Lv・好み・タイプは派生値なので保存しない（日数・累計・species.json から毎回計算）
 */
export interface BuddyState {
  id: string | null
  speciesId: string | null
  /** 生まれたゲーム上の日付 */
  birthDate: string | null
  daysTogether: number
  /** 最後に操作したゲーム上の日付（日数+1 の判定） */
  lastActiveDay: string | null
  /** 最後に操作した時刻（すね・ワイルド度・機嫌の6時間・再会の起点） */
  lastInteractionAt: string | null
  mood: number
  affection: number
  energy: number
  wild: number
  sulking: boolean
  /** すねを解く操作（なでる・話しかける）をすねてから何回したか */
  sulkClear: number
  sleep: { isSleeping: boolean; sleptAt: string | null }
  /** 経過の計算をどこまで済ませたか（機嫌・元気それぞれ。1時間単位で進めるので、何回計算しても二重に減らない） */
  decayAt: { mood: string | null; energy: string | null }
  /** 72時間以上あいて戻ったときのヒント1つの印（中身は W4 で開く） */
  reunionHintPending: boolean
  daily: BuddyDaily
  /** はじめてなったワイルド度（1〜3・小さい順） */
  wildAlbum: number[]
}

export interface GameState {
  schemaVersion: number
  meta: { appVersion: string; saveSeq: number }
  createdAt: string
  lastSavedAt: string
  buddy: BuddyState
  zukan: { registered: Record<string, Registered> }
  aging: AgingSlot[]
}

export function newGameState(now: number, appVersion: string): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { appVersion, saveSeq: 0 },
    createdAt: toIso(now),
    lastSavedAt: toIso(now),
    buddy: emptyBuddy(now),
    zukan: { registered: {} },
    aging: [],
  }
}

export function emptyDaily(day: string, lastAt: BuddyDaily['lastAt'] = {}): BuddyDaily {
  return {
    day,
    counts: { pet: 0, talk: 0, feed: 0, care: 0, sleep: 0, sun: 0 },
    lastAt,
    affectionGained: 0,
    reunionBonusGiven: false,
    hintsGiven: [],
  }
}

/** まだ相棒がいない状態（数値は game_params の初期値。生まれるときに buddy.ts の birth で埋める） */
export function emptyBuddy(now: number, affection = 0): BuddyState {
  return {
    id: null,
    speciesId: null,
    birthDate: null,
    daysTogether: 0,
    lastActiveDay: null,
    lastInteractionAt: null,
    mood: BUDDY_INIT.mood,
    affection,
    energy: BUDDY_INIT.energy,
    wild: 0,
    sulking: false,
    sulkClear: 0,
    sleep: { isSleeping: false, sleptAt: null },
    decayAt: { mood: null, energy: null },
    reunionHintPending: false,
    daily: emptyDaily(gameDay(now)),
    wildAlbum: [],
  }
}
