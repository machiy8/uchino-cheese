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
