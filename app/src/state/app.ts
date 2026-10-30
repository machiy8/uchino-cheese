// 画面の状態（Zustand のストア1つ）。ゲームの中身は src/game/ の純粋な関数で、ここは呼んで保存を予約するだけ
import { create } from 'zustand'
import { buildInfo } from '../buildInfo'
import { DEBUG_TOOLS } from '../config'
import {
  advanceBuddy,
  buddyOp,
  debugSetLastInteraction,
  debugSetSpecies,
  debugSetValues,
  type BuddyAction,
  type BuddyEvent,
  type OpResult,
} from '../game/buddy'
import { newGameState, type BuddyState, type GameState } from '../game/state'
import { advanceDebugClock, debugClockOffset, now, resetDebugClock } from '../game/time'
import { AutoSaver } from '../save/autosave'
import { SaveStore, type SaveBackend } from '../save/store'

export type Tab = 'buddy' | 'cellar' | 'zukan' | 'settings'

/** タブの上に重ねるサブ画面 */
export type Screen =
  | { kind: 'prep'; slot: number }
  | { kind: 'care'; slot: number }
  | { kind: 'harvest'; slot: number }
  | { kind: 'zukanCheck' }

export interface AppState {
  phase: 'loading' | 'ready'
  game: GameState
  /** 自分より新しい版のセーブを読んだ（保存しない） */
  readOnly: boolean
  /** セーブを読み込めなかった（I/O の失敗）。中身の分からない文書を上書きしないよう、操作と保存を止める */
  loadFailed: boolean
  /** 保存に失敗して、まだ保存できていない変更がある（次の操作か裏に回るときに保存し直す） */
  unsaved: boolean
  /** 再会（おかえり）。ホームの上に出す */
  welcome: { affection: number; hint: boolean } | null
  /** 起動時に知らせること（壊れたセーブから戻した など） */
  notice: string | null
  /** 画面に出す「いま」（time.now() を定期的に写す。時間を進めたときもすぐ写す） */
  clock: number
  tab: Tab
  screen: Screen | null
}

export const useApp = create<AppState>(() => ({
  phase: 'loading',
  game: newGameState(now(), buildInfo.version),
  readOnly: false,
  loadFailed: false,
  unsaved: false,
  welcome: null,
  notice: null,
  clock: now(),
  tab: 'cellar',
  screen: null,
}))

let store: SaveStore | null = null
let saver: AutoSaver | null = null

const SAVE_FAILED = 'この端末では保存できませんでした（ブラウザの設定で保存が止められているかもしれません）。次の操作のときに、もう一度保存します'

/** 保存する。保存できたら true（読み取り専用・読み込み失敗で保存しないときも、失敗ではないので true） */
async function writeNow(): Promise<boolean> {
  const st = useApp.getState()
  if (!store || st.readOnly || st.loadFailed) return true
  let r
  try {
    r = await store.save(st.game, now())
  } catch {
    useApp.setState({ unsaved: true, notice: SAVE_FAILED })
    return false
  }
  if (!r) return true
  // 保存の間に変わった分を消さないよう、meta と lastSavedAt だけを今の状態に入れる
  useApp.setState((s) => ({
    game: { ...s.game, meta: { ...s.game.meta, saveSeq: r.saveSeq }, lastSavedAt: r.lastSavedAt },
    unsaved: false,
    notice: s.notice === SAVE_FAILED ? null : s.notice,
  }))
  return true
}

/** 経過の計算で起きたこと → 画面の状態（おかえり） */
function welcomeOf(events: BuddyEvent[]): AppState['welcome'] {
  const r = events.find((e) => e.kind === 'reunion')
  return r && r.kind === 'reunion' ? { affection: r.affection, hint: r.hint } : null
}

/** 相棒の経過の計算を当てる（起動・画面の更新・裏から戻ったとき）。変わったときだけ保存を予約する */
function applyAdvance(t: number): void {
  const st = useApp.getState()
  if (st.phase !== 'ready' || st.readOnly || st.loadFailed) {
    useApp.setState({ clock: t })
    return
  }
  const r = advanceBuddy(st.game, t)
  if (r.state === st.game) {
    useApp.setState({ clock: t })
    return
  }
  useApp.setState({ game: r.state, clock: t, welcome: welcomeOf(r.events) ?? st.welcome })
  saver?.schedule()
}

// ---- デバッグの時計（時間を進めた分）は再読み込みしても残す。セーブ文書には入れない
const CLOCK_KEY = 'uchino-cheese:debugClockMs'

function restoreDebugClock(): void {
  if (!DEBUG_TOOLS) return
  try {
    const ms = Number(globalThis.localStorage?.getItem(CLOCK_KEY) ?? 0)
    if (Number.isFinite(ms) && ms > 0) advanceDebugClock(ms)
  } catch {
    // 保存できない環境では毎回0から
  }
}

function keepDebugClock(): void {
  try {
    globalThis.localStorage?.setItem(CLOCK_KEY, String(debugClockOffset()))
  } catch {
    // 同上
  }
}

/** 起動：セーブを読む → 状態を置く → 相棒の経過の計算。熟成棚の経過は画面が clock から毎回計算する */
export async function boot(backend: SaveBackend): Promise<void> {
  restoreDebugClock()
  store = new SaveStore(backend, buildInfo.version)
  saver = new AutoSaver(writeNow)
  await loadSave()
}

/** 読み込みに失敗したあと、もう一度読む */
export async function retryLoad(): Promise<void> {
  if (!store) return
  useApp.setState({ phase: 'loading' })
  await loadSave()
}

async function loadSave(): Promise<void> {
  if (!store || !saver) return
  const t = now()
  let r
  try {
    r = await store.load()
  } catch {
    r = { kind: 'error' as const }
  }
  if (r.kind === 'error') {
    useApp.setState({
      phase: 'ready',
      game: newGameState(t, buildInfo.version),
      loadFailed: true,
      clock: t,
      notice: null,
    })
    return
  }
  useApp.setState({ loadFailed: false })
  if (r.kind === 'ok') {
    useApp.setState({
      phase: 'ready',
      game: r.state,
      clock: t,
      // 相棒がいればホーム（相棒）から（計画 §1-2：2回目以降は S2）
      tab: r.state.buddy.speciesId ? 'buddy' : 'cellar',
      notice: r.otherBroken ? 'セーブの片方が壊れていたので、もう片方から読み込みました' : null,
    })
    applyAdvance(t)
  } else if (r.kind === 'newer') {
    useApp.setState({
      phase: 'ready',
      game: r.state ?? newGameState(t, buildInfo.version),
      readOnly: true,
      clock: t,
    })
  } else {
    useApp.setState({
      phase: 'ready',
      game: newGameState(t, buildInfo.version),
      clock: t,
      notice: r.kind === 'corrupt' ? 'セーブが読めなかったので、新しく始めます' : null,
    })
    // はじめての文書をすぐ書いておく
    saver.schedule()
  }
}

/** 画面が裏に回ったらすぐ保存する（失敗して残っている変更も）。main.tsx から1回だけ呼ぶ */
export function watchVisibility(doc: Document): () => void {
  return saver ? saver.watchVisibility(doc) : () => {}
}

/** ゲームの操作。(state, now) → state を当てて保存を予約する。読み取り専用・読み込み失敗のときは何もしない */
export function play(fn: (g: GameState, t: number) => GameState): boolean {
  const st = useApp.getState()
  if (st.readOnly || st.loadFailed || st.phase !== 'ready') return false
  const t = now()
  useApp.setState({ game: fn(st.game, t), clock: t })
  saver?.schedule()
  return true
}

/** 相棒の操作。結果（効果・反応だけ など）を返す。操作できないときは null */
export function playBuddy(action: BuddyAction): OpResult | null {
  let res: OpResult | null = null
  play((g, t) => {
    res = buddyOp(g, action, t)
    return res.state
  })
  const r = res as OpResult | null
  if (r) {
    const w = welcomeOf(r.events)
    if (w) useApp.setState({ welcome: w })
  }
  return r
}

export function dismissWelcome(): void {
  useApp.setState({ welcome: null })
}

/** 画面の「いま」を進める（相棒の経過の計算もする） */
export function tick(): void {
  applyAdvance(now())
}

export function openTab(tab: Tab): void {
  useApp.setState({ tab, screen: null })
}

export function openScreen(screen: Screen | null): void {
  useApp.setState({ screen })
}

export function dismissNotice(): void {
  useApp.setState({ notice: null })
}

// ---- デバッグの道具（設定 S8・DEBUG_TOOLS のときだけ画面に出る）
export function debugAdvance(ms: number): void {
  advanceDebugClock(ms)
  keepDebugClock()
  tick()
}

export function debugResetClock(): void {
  resetDebugClock()
  keepDebugClock()
  tick()
}

/**
 * セーブを消す。保存と同じ列に並べ（SaveStore.clear）、画面の状態は先に新規にする。
 * 消している間に自動保存が走っても、書くのは新規の状態（消す前の状態に戻らない）
 */
export async function debugClearSave(): Promise<void> {
  const st = useApp.getState()
  if (!store || st.readOnly || st.loadFailed) return
  saver?.cancel()
  const done = store.clear()
  const t = now()
  useApp.setState({ game: newGameState(t, buildInfo.version), clock: t, screen: null, notice: null, welcome: null, unsaved: false })
  await done
}

/** 相棒の種を選び直す（いなければ生まれる） */
export function debugBuddySpecies(id: string): void {
  play((g, t) => debugSetSpecies(g, id, t))
}

export function debugBuddyValues(v: Partial<Pick<BuddyState, 'mood' | 'energy' | 'affection'>>): void {
  play((g) => debugSetValues(g, v))
}

/** 最後の操作を h 時間前にして、すぐ経過の計算をする */
export function debugBuddyLastInteraction(hoursAgo: number): void {
  if (play((g, t) => debugSetLastInteraction(g, hoursAgo, t))) tick()
}
