// 保存（実装計画 §2-1）：同じ文書を2か所（A・B）に交互に書き、読むときは壊れていない方のうち saveSeq の大きい方を使う。
// 保存場所は SaveBackend で差し替える（Web＝IndexedDB は idb.ts、ネイティブ＝Preferences は W5、テスト＝memory.ts）

import { BUDDY_OPS, CARE_BUTTONS, CARE_KEYS, emptyBuddy, SCHEMA_VERSION, type BuddyState, type GameState } from '../game/state'
import { isDayString, parseIso, toIso } from '../game/time'
import { gameParams, speciesFile } from '../game/zukan'

/** 文字列を1つのキーに置くだけの保存場所 */
export interface SaveBackend {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string): Promise<void>
  del(key: string): Promise<void>
}

export const SAVE_KEYS = ['save:A', 'save:B'] as const
type SaveKey = (typeof SAVE_KEYS)[number]

export type LoadResult =
  /** どちらにも無い（はじめて） */
  | { kind: 'empty' }
  /** 両方とも壊れていた（新規で始める） */
  | { kind: 'corrupt' }
  /** 保存場所から読めなかった（I/O の失敗）。中身は分からないので、新規で上書きしない（保存を止める） */
  | { kind: 'error' }
  | { kind: 'ok'; state: GameState; from: SaveKey; otherBroken: boolean }
  /** 自分より新しい schemaVersion の文書。上書きしない（読み取り専用で起動する） */
  | { kind: 'newer'; schemaVersion: number; state: GameState | null }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isInt = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max
const isStr = (v: unknown): v is string => typeof v === 'string'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
/** 日付として読める ISO 8601 の時刻 */
const isTime = (v: unknown): v is string => isStr(v) && !Number.isNaN(parseIso(v))
const isTimeOrNull = (v: unknown): v is string | null => v === null || isTime(v)
/** ゲーム上の日付（YYYY-MM-DD・実在する日） */
const isDay = (v: unknown): v is string => isStr(v) && isDayString(v)
const isDayOrNull = (v: unknown): v is string | null => v === null || isDay(v)

const SPECIES_IDS = new Set(speciesFile.species.map((x) => x.id))
const inDomain = (slot: 'milk' | 'bac' | 'press' | 'room', v: unknown) => (gameParams.domains[slot] as unknown[]).includes(v)
const HINT_SCENES = Object.keys(gameParams.buddy.HINT_SCENE_FROM_LV)
const BP = gameParams.buddy

/** 読めた文書の頭（どちらが新しいかの判定に使う） */
interface Head {
  schemaVersion: number
  saveSeq: number
  doc: Record<string, unknown>
}

function readHead(raw: string | undefined): Head | null {
  if (raw === undefined) return null
  let doc: unknown
  try {
    doc = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObj(doc) || !isInt(doc.schemaVersion, 1) || !isObj(doc.meta) || !isInt(doc.meta.saveSeq)) return null
  return { schemaVersion: doc.schemaVersion, saveSeq: doc.meta.saveSeq, doc }
}

/**
 * 熟成棚の1枠。W2 の文書（careLast だけで careSeq が無い）は careSeq に直して読む
 * （careLast の手入れを最後＝一番大きい番号にする。ほかは 0）
 */
function readSlot(a: unknown): GameState['aging'][number] | null {
  if (!isObj(a) || !isInt(a.slot, 1, gameParams.AGING_SLOTS) || !isTime(a.startedAt) || !isInt(a.boostPct, 0, 100)) return null
  const i = a.input
  if (!isObj(i) || !inDomain('milk', i.milk) || !inDomain('bac', i.bac) || !inDomain('press', i.press) || !inDomain('room', i.room))
    return null
  if (i.finish !== null) return null
  const log = a.careLog
  if (!isObj(log) || !CARE_KEYS.every((k) => isInt(log[k]))) return null
  let seq = a.careSeq
  if (seq === undefined) {
    const last = a.careLast
    if (last !== null && last !== undefined && !(CARE_BUTTONS as readonly unknown[]).includes(last)) return null
    const total = CARE_BUTTONS.reduce((n, c) => n + (log[c] as number), 0)
    seq = Object.fromEntries(CARE_BUTTONS.map((c) => [c, c === last ? total : 0]))
  }
  if (!isObj(seq) || !CARE_BUTTONS.every((k) => isInt((seq as Record<string, unknown>)[k]))) return null
  return {
    slot: a.slot,
    startedAt: a.startedAt,
    input: { milk: i.milk as string, bac: i.bac as string, press: i.press as number, room: i.room as string, finish: null },
    careLog: Object.fromEntries(CARE_KEYS.map((k) => [k, log[k]])) as GameState['aging'][number]['careLog'],
    careSeq: Object.fromEntries(CARE_BUTTONS.map((k) => [k, (seq as Record<string, number>)[k]])) as GameState['aging'][number]['careSeq'],
    boostPct: a.boostPct,
  }
}

/**
 * 相棒。W2 の文書（affection だけ）は、足りない項目を初期値で埋めて読む（項目が無い＝初期値、あるのに形が違う＝壊れている）
 */
function readBuddy(v: unknown, createdAt: number): BuddyState | null {
  if (!isObj(v) || !isInt(v.affection)) return null
  const d: Record<string, unknown> = { ...emptyBuddy(createdAt, v.affection) }
  for (const [k, x] of Object.entries(v)) if (x !== undefined) d[k] = x
  const has = d.speciesId !== null
  if (!(d.id === null || isStr(d.id)) || !(d.speciesId === null || (isStr(d.speciesId) && SPECIES_IDS.has(d.speciesId)))) return null
  if (!isDayOrNull(d.birthDate) || !isDayOrNull(d.lastActiveDay) || !isTimeOrNull(d.lastInteractionAt)) return null
  if (!isInt(d.daysTogether) || !isInt(d.mood, BP.MOOD_MIN, BP.MOOD_MAX) || !isInt(d.energy, BP.ENERGY_MIN, BP.ENERGY_MAX)) return null
  if (!isInt(d.wild, 0, BP.WILD_MAX) || !isBool(d.sulking) || !isInt(d.sulkClear, 0, BP.SULK_CLEAR_COUNT) || !isBool(d.reunionHintPending)) return null
  // 相棒がいるなら、生まれた日・最後の操作・日数（1以上）がそろっている
  if (has && (d.id === null || d.birthDate === null || d.lastActiveDay === null || d.lastInteractionAt === null || !isInt(d.daysTogether, 1)))
    return null
  const sl = d.sleep
  if (!isObj(sl) || !isBool(sl.isSleeping) || !isTimeOrNull(sl.sleptAt) || (sl.isSleeping && sl.sleptAt === null)) return null
  const dc = d.decayAt
  if (!isObj(dc) || !isTimeOrNull(dc.mood) || !isTimeOrNull(dc.energy)) return null
  const wa = d.wildAlbum
  if (!Array.isArray(wa) || !wa.every((x) => isInt(x, 1, BP.WILD_MAX)) || new Set(wa).size !== wa.length) return null
  const dy = d.daily
  if (!isObj(dy) || !isDay(dy.day) || !isInt(dy.affectionGained) || !isBool(dy.reunionBonusGiven)) return null
  const counts = dy.counts
  if (!isObj(counts) || !BUDDY_OPS.every((k) => isInt(counts[k]))) return null
  const lastAt = dy.lastAt
  if (!isObj(lastAt) || !Object.entries(lastAt).every(([k, t]) => (BUDDY_OPS as readonly string[]).includes(k) && isTime(t))) return null
  const hg = dy.hintsGiven
  if (!Array.isArray(hg) || !hg.every((x) => HINT_SCENES.includes(x)) || new Set(hg).size !== hg.length) return null
  return d as unknown as BuddyState
}

/**
 * schemaVersion 2（この版）の文書として読む。形が合わなければ null（壊れている扱い）。
 * 時刻は日付として読めるか・枠は 1〜AGING_SLOTS か・入力は domains の値か・相棒の値は範囲内か まで見る
 */
export function readGameState(d: Record<string, unknown>): GameState | null {
  if (d.schemaVersion !== SCHEMA_VERSION) return null
  const meta = d.meta
  if (!isObj(meta) || !isStr(meta.appVersion) || !isInt(meta.saveSeq) || !isTime(d.createdAt) || !isTime(d.lastSavedAt)) return null
  if (!isObj(d.zukan) || !isObj(d.zukan.registered)) return null
  for (const [id, r] of Object.entries(d.zukan.registered)) {
    if (!SPECIES_IDS.has(id) || !isObj(r) || !isDay(r.firstAt) || !isInt(r.count, 1)) return null
  }
  if (!Array.isArray(d.aging)) return null
  const aging: GameState['aging'] = []
  for (const x of d.aging) {
    const a = readSlot(x)
    if (!a || aging.some((y) => y.slot === a.slot)) return null
    aging.push(a)
  }
  const buddy = readBuddy(d.buddy, parseIso(d.createdAt))
  if (!buddy) return null
  return { ...(d as unknown as GameState), buddy, aging }
}

/** 形が合っているか（readGameState が読めるか） */
export function isGameState(d: Record<string, unknown>): boolean {
  return readGameState(d) !== null
}

export class SaveStore {
  /** いちばん新しい文書の saveSeq と、それがある場所 */
  private seq = 0
  private latest: SaveKey | null = null
  private readOnly = false
  private blocked = false
  private chain: Promise<unknown> = Promise.resolve()

  private readonly backend: SaveBackend
  private readonly appVersion: string

  constructor(backend: SaveBackend, appVersion: string) {
    this.backend = backend
    this.appVersion = appVersion
  }

  get isReadOnly(): boolean {
    return this.readOnly
  }

  /** 読み込みに失敗した（I/O）。この間は保存しない（中身の分からない文書を新規で上書きしない） */
  get isBlocked(): boolean {
    return this.blocked
  }

  async load(): Promise<LoadResult> {
    let raws: (string | undefined)[]
    try {
      raws = await Promise.all(SAVE_KEYS.map((k) => this.backend.get(k)))
    } catch {
      this.blocked = true
      return { kind: 'error' }
    }
    this.blocked = false
    const heads = raws.map(readHead)
    // 自分の版の文書は形まで確かめる（読めた形 states を使う）。新しい版の文書は形が分からないので頭だけで比べる
    const states = heads.map((h) => (h && h.schemaVersion === SCHEMA_VERSION ? readGameState(h.doc) : null))
    const usable = heads.map((h, i) => (h && (h.schemaVersion > SCHEMA_VERSION || states[i]) ? h : null))
    let best = -1
    usable.forEach((h, i) => {
      if (h && (best < 0 || h.saveSeq > usable[best]!.saveSeq)) best = i
    })
    if (best < 0) {
      this.seq = 0
      this.latest = null
      return raws.every((r) => r === undefined) ? { kind: 'empty' } : { kind: 'corrupt' }
    }
    const h = usable[best]!
    this.seq = h.saveSeq
    this.latest = SAVE_KEYS[best]
    if (h.schemaVersion > SCHEMA_VERSION) {
      this.readOnly = true
      // 見せるだけなら、この版で分かる項目の形が合っていれば出す（合わなければ空の棚と図鑑で出す）
      const view = readGameState({ ...h.doc, schemaVersion: SCHEMA_VERSION })
      return { kind: 'newer', schemaVersion: h.schemaVersion, state: view }
    }
    const otherBroken = raws[1 - best] !== undefined && usable[1 - best] === null
    return { kind: 'ok', state: states[best]!, from: this.latest, otherBroken }
  }

  /** 保存する。いちばん新しい文書が無い方（古い方）に書く。保存した saveSeq と時刻を返す（読み取り専用なら null） */
  save(state: GameState, now: number): Promise<{ saveSeq: number; lastSavedAt: string } | null> {
    const run = async () => {
      if (this.readOnly || this.blocked) return null
      const saveSeq = this.seq + 1
      const lastSavedAt = toIso(now)
      const doc: GameState = { ...state, meta: { ...state.meta, appVersion: this.appVersion, saveSeq }, lastSavedAt }
      const key: SaveKey = this.latest === 'save:A' ? 'save:B' : 'save:A'
      await this.backend.set(key, JSON.stringify(doc))
      this.seq = saveSeq
      this.latest = key
      return { saveSeq, lastSavedAt }
    }
    // 書き込みは順番に（前の書き込みが終わる前に次の saveSeq を決めない）
    const p = this.chain.then(run, run)
    this.chain = p
    return p
  }

  /**
   * セーブを消す（デバッグ用）。保存と同じ列に並べる（前の保存が終わってから消し、後から頼まれた保存は消した後に書く）。
   * 読み取り専用・読み込み失敗のときは消さない
   */
  clear(): Promise<boolean> {
    const run = async () => {
      if (this.readOnly || this.blocked) return false
      await Promise.all(SAVE_KEYS.map((k) => this.backend.del(k)))
      this.seq = 0
      this.latest = null
      return true
    }
    const p = this.chain.then(run, run)
    this.chain = p
    return p
  }
}
