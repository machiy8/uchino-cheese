// 時刻を扱うのはこのファイルだけ。ゲームの関数は now を引数で受け取る
// 日付の切り替えは端末のローカル時刻4時（決定事項 §4）

export const DAY_START_HOUR = 4

let offsetMs = 0

/** いまの時刻（ミリ秒）。デバッグ版の「時間を進める」の分だけずらす */
export function now(): number {
  return Date.now() + offsetMs
}

/** デバッグ版だけで使う：時刻を進める（戻すことはしない） */
export function advanceDebugClock(ms: number): void {
  if (ms > 0) offsetMs += ms
}

/** デバッグ版だけで使う：いま進めている分（ミリ秒） */
export function debugClockOffset(): number {
  return offsetMs
}

/** デバッグ版だけで使う：進めた分を捨てて端末の時刻に戻す */
export function resetDebugClock(): void {
  offsetMs = 0
}

export const HOUR_MS = 3_600_000

/** 経過時間（整数・切り捨て）。時計が戻っていたら 0 */
export function elapsedHours(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / HOUR_MS))
}

/** 端末のローカル時刻の「時」（0〜23） */
export function localHour(t: number): number {
  return new Date(t).getHours()
}

/** 経過分（整数・切り捨て）。時計が戻っていたら 0 */
export function elapsedMinutes(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / 60000))
}

/** ゲーム上の日付（4時区切り）を YYYY-MM-DD で返す。端末のローカル時刻で数える
 *  ローカル時刻で4時未満なら前日にする（固定の時間を引くと夏時間の切替日にずれる） */
export function gameDay(t: number): string {
  const local = new Date(t)
  const d =
    local.getHours() < DAY_START_HOUR
      ? new Date(local.getFullYear(), local.getMonth(), local.getDate() - 1)
      : local
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 保存する時刻の書き方（ISO 8601・UTC） */
export function toIso(t: number): string {
  return new Date(t).toISOString()
}

/** 保存した時刻を読む。読めなければ NaN */
export function parseIso(s: string): number {
  return Date.parse(s)
}

/** ゲーム上の日付の書き方（YYYY-MM-DD・実在する日）か */
export function isDayString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s
}
