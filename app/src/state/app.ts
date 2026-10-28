// 画面の状態（Zustand のストア1つ）。ゲームの中身は src/game/ の純粋な関数で、ここは呼んで保存を予約するだけ
import { create } from 'zustand'
import { buildInfo } from '../buildInfo'
import { DEBUG_TOOLS } from '../config'
import { newGameState, type GameState } from '../game/state'
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
  notice: null,
  clock: now(),
  tab: 'cellar',
  screen: null,
}))

let store: SaveStore | null = null
let saver: AutoSaver | null = null

async function writeNow(): Promise<void> {
  const st = useApp.getState()
  if (!store || st.readOnly) return
  let r
  try {
    r = await store.save(st.game, now())
  } catch {
    useApp.setState({ notice: 'この端末では保存できませんでした（ブラウザの設定で保存が止められているかもしれません）' })
    return
  }
  if (!r) return
  // 保存の間に変わった分を消さないよう、meta と lastSavedAt だけを今の状態に入れる
  useApp.setState((s) => ({
    game: { ...s.game, meta: { ...s.game.meta, saveSeq: r.saveSeq }, lastSavedAt: r.lastSavedAt },
  }))
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

/** 起動：セーブを読む → 状態を置く。熟成棚の経過は画面が clock から毎回計算する */
export async function boot(backend: SaveBackend): Promise<void> {
  restoreDebugClock()
  store = new SaveStore(backend, buildInfo.version)
  saver = new AutoSaver(writeNow)
  const t = now()
  let r
  try {
    r = await store.load()
  } catch {
    r = { kind: 'corrupt' as const }
  }
  if (r.kind === 'ok') {
    useApp.setState({
      phase: 'ready',
      game: r.state,
      clock: t,
      notice: r.otherBroken ? 'セーブの片方が壊れていたので、もう片方から読み込みました' : null,
    })
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

/** 画面が裏に回ったらすぐ保存する（main.tsx から1回だけ呼ぶ） */
export function watchVisibility(doc: Document): () => void {
  return saver ? saver.watchVisibility(doc) : () => {}
}

/** ゲームの操作。(state, now) → state を当てて保存を予約する。読み取り専用のときは何もしない */
export function play(fn: (g: GameState, t: number) => GameState): boolean {
  const st = useApp.getState()
  if (st.readOnly || st.phase !== 'ready') return false
  const t = now()
  useApp.setState({ game: fn(st.game, t), clock: t })
  saver?.schedule()
  return true
}

export function tick(): void {
  useApp.setState({ clock: now() })
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

export async function debugClearSave(): Promise<void> {
  if (!store || useApp.getState().readOnly) return
  saver?.cancel()
  await store.clear()
  const t = now()
  useApp.setState({ game: newGameState(t, buildInfo.version), clock: t, screen: null, notice: null })
}
