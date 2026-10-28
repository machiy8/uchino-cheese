// 操作ごとにデバウンス1秒で保存し、画面が裏に回ったら（visibilitychange）すぐ保存する
// タイマーは差し替えられる（テストでは偽のタイマーを使う）

export const SAVE_DEBOUNCE_MS = 1000

export class AutoSaver {
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly write: () => Promise<unknown>
  private readonly delayMs: number

  constructor(write: () => Promise<unknown>, delayMs = SAVE_DEBOUNCE_MS) {
    this.write = write
    this.delayMs = delayMs
  }

  /** 変更があった。最後の変更から delayMs たったら保存する */
  schedule(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.write()
    }, this.delayMs)
  }

  get pending(): boolean {
    return this.timer !== null
  }

  /** 待っている保存があれば今すぐ行う */
  flush(): Promise<unknown> {
    if (this.timer === null) return Promise.resolve()
    clearTimeout(this.timer)
    this.timer = null
    return this.write()
  }

  /** 待っている保存を捨てる（セーブを消すとき） */
  cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }

  /** 画面が裏に回ったらすぐ保存する。戻り値で外す */
  watchVisibility(doc: Document): () => void {
    const on = () => {
      if (doc.visibilityState === 'hidden') void this.flush()
    }
    doc.addEventListener('visibilitychange', on)
    // ページを閉じるとき（pagehide）も同じ
    const onHide = () => void this.flush()
    const w = doc.defaultView
    w?.addEventListener('pagehide', onHide)
    return () => {
      doc.removeEventListener('visibilitychange', on)
      w?.removeEventListener('pagehide', onHide)
    }
  }
}
