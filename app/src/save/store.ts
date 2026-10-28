// 保存（実装計画 §2-1）：同じ文書を2か所（A・B）に交互に書き、読むときは壊れていない方のうち saveSeq の大きい方を使う。
// 保存場所は SaveBackend で差し替える（Web＝IndexedDB は idb.ts、ネイティブ＝Preferences は W5、テスト＝memory.ts）

import { CARE_BUTTONS, CARE_KEYS, SCHEMA_VERSION, type GameState } from '../game/state'
import { toIso } from '../game/time'

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
  | { kind: 'ok'; state: GameState; from: SaveKey; otherBroken: boolean }
  /** 自分より新しい schemaVersion の文書。上書きしない（読み取り専用で起動する） */
  | { kind: 'newer'; schemaVersion: number; state: GameState | null }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isInt = (v: unknown, min = 0): v is number => Number.isInteger(v) && (v as number) >= min
const isStr = (v: unknown): v is string => typeof v === 'string'

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

/** schemaVersion 2（この版）の文書として形が合っているか。合わなければ壊れている扱い */
export function isGameState(d: Record<string, unknown>): boolean {
  if (d.schemaVersion !== SCHEMA_VERSION) return false
  const meta = d.meta as Record<string, unknown>
  if (!isStr(meta.appVersion) || !isStr(d.createdAt) || !isStr(d.lastSavedAt)) return false
  if (!isObj(d.buddy) || typeof d.buddy.affection !== 'number' || !(d.buddy.affection >= 0)) return false
  if (!isObj(d.zukan) || !isObj(d.zukan.registered)) return false
  for (const r of Object.values(d.zukan.registered)) {
    if (!isObj(r) || !isStr(r.firstAt) || !isInt(r.count, 1)) return false
  }
  if (!Array.isArray(d.aging)) return false
  const slots = new Set<number>()
  for (const a of d.aging) {
    if (!isObj(a) || !isInt(a.slot, 1) || slots.has(a.slot) || !isStr(a.startedAt) || !isInt(a.boostPct)) return false
    slots.add(a.slot)
    const i = a.input
    if (!isObj(i) || !isStr(i.milk) || !isStr(i.bac) || !isInt(i.press) || !isStr(i.room)) return false
    if (!isObj(a.careLog) || !CARE_KEYS.every((k) => isInt((a.careLog as Record<string, unknown>)[k]))) return false
    if (a.careLast !== null && !(CARE_BUTTONS as readonly unknown[]).includes(a.careLast)) return false
  }
  return true
}

export class SaveStore {
  /** いちばん新しい文書の saveSeq と、それがある場所 */
  private seq = 0
  private latest: SaveKey | null = null
  private readOnly = false
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

  async load(): Promise<LoadResult> {
    const raws = await Promise.all(SAVE_KEYS.map((k) => this.backend.get(k)))
    const heads = raws.map(readHead)
    // 自分の版の文書は形まで確かめる。新しい版の文書は形が分からないので頭だけで比べる
    const usable = heads.map((h) => (h && (h.schemaVersion > SCHEMA_VERSION || isGameState(h.doc)) ? h : null))
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
      const view = isGameState({ ...h.doc, schemaVersion: SCHEMA_VERSION }) ? (h.doc as unknown as GameState) : null
      return { kind: 'newer', schemaVersion: h.schemaVersion, state: view }
    }
    const otherBroken = raws[1 - best] !== undefined && usable[1 - best] === null
    return { kind: 'ok', state: h.doc as unknown as GameState, from: this.latest, otherBroken }
  }

  /** 保存する。いちばん新しい文書が無い方（古い方）に書く。保存した saveSeq と時刻を返す（読み取り専用なら null） */
  save(state: GameState, now: number): Promise<{ saveSeq: number; lastSavedAt: string } | null> {
    const run = async () => {
      if (this.readOnly) return null
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

  /** セーブを消す（デバッグ用）。読み取り専用のときは消さない */
  async clear(): Promise<boolean> {
    if (this.readOnly) return false
    await this.chain.catch(() => {})
    await Promise.all(SAVE_KEYS.map((k) => this.backend.del(k)))
    this.seq = 0
    this.latest = null
    return true
  }
}
