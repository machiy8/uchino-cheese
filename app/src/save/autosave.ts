// 操作ごとにデバウンス1秒で保存し、画面が裏に回ったら（visibilitychange）すぐ保存する
// 保存に失敗したら未保存の印（dirty）を残し、次の操作（schedule）か裏に回るとき（flush）に保存し直す
// タイマーは差し替えられる（テストでは偽のタイマーを使う）

export const SAVE_DEBOUNCE_MS = 1000

export class AutoSaver {
  private timer: ReturnType<typeof setTimeout> | null = null
  /** 保存していない変更がある（失敗した保存も含む） */
  private unsaved = false
  /** 変更の番号（保存の間に次の変更が来たら、その保存では未保存の印を消さない） */
  private version = 0
  /** write は保存できたら true、失敗したら false（または例外） */
  private readonly write: () => Promise<boolean>
  private readonly delayMs: number

  constructor(write: () => Promise<boolean>, delayMs = SAVE_DEBOUNCE_MS) {
    this.write = write
    this.delayMs = delayMs
  }

  /** 変更があった。最後の変更から delayMs たったら保存する */
  schedule(): void {
    this.unsaved = true
    this.version++
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.run()
    }, this.delayMs)
  }

  private async run(): Promise<boolean> {
    const v = this.version
    let ok = false
    try {
      ok = await this.write()
    } catch {
      ok = false
    }
    if (ok && v === this.version) this.unsaved = false
    return ok
  }

  /** 保存を待っている（タイマーが動いている） */
  get pending(): boolean {
    return this.timer !== null
  }

  /** 保存していない変更がある（待っている保存・失敗した保存） */
  get dirty(): boolean {
    return this.unsaved
  }

  /** 待っている保存か、失敗して残っている変更があれば今すぐ保存する */
  flush(): Promise<boolean> {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    } else if (!this.unsaved) return Promise.resolve(true)
    return this.run()
  }

  /** 待っている保存と未保存の印を捨てる（セーブを消すとき） */
  cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.unsaved = false
    this.version++
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
